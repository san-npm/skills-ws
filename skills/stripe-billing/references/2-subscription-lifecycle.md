## Contents

- 2. Subscription Lifecycle
- Create subscription
- Upgrade / Downgrade
- Cancel (at period end)
- Reactivate

## 2. Subscription Lifecycle

### Create subscription

```typescript
// app/api/subscribe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // requestId is sent by the client and held stable across retries (e.g. crypto.randomUUID()
  // generated once when the form mounts). It is the basis for idempotency keys below.
  const { priceId, paymentMethodId, requestId } = await req.json();
  if (!priceId || !paymentMethodId || !requestId) {
    return NextResponse.json({ error: 'Missing priceId, paymentMethodId, or requestId' }, { status: 400 });
  }

  try {
    let user = await db.user.findUniqueOrThrow({
      where: { id: session.user.id },
      select: { stripeCustomerId: true, email: true },
    });

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: { userId: session.user.id },
        payment_method: paymentMethodId,
        invoice_settings: { default_payment_method: paymentMethodId },
      }, { idempotencyKey: `cust-create-${session.user.id}` });
      customerId = customer.id;
      await db.user.update({ where: { id: session.user.id }, data: { stripeCustomerId: customerId } });
    } else {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    }

    // Prevent duplicate subscriptions. "active" alone is not enough — trialing/past_due/
    // incomplete/paused are all live states that would conflict. Treat anything not
    // fully ended as occupying the slot. (incomplete_expired and canceled are terminal.)
    const existing = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 100 });
    const LIVE = new Set(['active', 'trialing', 'past_due', 'incomplete', 'paused', 'unpaid']);
    if (existing.data.some((s) => LIVE.has(s.status))) {
      return NextResponse.json({ error: 'Active subscription exists. Use the change-plan endpoint.' }, { status: 409 });
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      billing_mode: { type: 'flexible' },              // enables confirmation_secret (Basil-line)
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.confirmation_secret'],  // NOT latest_invoice.payment_intent on this API
      metadata: { userId: session.user.id },
      automatic_tax: { enabled: true },
    }, {
      // Stable across retries: a network timeout that retries this POST won't create a 2nd sub.
      idempotencyKey: `sub-create-${session.user.id}-${priceId}-${requestId}`,
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice | null;
    // $0 invoices, fully-trial subs, and PM-on-file flows can settle with no client_secret.
    // Don't assume one exists — let the client skip confirmation when it's null.
    const clientSecret = invoice?.confirmation_secret?.client_secret ?? null;

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret,                          // null ⇒ nothing to confirm client-side
      status: subscription.status,           // 'active' | 'trialing' | 'incomplete' | ...
    });
  } catch (err) {
    if (err instanceof Stripe.errors.StripeCardError) {
      return NextResponse.json({ error: err.message }, { status: 402 });
    }
    console.error('Subscription creation failed:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Upgrade / Downgrade

```typescript
// app/api/subscription/change-plan/route.ts
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { newPriceId, requestId } = await req.json();
  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { stripeSubscriptionId: true },
  });

  if (!user.stripeSubscriptionId) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
  }

  const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
    expand: ['items.data.price'],
  });

  // Don't try to classify upgrade vs downgrade from unit_amount: that breaks for tiered/
  // metered prices, unit_amount_decimal, different intervals, coupons, and multi-item subs.
  // Instead, map your priceIds to a plan rank you control, and always settle the proration
  // immediately. If the proration nets to a charge, the client may need to confirm it.
  const PLAN_RANK: Record<string, number> = {
    [process.env.STRIPE_PRICE_PRO!]: 1,
    [process.env.STRIPE_PRICE_TEAM!]: 2,
  };
  const currentItem = subscription.items.data[0];
  const currentPrice = currentItem.price as Stripe.Price;
  const isUpgrade = (PLAN_RANK[newPriceId] ?? 0) > (PLAN_RANK[currentPrice.id] ?? 0);

  const updated = await stripe.subscriptions.update(subscription.id, {
    items: [{ id: currentItem.id, price: newPriceId }],
    proration_behavior: 'always_invoice',
    // Upgrades may owe money now (SCA) → default_incomplete so we can confirm.
    // Downgrades/credits → pending_if_incomplete keeps the sub active and applies the change.
    payment_behavior: isUpgrade ? 'default_incomplete' : 'pending_if_incomplete',
    expand: ['latest_invoice.confirmation_secret'],
    metadata: { previousPriceId: currentPrice.id, changeType: isUpgrade ? 'upgrade' : 'downgrade' },
  }, {
    idempotencyKey: `sub-change-${subscription.id}-${newPriceId}-${requestId}`,
  });

  const invoice = updated.latest_invoice as Stripe.Invoice | null;
  return NextResponse.json({
    subscription: updated.id,
    status: updated.status,
    // Present only when the change created an open invoice needing confirmation.
    clientSecret: invoice?.confirmation_secret?.client_secret ?? null,
  });
}
```

### Cancel (at period end)

```typescript
// app/api/subscription/cancel/route.ts
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { reason, feedback } = await req.json();
  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { stripeSubscriptionId: true },
  });

  // Cancel at period end — user keeps access until billing cycle ends
  const subscription = await stripe.subscriptions.update(user.stripeSubscriptionId!, {
    cancel_at_period_end: true,
    metadata: { cancelReason: reason, cancelFeedback: feedback, canceledAt: new Date().toISOString() },
  });

  // Basil-line: period end is on the subscription item, not the subscription.
  const periodEnd = subscription.items.data[0].current_period_end;

  await db.cancellation.create({
    data: {
      userId: session.user.id, reason, feedback,
      effectiveDate: new Date(periodEnd * 1000),
    },
  });

  return NextResponse.json({
    cancelAt: new Date(periodEnd * 1000).toISOString(),
  });
}
```

### Reactivate

```typescript
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { stripeSubscriptionId: true },
  });

  const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId!);

  if (sub.cancel_at_period_end) {
    // Still in billing period — just undo cancellation
    const reactivated = await stripe.subscriptions.update(sub.id, {
      cancel_at_period_end: false,
      metadata: { reactivatedAt: new Date().toISOString() },
    });
    return NextResponse.json({ status: reactivated.status });
  }

  if (sub.status === 'canceled') {
    return NextResponse.json({ error: 'Subscription expired. Create a new one.' }, { status: 410 });
  }

  return NextResponse.json({ error: 'Cannot reactivate' }, { status: 400 });
}
```

---
