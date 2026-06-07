---
name: stripe-billing
description: "Production Stripe billing on Next.js App Router — subscriptions, Billing Meters usage, idempotent webhooks, portal, Stripe Tax + Adaptive Pricing, migrations, Test Clocks. Pins apiVersion 2025-09-30.clover (Basil-line). Use when building or reviewing Stripe subscription/usage billing in Next.js; for Express/Node see `saas-billing`."
---

# Stripe Billing

> Disambiguation: this skill = Next.js App Router + Server Actions. For Express/Node backends see `saas-billing`.

Production patterns for Stripe billing that handle the edge cases tutorials skip. Subscription lifecycle, usage-based billing, webhook idempotency, EU VAT, and price migrations.

**Critical principle:** Webhooks are your source of truth, not API responses. Always design for eventual consistency.

### Basil-line API invariants (this skill targets `2025-09-30.clover`)

`2025-09-30.clover` is on the Basil line (the `2025-03-31.basil` release introduced these breaking changes; later monthly versions inherit them). The code below depends on these — if you bump the version, re-verify at <https://docs.stripe.com/changelog>:

- **Initial subscription payment secret** lives at `latest_invoice.confirmation_secret.client_secret`, NOT `latest_invoice.payment_intent`. Expand `latest_invoice.confirmation_secret`. (`expand: ['latest_invoice.payment_intent']` returns nothing on this version.)
- **Billing period fields moved to the subscription item:** use `sub.items.data[0].current_period_end` / `current_period_start`. `sub.current_period_end` no longer exists. `billing_cycle_anchor` stays on the subscription.
- **Legacy usage-based billing is removed:** `aggregate_usage` and `billing_thresholds` are gone; `UsageRecord`/`UsageRecordSummary` endpoints are deleted. A metered price MUST reference a Billing Meter via `recurring.meter`. Report usage with `billing.meterEvents.create`. (Changelog: <https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-legacy-usage-based-billing>)
- **`billing_mode: { type: 'flexible' }`** is the default for new subscriptions and is what enables `confirmation_secret`; set it explicitly so behavior is stable across version bumps.

---

## 1. Setup

```bash
npm install stripe @stripe/stripe-js @stripe/react-stripe-js
```

```typescript
// lib/stripe.ts — server-side only
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-09-30.clover',  // Pin a specific Stripe API version. Bump deliberately.
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

## 3. Usage-Based Billing (Billing Meters)

Legacy usage records are removed (see Basil-line invariants above). The model is now: a **Billing Meter** (`mtr_...`) aggregates **meter events** you send with `billing.meterEvents.create`; a **metered price** references that meter via `recurring.meter`. Stripe rate-limits meter calls, so buffer locally and flush in batches.

Two correctness rules the naive tutorial misses:

1. **Never `KEYS` in production** — it blocks Redis O(n) over the whole keyspace. Use `SCAN`.
2. **Don't read-then-`DEL`** — increments written between `HGET` and `DEL` are silently lost. Atomically drain the counter (Lua `GETDEL`-style) so a concurrent `HINCRBY` lands in the next window instead of vanishing. And send a deterministic `identifier` so a retried flush is de-duplicated by Stripe rather than double-billed.

```typescript
// lib/usage-metering.ts
import { stripe } from './stripe';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

// Atomically read+reset a window's quantity. Returns the drained value as a string.
// HSET to 0 (rather than DEL) keeps the key alive only for the TTL it already has;
// any HINCRBY racing this script either ran before (counted here) or after (next window).
const DRAIN = `
  local q = redis.call('HGET', KEYS[1], 'quantity')
  if q then redis.call('HSET', KEYS[1], 'quantity', 0) end
  return q or '0'
`;

export class UsageMeter {
  constructor(private readonly flushIntervalMs = 60_000) {}

  /** event_name is the Billing Meter's event_name (e.g. 'api_requests'). */
  async recordUsage(eventName: string, customerId: string, quantity: number): Promise<void> {
    const window = String(Math.floor(Date.now() / 60_000) * 60);
    const key = `usage:${eventName}:${customerId}:${window}`;
    await redis.hincrby(key, 'quantity', quantity);
    await redis.expire(key, 7200); // outlive a flush window even if the flusher is down
  }

