---
name: stripe-billing
description: "Production Stripe billing: subscriptions, usage-based metering, webhooks, tax, price migrations, and testing."
---

# Stripe Billing

Production patterns for Stripe billing that handle the edge cases tutorials skip. Subscription lifecycle, usage-based billing, webhook idempotency, EU VAT, and price migrations.

**Critical principle:** Webhooks are your source of truth, not API responses. Always design for eventual consistency.

---

## 1. Setup

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

```typescript
// lib/stripe.ts — server-side only
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',  // Pin the version. Always.
  typescript: true,
  maxNetworkRetries: 3,
  timeout: 20000,
});
```

```typescript
// lib/stripe-client.ts — browser-safe
import { loadStripe } from '@stripe/stripe-js';

let stripePromise: ReturnType<typeof loadStripe>;
export function getStripe() {
  if (!stripePromise) stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  return stripePromise;
}
```

---

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

  const { priceId, paymentMethodId } = await req.json();

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
      });
      customerId = customer.id;
      await db.user.update({ where: { id: session.user.id }, data: { stripeCustomerId: customerId } });
    } else {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });
    }

    // Prevent duplicate subscriptions
    const existing = await stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 1 });
    if (existing.data.length > 0) {
      return NextResponse.json({ error: 'Active subscription exists. Use upgrade endpoint.' }, { status: 409 });
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { userId: session.user.id },
      automatic_tax: { enabled: true },
    });

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const pi = invoice.payment_intent as Stripe.PaymentIntent;

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: pi.client_secret,
      status: subscription.status,
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

  const { newPriceId } = await req.json();
  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { stripeSubscriptionId: true },
  });

  if (!user.stripeSubscriptionId) {
    return NextResponse.json({ error: 'No active subscription' }, { status: 400 });
  }

  const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
  const currentPrice = await stripe.prices.retrieve(subscription.items.data[0].price.id);
  const newPrice = await stripe.prices.retrieve(newPriceId);
  const isUpgrade = (newPrice.unit_amount ?? 0) > (currentPrice.unit_amount ?? 0);

  const updated = await stripe.subscriptions.update(subscription.id, {
    items: [{ id: subscription.items.data[0].id, price: newPriceId }],
    proration_behavior: 'always_invoice',
    payment_behavior: isUpgrade ? 'default_incomplete' : 'allow_incomplete',
    metadata: { previousPriceId: currentPrice.id, changeType: isUpgrade ? 'upgrade' : 'downgrade' },
  });

  return NextResponse.json({
    subscription: updated.id,
    status: updated.status,
    clientSecret: isUpgrade
      ? ((updated.latest_invoice as Stripe.Invoice)?.payment_intent as Stripe.PaymentIntent)?.client_secret
      : null,
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

  await db.cancellation.create({
    data: {
      userId: session.user.id, reason, feedback,
      effectiveDate: new Date(subscription.current_period_end * 1000),
    },
  });

  return NextResponse.json({
    cancelAt: new Date(subscription.current_period_end * 1000).toISOString(),
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

## 3. Usage-Based Billing

Real metering with Redis buffering. Stripe rate-limits meter calls — batching is mandatory at scale.

```typescript
// lib/usage-metering.ts
import { stripe } from './stripe';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export class UsageMeter {
  constructor(private readonly flushIntervalMs = 60_000) {}

  async recordUsage(subscriptionItemId: string, quantity: number): Promise<void> {
    const window = String(Math.floor(Date.now() / 60000) * 60);
    const key = `usage:${subscriptionItemId}:${window}`;
    await redis.hincrby(key, 'quantity', quantity);
    await redis.expire(key, 3600);
  }

  async flush(): Promise<void> {
    const keys = await redis.keys('usage:si_*');

    for (const key of keys) {
      const [, subscriptionItemId, window] = key.split(':');
      const quantity = await redis.hget(key, 'quantity');
      if (!quantity || parseInt(quantity) === 0) continue;

      try {
        await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
          quantity: parseInt(quantity),
          timestamp: parseInt(window),
          action: 'increment',
        }, {
          idempotencyKey: `usage_${subscriptionItemId}_${window}`,
        });
        await redis.del(key);
      } catch (err: any) {
        if (err.code === 'idempotency_key_in_use') {
          await redis.del(key); // Already reported
          continue;
        }
        console.error(`Usage flush failed for ${subscriptionItemId}:`, err);
      }
    }
  }

  start(): NodeJS.Timeout {
    return setInterval(() => this.flush(), this.flushIntervalMs);
  }
}

export const meter = new UsageMeter();
```

### Metered pricing setup

```typescript
// scripts/setup-metered-prices.ts
async function setup() {
  const product = await stripe.products.create({ name: 'API Access' });

  // $29/mo base
  const base = await stripe.prices.create({
    product: product.id, unit_amount: 2900, currency: 'usd',
    recurring: { interval: 'month' },
  });

  // Usage: tiered, per API call
  const usage = await stripe.prices.create({
    product: product.id, currency: 'usd',
    recurring: { interval: 'month', usage_type: 'metered', aggregate_usage: 'sum' },
    billing_scheme: 'tiered', tiers_mode: 'graduated',
    tiers: [
      { up_to: 10000, unit_amount: 0 },             // First 10k included
      { up_to: 100000, unit_amount_decimal: '0.2' }, // $0.002/call
      { up_to: 'inf', unit_amount_decimal: '0.1' },  // $0.001/call volume discount
    ],
  });

  console.log('Base:', base.id, 'Usage:', usage.id);
}
```

---

## 4. Webhook Handler — Production Grade

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Idempotency — skip already-processed events
  if (await redis.get(`stripe:evt:${event.id}`)) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handleEvent(event);
    await redis.setex(`stripe:evt:${event.id}`, 172800, '1'); // 48h TTL
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`Webhook error [${event.type}]:`, err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0].price.id;
      const planMap: Record<string, string> = {
        [process.env.STRIPE_PRICE_PRO!]: 'pro',
        [process.env.STRIPE_PRICE_TEAM!]: 'team',
      };
      await db.user.update({
        where: { stripeCustomerId: sub.customer as string },
        data: {
          stripeSubscriptionId: sub.id,
          subscriptionStatus: sub.status,
          planId: planMap[priceId] ?? 'unknown',
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        },
      });
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      await db.user.update({
        where: { stripeCustomerId: sub.customer as string },
        data: { subscriptionStatus: 'canceled', stripeSubscriptionId: null, planId: null },
      });
      break;
    }

    case 'invoice.payment_succeeded': {
      const inv = event.data.object as Stripe.Invoice;
      await db.invoice.upsert({
        where: { stripeInvoiceId: inv.id },
        create: {
          stripeInvoiceId: inv.id,
          stripeCustomerId: inv.customer as string,
          amount: inv.amount_paid,
          currency: inv.currency,
          status: 'paid',
          pdfUrl: inv.invoice_pdf,
          paidAt: new Date(inv.status_transitions.paid_at! * 1000),
        },
        update: { status: 'paid' },
      });
      break;
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      // Dunning emails based on attempt count
      if (inv.attempt_count === 1) {
        await sendEmail(inv.customer_email!, 'payment-failed-soft', { url: inv.hosted_invoice_url });
      } else if (inv.attempt_count >= 3) {
        await sendEmail(inv.customer_email!, 'payment-failed-final', { url: inv.hosted_invoice_url });
      }
      await db.user.update({
        where: { stripeCustomerId: inv.customer as string },
        data: { subscriptionStatus: 'past_due' },
      });
      break;
    }

    case 'customer.subscription.trial_will_end': {
      const sub = event.data.object as Stripe.Subscription;
      const cust = await stripe.customers.retrieve(sub.customer as string) as Stripe.Customer;
      await sendEmail(cust.email!, 'trial-ending', {
        trialEnd: new Date(sub.trial_end! * 1000).toLocaleDateString(),
      });
      break;
    }
  }
}

async function sendEmail(to: string, template: string, data: Record<string, any>) {
  console.log(`[email] ${template} → ${to}`, data);
}
```

---

## 5. Customer Portal

```typescript
// app/api/billing/portal/route.ts
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await db.user.findUniqueOrThrow({
    where: { id: session.user.id },
    select: { stripeCustomerId: true },
  });

  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId!,
    return_url: `${process.env.NEXT_PUBLIC_URL}/settings/billing`,
  });

  return NextResponse.json({ url: portal.url });
}
```

### Portal configuration

```typescript
// scripts/configure-portal.ts
await stripe.billingPortal.configurations.create({
  business_profile: {
    headline: 'Manage your subscription',
    privacy_policy_url: 'https://example.com/privacy',
    terms_of_service_url: 'https://example.com/terms',
  },
  features: {
    subscription_update: {
      enabled: true,
      default_allowed_updates: ['price', 'quantity'],
      proration_behavior: 'always_invoice',
      products: [{
        product: process.env.STRIPE_PRODUCT_ID!,
        prices: [process.env.STRIPE_PRICE_PRO!, process.env.STRIPE_PRICE_TEAM!],
      }],
    },
    subscription_cancel: {
      enabled: true,
      mode: 'at_period_end',
      cancellation_reason: {
        enabled: true,
        options: ['too_expensive', 'missing_features', 'switched_service', 'unused', 'other'],
      },
    },
    payment_method_update: { enabled: true },
    invoice_history: { enabled: true },
  },
});
```

---

## 6. Stripe Tax for EU VAT

```typescript
// When creating customers, collect address for tax
const customer = await stripe.customers.create({
  email: user.email,
  metadata: { userId: user.id },
  tax: { validate_location: 'deferred' },
  address: {
    country: billingAddress.country,
    postal_code: billingAddress.postalCode,
    city: billingAddress.city,
    line1: billingAddress.line1,
  },
});