  async flush(): Promise<void> {
    let cursor = '0';
    do {
      // SCAN, not KEYS. COUNT is a hint; loop until cursor wraps to '0'.
      const [next, keys] = await redis.scan(cursor, 'MATCH', 'usage:*', 'COUNT', 500);
      cursor = next;

      for (const key of keys) {
        // key = usage:<eventName>:<customerId>:<window>; customerId itself contains no ':'.
        const parts = key.split(':');
        const window = parts.pop()!;
        const customerId = parts.pop()!;
        const eventName = parts.slice(1).join(':');

        const drained = (await redis.eval(DRAIN, 1, key)) as string;
        const value = parseInt(drained, 10);
        if (!value) continue;

        try {
          await stripe.billing.meterEvents.create({
            event_name: eventName,
            payload: { stripe_customer_id: customerId, value: String(value) },
            timestamp: parseInt(window, 10),       // bucket start; must be within the meter's window
            // Deterministic per (customer, event, window): a retried flush is ignored by Stripe
            // instead of double-counted. Stripe de-dupes meter events by identifier.
            identifier: `${customerId}:${eventName}:${window}`,
          });
        } catch (err) {
          // Flush failed AFTER draining → put it back so the next tick retries.
          // Same identifier means Stripe still de-dupes if the event actually landed.
          await redis.hincrby(key, 'quantity', value);
          console.error(`Usage flush failed for ${eventName}/${customerId}@${window}:`, err);
        }
      }
    } while (cursor !== '0');
  }

  start(): NodeJS.Timeout {
    return setInterval(() => this.flush(), this.flushIntervalMs);
  }
}

export const meter = new UsageMeter();
```

> At real scale, prefer a durable outbox over Redis-only buffering: write each usage delta to a `usage_events` table (or stream) and have a worker drain it to Stripe, marking rows sent. Redis buffering trades a small loss window for latency; an outbox gives you replay and an audit trail. The deterministic `identifier` above is what makes either approach safe to retry.

### Create the meter + metered price

Inline, runnable setup. Run once per environment (test and live have separate `mtr_`/`price_` IDs). Replace the placeholder env names with your own.

```typescript
// scripts/setup-metered-prices.ts — run with: npx tsx scripts/setup-metered-prices.ts
import { stripe } from '../lib/stripe';

async function setup() {
  // 1. The meter aggregates events named 'api_requests'. customer_mapping + value keys
  //    MUST match the payload sent in recordUsage (stripe_customer_id / value).
  const m = await stripe.billing.meters.create({
    display_name: 'API Requests',
    event_name: 'api_requests',
    default_aggregation: { formula: 'sum' },          // sum | count | last
    value_settings: { event_payload_key: 'value' },
    customer_mapping: { type: 'by_id', event_payload_key: 'stripe_customer_id' },
  });

  const product = await stripe.products.create({ name: 'API Access' });

  // 2. $29/mo flat base (licensed, not metered).
  const base = await stripe.prices.create({
    product: product.id, unit_amount: 2900, currency: 'usd',
    recurring: { interval: 'month' },
  });

  // 3. Metered, graduated-tier usage price. NOTE the required recurring.meter — and
  //    NO aggregate_usage (removed on the Basil line; aggregation lives on the meter).
  const usage = await stripe.prices.create({
    product: product.id, currency: 'usd',
    recurring: { interval: 'month', usage_type: 'metered', meter: m.id },
    billing_scheme: 'tiered', tiers_mode: 'graduated',
    tiers: [
      { up_to: 10_000, unit_amount: 0 },              // first 10k included
      { up_to: 100_000, unit_amount_decimal: '0.2' }, // $0.002/req
      { up_to: 'inf', unit_amount_decimal: '0.1' },   // $0.001/req volume discount
    ],
  });

  console.log('Meter:', m.id, 'Base:', base.id, 'Usage:', usage.id);
  // Subscribe a customer to BOTH prices: items: [{ price: base.id }, { price: usage.id }]
}

setup().catch((e) => { console.error(e); process.exit(1); });
```

---

## 4. Webhook Handler — Production Grade

Idempotency must be **durable and atomic**, not Redis-only. A Redis flush would let old events replay and re-mutate billing state, and two concurrent deliveries of the same event can both pass a `GET` before either `SETEX`. Use the database as the source of truth with a unique constraint on the event id, and *claim before processing*:

```prisma
// schema.prisma
model ProcessedWebhook {
  eventId     String   @id          // Stripe event.id — unique constraint = the idempotency lock
  type        String
  processedAt DateTime @default(now())
}
```

```typescript
// app/api/webhooks/stripe/route.ts
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.text();        // raw body — required for signature verification
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Claim the event durably and atomically BEFORE doing work. The unique PK makes a
  // duplicate delivery (or a concurrent one) fail the insert → we ack 200 and skip.
  try {
    await db.processedWebhook.create({ data: { eventId: event.id, type: event.type } });
  } catch (err) {
    if (isUniqueViolation(err)) return NextResponse.json({ received: true, duplicate: true });
    throw err;
  }

  try {
    await handleEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    // Roll back the claim so Stripe's retry can reprocess. Stripe retries 5xx with backoff.
    await db.processedWebhook.delete({ where: { eventId: event.id } }).catch(() => {});
    console.error(`Webhook error [${event.type}]:`, err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }
}