// B2B: validate VAT number
if (vatNumber) {
  try {
    const taxId = await stripe.customers.createTaxId(customer.id, {
      type: 'eu_vat',
      value: vatNumber,  // e.g., 'DE123456789'
    });
    // Verified asynchronously — listen for customer.tax_id.updated webhook
  } catch (err) {
    console.error('Invalid VAT number:', err);
  }
}

// In webhook handler:
case 'customer.tax_id.updated': {
  const taxId = event.data.object as Stripe.TaxId;
  if (taxId.verification?.status === 'verified') {
    await stripe.customers.update(taxId.customer as string, { tax_exempt: 'reverse' });
  } else if (taxId.verification?.status === 'failed') {
    await stripe.customers.update(taxId.customer as string, { tax_exempt: 'none' });
  }
  break;
}
```

---

## 7. Price Migration

### Grandfather existing customers

```typescript
// scripts/price-migration.ts
const OLD_PRICE = 'price_old_xxx';
const NEW_PRICE = 'price_new_xxx';

async function migrate(grandfatherBefore: Date) {
  let startingAfter: string | undefined;
  let migrated = 0, skipped = 0;

  while (true) {
    const subs = await stripe.subscriptions.list({
      price: OLD_PRICE, status: 'active', limit: 100,
      ...(startingAfter && { starting_after: startingAfter }),
    });

    for (const sub of subs.data) {
      if (new Date(sub.created * 1000) < grandfatherBefore) {
        await stripe.subscriptions.update(sub.id, {
          metadata: { grandfathered: 'true', originalPrice: OLD_PRICE },
        });
        skipped++;
        continue;
      }

      await stripe.subscriptions.update(sub.id, {
        items: [{ id: sub.items.data[0].id, price: NEW_PRICE }],
        proration_behavior: 'none',
        metadata: { migratedFrom: OLD_PRICE, migratedAt: new Date().toISOString() },
      });
      migrated++;
      await new Promise(r => setTimeout(r, 50)); // Rate limit
    }

    if (!subs.has_more) break;
    startingAfter = subs.data[subs.data.length - 1].id;
  }

  console.log(`Done. Migrated: ${migrated}, Grandfathered: ${skipped}`);
}