// Prisma unique-constraint code is P2002; adapt for your driver.
function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      // A sub can have multiple items (e.g. base + metered). Pick the licensed plan item,
      // not blindly items.data[0], or a metered add-on can shadow the real plan.
      const planMap: Record<string, string> = {
        [process.env.STRIPE_PRICE_PRO!]: 'pro',
        [process.env.STRIPE_PRICE_TEAM!]: 'team',
      };
      const planItem = sub.items.data.find((i) => planMap[i.price.id]) ?? sub.items.data[0];

      // Basil-line: period end is on the item, not the subscription.
      const periodEnd = planItem.current_period_end;

      // Ordering: events can arrive out of order. event.created is the authoritative clock —
      // ignore an update older than what we last applied so a late 'created' can't clobber
      // a newer 'updated'. (Store lastEventAt alongside the subscription row.)
      await db.user.updateMany({
        where: {
          stripeCustomerId: sub.customer as string,
          OR: [{ lastEventAt: null }, { lastEventAt: { lt: new Date(event.created * 1000) } }],
        },
        data: {
          stripeSubscriptionId: sub.id,
          subscriptionStatus: sub.status,                 // raw Stripe status; entitlement derived separately (§10)
          planId: planMap[planItem.price.id] ?? 'unknown',
          currentPeriodEnd: new Date(periodEnd * 1000),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
          lastEventAt: new Date(event.created * 1000),
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

Configure the portal once per environment (run with `npx tsx scripts/configure-portal.ts`). Re-running `create` makes a new default configuration each time, so update the existing default if present to keep this idempotent:

```typescript
// scripts/configure-portal.ts
import Stripe from 'stripe';
import { stripe } from '../lib/stripe';

const params: Stripe.BillingPortal.ConfigurationCreateParams = {
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
};

async function main() {
  const existing = await stripe.billingPortal.configurations.list({ is_default: true, limit: 1 });
  const cfg = existing.data[0]
    ? await stripe.billingPortal.configurations.update(existing.data[0].id, params)
    : await stripe.billingPortal.configurations.create(params);
  console.log('Portal configuration:', cfg.id);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

---

## 6. Stripe Tax for EU VAT

> Tax handling is jurisdiction-specific and changes often. The patterns below are wiring, not tax advice — confirm registration thresholds, rates, place-of-supply, and exemption rules with a tax professional for every country you sell in. Stripe Tax only files where you've registered and configured a registration in the Dashboard.

**Prerequisites:** enable Stripe Tax in the Dashboard and add a **registration** per jurisdiction; otherwise `automatic_tax: { enabled: true }` computes $0. Set **tax behavior** on every Price (`tax_behavior: 'exclusive'` to add tax on top, `'inclusive'` if the listed price already contains it) — `automatic_tax` cannot compute on a price whose `tax_behavior` is `unspecified`.

```typescript
// When creating customers, collect address for tax. validate_location:'deferred'
// validates lazily at the first taxable transaction (vs 'immediately', which throws on bad input).
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

// Location validation can fail later (Stripe can't resolve the address to a tax jurisdiction).
// Surface it instead of silently billing untaxed: on customer.updated, inspect
// customer.tax.automatic_tax — 'unrecognized_location' / 'failed' means prompt the user to fix
// their address before the next invoice finalizes.
case 'customer.updated': {
  const c = event.data.object as Stripe.Customer;
  if (c.tax?.automatic_tax && c.tax.automatic_tax !== 'supported') {
    await flagAddressForReview(c.id, c.tax.automatic_tax); // your app concern
  }
  break;
}

// B2B reverse charge: validate the buyer's VAT number.
if (vatNumber) {
  try {
    await stripe.customers.createTaxId(customer.id, {
      type: 'eu_vat',
      value: vatNumber,  // e.g. 'DE123456789' — country prefix + digits
    });
    // Verified asynchronously — listen for customer.tax_id.updated webhook.
  } catch (err) {
    // Malformed value (wrong format) throws here; an invalid-but-well-formed number
    // fails later via the webhook. Don't grant exemption on this success path alone.
    console.error('VAT id rejected at creation:', err);
  }
}

// In webhook handler — only exempt AFTER verification succeeds:
case 'customer.tax_id.updated': {
  const taxId = event.data.object as Stripe.TaxId;
  if (taxId.verification?.status === 'verified') {
    // 'reverse' = EU reverse-charge (B2B cross-border): Stripe zero-rates VAT and notes it.
    await stripe.customers.update(taxId.customer as string, { tax_exempt: 'reverse' });
  } else if (taxId.verification?.status === 'failed') {
    await stripe.customers.update(taxId.customer as string, { tax_exempt: 'none' });
  }
  break;
}
```

**B2C vs B2B:** B2C in the EU is always taxed at the customer's rate (destination principle, no threshold for digital services). B2B with a *verified* VAT id in a different member state is reverse-charged (`tax_exempt: 'reverse'`); same-country B2B is still taxed normally. **Non-EU caveats:** US sales tax is economic-nexus based (per-state thresholds, not VAT), the UK is post-Brexit standalone (separate registration), and many countries have their own digital-goods rules — register per jurisdiction in the Dashboard before relying on automatic tax there.

---

## 7. Adaptive Pricing

Adaptive Pricing presents your single home-currency Price to international buyers in their **local currency** at Stripe-managed FX, so you don't maintain a Price per currency. It is **not** the same as multi-currency Prices (where you set explicit `currency_options` and bear FX yourself) — pick one model, not both, for a given Price.

- **Where it's configured:** Dashboard → Settings → **Adaptive Pricing** (account-level toggle). There is no per-request API flag — once enabled, eligible **Stripe-hosted Checkout** and the **Pricing Table** present localized amounts automatically.
- **When it applies:** Stripe-hosted Checkout Sessions / Payment Links / Pricing Tables, when Stripe can geolocate the buyer and the presentment currency differs from the Price currency. It does **not** apply to a self-hosted Payment Element flow like §1's direct-subscription path — that path always charges in the Price's currency. If you need localized presentment there, either move that flow to Checkout or define explicit `currency_options` on the Price.
- **Limitations:** settlement/payout is still in your account currency (buyers see local, you receive home minus FX); not all currencies/payment methods are eligible; it composes with Stripe Tax but the taxable amount follows the presentment currency. Interaction with coupons/trials can vary — verify in your account at <https://docs.stripe.com/payments/checkout/adaptive-pricing>.
- **How to test:** open a Checkout Session from a non-home locale (VPN or a browser `Accept-Language`/IP in another country) and confirm the displayed currency. Do this in test mode before enabling in live; don't confuse a localized presentment amount with having created a second Price.

---

## 8. Recovery, Reconciliation & Test Clocks

Webhooks are the source of truth, but deliveries can be missed (downtime, a handler bug, a dropped 5xx). Add a periodic reconciliation sweep, and use Test Clocks to exercise time-dependent flows deterministically.

### Nightly reconciliation (catch drift / missed events)

```typescript
// scripts/reconcile.ts — run on a daily cron
import { stripe } from '../lib/stripe';
import { db } from '../lib/db';

async function reconcile() {
  // stripe-node list results are async-iterable and auto-paginate across pages.
  for await (const sub of stripe.subscriptions.list({ status: 'all', limit: 100 })) {
    const periodEnd = sub.items.data[0].current_period_end; // item, not subscription (Basil-line)
    await db.user.updateMany({
      where: { stripeCustomerId: sub.customer as string },
      data: {
        subscriptionStatus: sub.status,
        currentPeriodEnd: new Date(periodEnd * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
    });
  }
}

reconcile().catch((e) => { console.error(e); process.exit(1); });
```

To re-drive missed events instead of polling state, list events and replay them through the same handler: `stripe.events.list({ type: 'customer.subscription.*' })` (Stripe retains events for 30 days) — the `ProcessedWebhook` claim in §4 makes replay safe and idempotent.

### Test Clocks (simulate renewals, trials, dunning)

Test Clocks let you fast-forward time so renewals, `trial_will_end`, and failed-payment retries fire on demand instead of waiting real days. Attach the customer to the clock **at creation**.

```typescript
// scripts/test-clock-renewal.ts (test mode only)
import { stripe } from '../lib/stripe';

async function run() {
  const clock = await stripe.testHelpers.testClocks.create({
    frozen_time: Math.floor(Date.now() / 1000),
    name: 'renewal test',
  });

  const customer = await stripe.customers.create({
    test_clock: clock.id,                 // must be set at creation; can't attach later
    payment_method: 'pm_card_visa',
    invoice_settings: { default_payment_method: 'pm_card_visa' },
  });

  const sub = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: process.env.TEST_PRICE_ID! }],
    trial_period_days: 7,
  });

  // Jump to just after trial end → trial_will_end (3 days prior) + first renewal invoice fire.
  await stripe.testHelpers.testClocks.advance({
    id: clock.id,
    frozen_time: Math.floor(Date.now() / 1000) + 8 * 24 * 3600,
  });
  // Poll clock.status until 'ready', then assert your webhook handler updated the DB.
  console.log('Advanced clock for', sub.id);
}

run().catch((e) => { console.error(e); process.exit(1); });
```

> Method names are stripe-node `testHelpers.testClocks.*`; the underlying API is `/v1/test_helpers/test_clocks`. Test Clocks are test-mode only and a clock can advance at most ~2 years total.

---

## 9. Price Migration

### Grandfather existing customers

```typescript
// scripts/price-migration.ts — run with: npx tsx scripts/price-migration.ts
import { stripe } from '../lib/stripe';

// Use env vars, not literals: test and live have different price IDs.
const OLD_PRICE = process.env.STRIPE_PRICE_OLD!;
const NEW_PRICE = process.env.STRIPE_PRICE_NEW!;

async function migrate(grandfatherBefore: Date) {
  let startingAfter: string | undefined;
  let migrated = 0, skipped = 0, alreadyDone = 0;

  while (true) {
    const subs = await stripe.subscriptions.list({
      price: OLD_PRICE, status: 'active', limit: 100,
      ...(startingAfter && { starting_after: startingAfter }),
    });

    for (const sub of subs.data) {
      // Idempotent: re-runs (after a crash mid-batch) skip subs already migrated.
      if (sub.metadata.migratedFrom === OLD_PRICE) { alreadyDone++; continue; }

      if (new Date(sub.created * 1000) < grandfatherBefore) {
        await stripe.subscriptions.update(sub.id, {
          metadata: { grandfathered: 'true', originalPrice: OLD_PRICE },
        });
        skipped++;
        continue;
      }

      // Find the item on the OLD price (don't assume items.data[0]).
      const item = sub.items.data.find((i) => i.price.id === OLD_PRICE) ?? sub.items.data[0];
      await stripe.subscriptions.update(sub.id, {
        items: [{ id: item.id, price: NEW_PRICE }],
        proration_behavior: 'none',  // 'none' = no mid-cycle charge; new price applies next cycle
        metadata: { migratedFrom: OLD_PRICE, migratedAt: new Date().toISOString() },
      }, {
        idempotencyKey: `migrate-${sub.id}-${NEW_PRICE}`,
      });
      migrated++;
      await new Promise((r) => setTimeout(r, 50)); // gentle rate limiting
    }

    if (!subs.has_more) break;
    startingAfter = subs.data[subs.data.length - 1].id;
  }

  console.log(`Done. Migrated: ${migrated}, Grandfathered: ${skipped}, Already: ${alreadyDone}`);
}

// Grandfather anyone who subscribed before this date; migrate everyone newer.
migrate(new Date('2026-01-01')).catch((e) => { console.error(e); process.exit(1); });
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

## 10. Testing

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

These hit Stripe's live **test**-mode API. Note the assertions: a freshly created subscription is rarely `'active'` synchronously — with `pm_card_visa` and no SCA it settles to `active`, but a card requiring SCA stays `incomplete` until confirmed. Assert against the set of acceptable states, not a single value. For time-dependent behavior (renewals, dunning), use Test Clocks (§8).

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { stripe } from '../lib/stripe';

const SETTLED = new Set(['active', 'trialing']);

describe('Billing', () => {
  let customerId: string | undefined;
  let subscriptionId: string | undefined;

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
      customer: customerId!,
      items: [{ price: process.env.TEST_PRICE_ID! }],
      payment_behavior: 'default_incomplete',
      billing_mode: { type: 'flexible' },
      expand: ['latest_invoice.confirmation_secret'],
    });
    subscriptionId = sub.id;
    // No-SCA test card settles immediately; SCA cards stay 'incomplete' pending confirmation.
    expect(['active', 'trialing', 'incomplete']).toContain(sub.status);
  });

  it('upgrades', async () => {
    const sub = await stripe.subscriptions.retrieve(subscriptionId!);
    const updated = await stripe.subscriptions.update(subscriptionId!, {
      items: [{ id: sub.items.data[0].id, price: process.env.TEST_PRICE_PRO_ID! }],
      proration_behavior: 'always_invoice',
    });
    expect(updated.items.data[0].price.id).toBe(process.env.TEST_PRICE_PRO_ID);
  });

  it('cancels at period end', async () => {
    const updated = await stripe.subscriptions.update(subscriptionId!, { cancel_at_period_end: true });
    expect(updated.cancel_at_period_end).toBe(true);
    expect([...SETTLED, 'past_due', 'incomplete']).toContain(updated.status);
  });

  // Best-effort cleanup; guard each call so a failed setup step can't throw here.
  afterAll(async () => {
    if (subscriptionId) await stripe.subscriptions.cancel(subscriptionId).catch(() => {});
    if (customerId) await stripe.customers.del(customerId).catch(() => {});
  });
});
```

---

## 11. Frontend Checkout

**Prerequisites for this self-hosted Payment Element flow** (vs. Stripe-hosted Checkout):
- Wrap this form in `<Elements stripe={getStripe()} options={{ clientSecret }}>` (the deferred-intent variant uses `options={{ mode, amount, currency }}`); `clientSecret` is the `confirmation_secret.client_secret` returned by §2's subscribe route.
- The parent generates a `requestId` once (`useState(() => crypto.randomUUID())`) and POSTs it with `priceId`/`paymentMethodId` so the server's idempotency key is stable across retries.
- `clientSecret` may be `null` (trial-only or $0 first invoice → nothing to confirm). Skip confirmation and treat it as success.
- This path charges in the Price's currency — it does **not** get Adaptive Pricing (§7). For localized presentment, use Stripe-hosted Checkout instead.
- SCA/3D Secure is handled by `confirmPayment` + `redirect: 'if_required'`: cards needing a challenge redirect to `return_url`; on return, read the status from the URL's `payment_intent_client_secret` and reconcile via webhook.

```tsx
'use client';
import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

export function CheckoutForm({ clientSecret, onSuccess }: { clientSecret: string | null; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    // No secret ⇒ trial/$0 invoice: subscription is already active, nothing to confirm.
    if (!clientSecret) { onSuccess(); setLoading(false); return; }

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

## 12. Common Pitfalls

1. **Not handling `requires_action`** — SCA/3D Secure means subscriptions can be `incomplete`. Always handle the client-secret confirmation flow; a `null` secret means nothing to confirm.
2. **Trusting API over webhooks** — Payment can fail asynchronously. Sync state from webhooks; reconcile nightly (§8) for missed deliveries.
3. **Reading `subscription.current_period_end`** — On the Basil line it moved to the item: `sub.items.data[0].current_period_end`. The old field is gone and reads as `undefined`.
4. **Expanding `latest_invoice.payment_intent`** — Returns nothing on this API. Expand `latest_invoice.confirmation_secret` and read `confirmation_secret.client_secret`.
5. **Using `aggregate_usage` / `UsageRecord`** — Removed. Create a Billing Meter, reference it via `recurring.meter`, report with `billing.meterEvents.create` (§3).
6. **Skipping idempotency keys** — Pass a stable `idempotencyKey` on every write (create/update/migrate). A retried POST then can't double-charge or double-create.
7. **Redis-only webhook dedup** — A flush replays old events and concurrent deliveries race. Claim the `event.id` in a durable, unique-constrained table *before* processing (§4).
8. **Only testing with US cards** — `4000002500003155` triggers SCA. Test EU/SCA flows and use Test Clocks for renewals/dunning.
9. **Ignoring `invoice.payment_failed`** — Failed payments are a large share of involuntary churn. Implement dunning emails on `attempt_count`.
10. **Hardcoding price IDs** — Use env vars. Test and live have different IDs.
11. **Calling `subscriptions.cancel()` directly** — Immediately revokes access. Use `cancel_at_period_end: true`.