migrate(new Date('2025-03-01'));
```

### Schedule future price change

```typescript
async function schedulePriceChange(subscriptionId: string, newPriceId: string, effectiveDate: Date) {
  const schedule = await stripe.subscriptionSchedules.create({ from_subscription: subscriptionId });

  await stripe.subscriptionSchedules.update(schedule.id, {
    phases: [
      {
        items: [{ price: schedule.phases[0].items[0].price as string }],
        start_date: schedule.phases[0].start_date,
        end_date: Math.floor(effectiveDate.getTime() / 1000),
      },
      {
        items: [{ price: newPriceId }],
        start_date: Math.floor(effectiveDate.getTime() / 1000),
      },
    ],
  });
}
```

---

## 8. Testing

```bash
# Listen for webhooks locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed
```

### Test card numbers

```
4242424242424242  — Success
4000000000003220  — 3D Secure required
4000000000009995  — Insufficient funds
4000000000000341  — Attach succeeds, charge fails
4000002500003155  — SCA required (EU)
```

### Integration tests

```typescript
import { describe, it, expect, afterAll } from 'vitest';

describe('Billing', () => {
  let customerId: string;
  let subscriptionId: string;

  beforeAll(async () => {
    const customer = await stripe.customers.create({
      email: `test-${Date.now()}@example.com`,
      payment_method: 'pm_card_visa',
      invoice_settings: { default_payment_method: 'pm_card_visa' },
    });
    customerId = customer.id;
  });

  it('creates subscription', async () => {
    const sub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: process.env.TEST_PRICE_ID! }],
    });
    expect(sub.status).toBe('active');
    subscriptionId = sub.id;
  });

  it('upgrades', async () => {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const updated = await stripe.subscriptions.update(subscriptionId, {
      items: [{ id: sub.items.data[0].id, price: process.env.TEST_PRICE_PRO_ID! }],
      proration_behavior: 'always_invoice',
    });
    expect(updated.items.data[0].price.id).toBe(process.env.TEST_PRICE_PRO_ID);
  });

  it('cancels at period end', async () => {
    const updated = await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
    expect(updated.cancel_at_period_end).toBe(true);
    expect(updated.status).toBe('active');
  });

  afterAll(async () => {
    if (subscriptionId) await stripe.subscriptions.cancel(subscriptionId);
    if (customerId) await stripe.customers.del(customerId);
  });
});
```

---

## 9. Frontend Checkout

```tsx
'use client';
import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

export function CheckoutForm({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const { error: submitErr } = await elements.submit();
    if (submitErr) { setError(submitErr.message ?? 'Validation failed'); setLoading(false); return; }

    const { error: confirmErr } = await stripe.confirmPayment({
      elements, clientSecret,
      confirmParams: { return_url: `${window.location.origin}/billing/success` },
      redirect: 'if_required',
    });

    if (confirmErr) { setError(confirmErr.message ?? 'Payment failed'); setLoading(false); return; }
    onSuccess();
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={!stripe || loading}
        className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
        {loading ? 'Processing...' : 'Subscribe'}
      </button>
    </form>
  );
}
```

---

## 10. Common Pitfalls

1. **Not handling `requires_action`** — SCA/3D Secure means subscriptions can be `incomplete`. Always handle the client secret flow.
2. **Trusting API over webhooks** — Payment can fail asynchronously. Sync state from webhooks.
3. **Missing idempotency keys** — Network timeout → retry → duplicate charge.
4. **Only testing with US cards** — `4000002500003155` triggers SCA. Test EU flows.
5. **Ignoring `invoice.payment_failed`** — 30% of churn is failed payments. Implement dunning.
6. **Hardcoding price IDs** — Use env vars. Test and live have different IDs.
7. **Calling `subscriptions.cancel()` directly** — Immediately revokes access. Use `cancel_at_period_end: true`.
