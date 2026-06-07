---
name: pricing-optimization
description: "SaaS pricing strategy and billing implementation — value metrics, tiering, discount governance, willingness-to-pay research (Van Westendorp/Gabor-Granger), localization, price increases, and production Stripe Billing (Checkout, usage meters, schedules, dunning, tax). Use when setting/testing prices, designing tiers, or implementing subscription/usage billing."
---

# Pricing Optimization

## Workflow

### 1. Value Metric Selection

The value metric is what you charge for. Get this wrong and everything else fails.

**Good value metric criteria:**
- Scales with value delivered to customer
- Easy for customer to understand
- Predictable for customer to budget
- Grows as customer succeeds

| Metric type | Examples | Best fit | Watch out for |
|-------------|----------|----------|---------------|
| Per seat | $X/user/month | Collaboration tools where every user gets value | Customers share logins; AI agents replace seats (seat counts can shrink) |
| Per usage / metered | $X/API call, $X/GB, $X/1k tokens | Infra, APIs, AI products where cost tracks consumption | Unpredictable bills hurt buyer trust → add caps, alerts, or prepaid credits |
| Hybrid (platform fee + usage) | $X/mo base + overage | Usage products needing revenue floor & expansion | Two dials to explain; keep the base meaningful, not a tax |
| Per feature / tier | Tier-gated access | Horizontal SaaS with distinct segments | Feature gates feel arbitrary if not value-aligned |
| Per outcome | $X/lead, $X/transaction, % of GMV | Performance tools that can attribute results | Attribution disputes; revenue swings with customer's business |
| Committed spend | Annual $ commitment drawn down by usage | Enterprise usage products, procurement-friendly | Requires forecasting; overage/rollover policy must be explicit |
| Flat rate | $X/month | Simple, single-persona products | Leaves expansion revenue on the table |

**Decision framework (guidelines, not laws — validate against your buyer):**
- Value scales ~linearly with active users, and seats aren't easily shared → **per seat** (but stress-test against AI/automation eroding seat counts).
- Cost-to-serve and value both track consumption → **usage / metered**; pair with a platform fee (**hybrid**) when you need a predictable revenue floor and land-and-expand.
- Features cleanly separate segments by their jobs-to-be-done → **tier-based**.
- You can credibly attribute a business outcome → **outcome-based**.
- Selling to procurement-led enterprises → **committed spend** with usage drawdown.
- There is rarely one "right" metric: many durable companies run **hybrid** (e.g. seats + usage, or platform fee + transaction %). Prefer the metric the buyer already uses to measure success internally.

### 2. Van Westendorp Price Sensitivity

**Survey questions (ask all 4):**
1. At what price would this be **so cheap** you'd question the quality?
2. At what price is this a **bargain** — great buy for the money?
3. At what price is this **getting expensive** — you'd think twice?
4. At what price is this **too expensive** — you'd never consider it?

**Analysis:**
Plot cumulative distributions of all 4 questions. Intersections give:

| Intersection | Meaning |
|-------------|---------|
| "Too cheap" ∩ "Getting expensive" | Point of marginal cheapness |
| "Bargain" ∩ "Too expensive" | Point of marginal expensiveness |
| "Too cheap" ∩ "Too expensive" | Optimal price point |
| "Bargain" ∩ "Getting expensive" | Indifference price point |

**Acceptable price range:** Between marginal cheapness and marginal expensiveness.

**Sampling & rigor:**
- **Minimum ~150–200 responses *per segment*** for stable curves. Report results per segment (SMB vs mid-market vs enterprise behave very differently); a blended curve hides everything.
- **Recruit qualified buyers**, not a generic panel. Screen for category awareness and purchase intent, or the stated prices are fiction.
- VW measures *price perception*, **not demand or willingness-to-pay**. It tells you a plausible range, not a revenue-maximizing point. Treat it as a starting hypothesis to A/B test, with confidence intervals — not a precise number.
- Stated-preference bias: people under-report what they'd pay and over-report price sensitivity. Anchor against actual conversion data once you have it.

**B2B caveat — separate buyer from user:** the person who feels the price (economic buyer / procurement) is usually not the daily user. Survey both, and weight the economic buyer's range for the headline number.

**Stronger alternatives when stakes are high:**
- **Gabor–Granger** — ask purchase likelihood at specific discrete prices; yields a demand curve and a revenue-maximizing price (better for *what to charge*, where VW only gives a range).
- **Conjoint / MaxDiff** — trades off features × price to reveal willingness-to-pay per feature and optimal *packaging*, not just one price. Best when designing tiers.
- **Live price tests / paywall experiments** — the only ground truth. Randomize price by cohort and measure conversion + retention + expansion, not just first-order conversion.

### 3. Tier Design

**3-tier standard (recommended starting point):**

| Element | Starter | Professional | Enterprise |
|---------|---------|-------------|------------|
| Price anchor | Low (attract) | Medium (convert) | High (capture) |
| Target | Individual / small team | Growing team | Large organization |
| Value metric limit | Low | Medium | Unlimited or custom |
| Support | Self-serve | Email + chat | Dedicated CSM |
| Features | Core only | Core + advanced | All + custom |

**Pricing rules:**
- Professional should be 2-3x Starter price
- Enterprise should be 3-5x Professional (or custom)
- Professional tier should be the obvious "best value" (anchor effect)
- Include one "decoy" feature in Professional that makes it clearly better than Starter
- Enterprise commonly uses "talk to sales" (custom pricing, security review, MSA negotiation). But this is **not a law**: product-led-growth companies increasingly offer **self-serve annual contracts, in-product procurement/SSO upgrades, and usage commitments with a sales-assist motion**. Use "talk to sales" when deals genuinely need negotiation; otherwise an "Enterprise, from $X" self-serve path reduces friction and shortens cycles.

### 4. Discount Strategy

**Guardrails:**

| Discount type | Max | Approval |
|---------------|-----|----------|
| Annual prepay | 20% | Self-serve |
| Multi-year deal | 30% | Manager approval |
| Competitive switch | 15% | Manager approval |
| Volume (10+ seats) | 15% | Auto-calculated |
| Strategic / Logo | 40% | VP approval + documented justification |

**Rules:**
- Never discount more than 40% (devalues product permanently)
- Always trade something: discount for annual commitment, case study, referral
- Track discount rate by rep (flag reps averaging > 20%)
- Sunset discounts: "This rate is locked for 12 months, then standard pricing"
- Document every discount reason in CRM

**Implementing discounts in Stripe — coupons vs promotion codes:**
- A **Coupon** defines the discount (percent/amount, duration: `once` / `repeating` / `forever`). Don't expose raw coupon IDs to customers.
- A **Promotion code** is a customer-facing code that *wraps* a coupon, with its own limits (max redemptions, expiry, first-time-customer only, minimum amount). Surface these via `allow_promotion_codes: true` in Checkout (see §8).
- Apply a coupon programmatically with `discounts: [{ coupon }]` (Checkout/Subscriptions); avoid the legacy top-level `coupon` field.

**Discount governance & compliance:** "was/now" and percentage-off claims are regulated in the EU (Omnibus Directive: the reference price must be the lowest in the prior 30 days) and the UK/other markets. Keep promo terms, expiry, and renewal price honest and auditable. This is general guidance, not legal advice — verify promotional displays with counsel.

### 5. Price Localization

**Purchasing Power Parity (PPP) adjustments:**

| Tier | Countries | Adjustment |
|------|-----------|------------|
| Full price | US, UK, Canada, Australia, Germany, France | 100% |
| Tier 2 | Spain, Italy, Portugal, Czech Republic, Poland | 70-80% |
| Tier 3 | Brazil, Mexico, Turkey, South Africa | 50-60% |
| Tier 4 | India, Indonesia, Philippines, Nigeria | 30-40% |

**Implementation:**
- Use IP geolocation for the *initial* display, then let users self-select country/currency (geolocation is approximate and trips up travelers/VPNs).
- Allow currency switching that adjusts the *actual price*, not just the symbol.
- Present the local price as the price for that market; you don't need to surface an internal "discount %." But it must not be deceptive — keep terms, renewal price, and tax treatment honest in every locale.
- Localized tiers should still ladder consistently (don't make a Tier-4 plan cheaper in absolute terms than the same plan one tier up).

**Legal / compliance guardrails (get a professional review before launch):**
- **Tax (VAT/GST/sales tax):** EU/UK B2C prices must generally be shown **VAT-inclusive**; US sales tax is typically added at checkout. This affects what number you display per region. Let Stripe Tax (or equivalent) compute and collect — see §8.
- **Consumer transparency (EU Omnibus, UK CMA, etc.):** the displayed price, recurring amount, renewal date, and cancellation terms must be clear and accurate. "Was/now" discount claims are regulated (reference-price rules).
- **Arbitrage & fairness:** geo-priced plans invite VPN abuse. Decide your stance (tolerate small leakage vs. verify billing country via payment method / tax ID) and apply it consistently — discriminatory enforcement creates legal and reputational risk.
- **Existing-customer fairness:** don't silently raise an individual's localized price; honor §7's notice timeline.
- **Sanctions / export:** screen restricted jurisdictions; don't sell where you're not permitted.

> Pricing, tax, and consumer-protection rules vary by jurisdiction and change. The above is general guidance, **not legal or tax advice** — verify your specific tiers, displays, and renewal notices with qualified counsel/tax advisors.

### 6. Annual vs Monthly

**Best practices:**
- Default to annual on pricing page (show monthly price as comparison)
- Annual discount: 15-20% (2 months free is standard messaging)
- Show monthly price per-month even for annual ("$49/mo billed annually")
- Offer monthly-to-annual upgrade path with prorated credit
- Track annual vs monthly mix (target: 60%+ annual for predictable revenue)

### 7. Price Increase Playbook

**Communication timeline:**

| When | Action |
|------|--------|
| 90 days before | Internal alignment: sales, CS, support briefed |
| 60 days before | Email announcement to all customers (clear, empathetic) |
| 30 days before | Reminder email + lock-in offer (annual at current price) |
| Day of | Price change live + support team ready for questions |
| 30 days after | Review churn impact, adjust if needed |

**Email template:**
```
Subject: Changes to your [Product] plan

Hi [Name],

On [date], we're updating our pricing. Your plan will change
from $X/mo to $Y/mo.

Why: [Honest reason — new features, increased costs, market alignment].

What you can do:
- Lock in current pricing by switching to annual before [date]
- Upgrade to [plan] to get [specific new value] at the new rate
- Questions? Reply to this email — we're here to help.

[Name], [Title]
```

**Expected impact:** Well-communicated 10-20% increase typically sees < 2% incremental churn. Poorly communicated or >30% increase can see 5-10%+ churn.

## 8. Stripe Integration Quickstart

### Checkout Session Creation

```typescript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function createCheckout(priceId: string, userId: string) {
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    // Omit payment_method_types to let Stripe auto-manage enabled methods
    // (cards, wallets, local methods) from the Dashboard.
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/pricing`,
    automatic_tax: { enabled: true },          // requires Stripe Tax + origin address
    tax_id_collection: { enabled: true },      // collect VAT/GST IDs for B2B reverse-charge
    customer_update: { name: 'auto', address: 'auto' }, // needed so Tax can use the address
    allow_promotion_codes: true,               // promotion codes (see §4) — not raw coupon IDs
    metadata: { userId },
    subscription_data: { metadata: { userId } },
  });
}
```

**Tax:** enable **Stripe Tax** (`automatic_tax`) so the right VAT/GST/sales tax is calculated and collected per the customer's location and your registrations — this is what makes the localized, consumer-law-compliant prices in §5 correct. Display EU/UK B2C prices tax-inclusive where required.

### Webhook Handler

```typescript
// app/api/stripe/webhook/route.ts
import { headers } from 'next/headers';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const body = await req.text();
  const sig = (await headers()).get('stripe-signature')!;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  // Idempotency: persist event.id and no-op if already processed.
  // Stripe retries deliveries; the same event can arrive more than once.
  if (await alreadyProcessed(event.id)) return new Response('OK', { status: 200 });

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      // Create subscription record, link to userId from metadata
      break;
    }
    case 'invoice.paid': {
      // Extend subscription period, grant/refresh entitlements, send receipt
      break;
    }
    case 'invoice.payment_failed': {
      // Dunning: Stripe Smart Retries will retry automatically.
      // Read invoice.next_payment_attempt; email the customer a fix-card link.
      // Revoke access only after the retry schedule is exhausted (see subscription status).
      break;
    }
    case 'customer.subscription.trial_will_end': {
      // Fires ~3 days before trial end — nudge the user to add/confirm payment.
      break;
    }
    case 'customer.subscription.updated': {
      // Plan changes + status transitions. Watch status:
      // 'past_due' / 'unpaid' → in dunning; 'active' → recovered; 'canceled' → revoke.
      break;
    }
    case 'customer.subscription.deleted': {
      // Mark subscription canceled, revoke access at period end
      break;
    }
  }

  await markProcessed(event.id);  // commit idempotency record after handling
  return new Response('OK', { status: 200 });
}
```

**Critical:** Never parse the body as JSON before passing to `constructEvent` — it needs the raw string for signature verification.

**Production essentials this implies:**
- **Idempotency store:** record every handled `event.id` (a unique-indexed table or KV row) and short-circuit duplicates. Stripe guarantees at-least-once, not exactly-once, delivery.
- **Entitlements:** grant access on `invoice.paid` / `checkout.session.completed` and revoke on cancel/unpaid — drive feature access off subscription **status**, not just plan. Stripe also offers a managed **Entitlements** API that emits an active-entitlements summary you can cache.
- **Dunning / recovery:** enable **Smart Retries** and the Customer Portal so customers can update a failed card (`invoice.payment_failed` → email a portal link). Most involuntary churn is recoverable here.
- **Audit trail:** log raw event payloads + your handling outcome for reconciliation and dispute defense.

## 9. Subscription Patterns

| Pattern | Implementation | Best for |
|---------|---------------|----------|
| Free trial → paid | `subscription_data: { trial_period_days: 14 }` | Products needing time to show value |
| Freemium | No Stripe until upgrade; gate features in code | Wide-funnel products |
| Metered / usage-based | A **Billing Meter** + a price with `recurring.usage_type: 'metered'` and `recurring.meter: <meter_id>`; report usage via meter events (see below) | API/AI products, infrastructure |
| Prepaid credits | Sell credits, draw down via meter events / Billing Credits | Bursty AI usage; predictable customer spend |

### Freemium Feature Gates

```typescript
// lib/subscription.ts
type Plan = 'free' | 'pro' | 'enterprise';
const FEATURE_ACCESS: Record<string, Plan[]> = {
  'export-csv': ['pro', 'enterprise'],
  'api-access': ['pro', 'enterprise'],
  'custom-domain': ['enterprise'],
  'team-members': ['pro', 'enterprise'],
};

export function hasAccess(feature: string, plan: Plan): boolean {
  return FEATURE_ACCESS[feature]?.includes(plan) ?? true; // unlisted = free
}
```

### Usage-Based Billing (Billing Meters — current API)

As of 2024, Stripe's usage-based billing is built on **Billing Meters + meter events**. The old `subscriptionItems.createUsageRecord` / standalone `usage_type: 'metered'` price flow is **legacy** — do not use it for new integrations.

**One-time setup (per metered dimension):**

```typescript
// 1. Create a meter — defines the event name and how Stripe aggregates usage.
const meter = await stripe.billing.meters.create({
  display_name: 'API calls',
  event_name: 'api_calls',                 // events reference this name
  default_aggregation: { formula: 'sum' }, // or 'count'
  customer_mapping: {                       // how an event maps to a customer
    type: 'by_id',
    event_payload_key: 'stripe_customer_id',
  },
  value_settings: { event_payload_key: 'value' }, // which payload key holds the number
});

// 2. Create a metered price tied to the meter, then sell it via Checkout (§8).
const price = await stripe.prices.create({
  currency: 'usd',
  unit_amount: 1,                                  // 1 cent per unit, or use tiers
  recurring: { interval: 'month', usage_type: 'metered', meter: meter.id },
  product_data: { name: 'API usage' },
});
```

**Report usage (real-time or batched) — this replaces usage records:**

```typescript
// Send a meter event whenever usage occurs. Stripe aggregates by customer + period.
await stripe.billing.meterEvents.create({
  event_name: 'api_calls',
  payload: {
    stripe_customer_id: customerId,   // matches customer_mapping above
    value: String(apiCallCount),      // matches value_settings.event_payload_key
  },
  identifier: `api_${requestId}`,     // idempotency: unique within a rolling 24h
  // timestamp defaults to now; must be within ~35 days past / 5 min future
});
```

- **Idempotency is built in:** a unique `identifier` makes retries safe — Stripe rejects duplicates within a rolling 24-hour window (`duplicate_meter_event`). Use a stable per-event id (e.g. request/job id).
- **Aggregation is asynchronous.** Reported usage is summarized into the invoice's metered line items; it is not reflected instantly. Read current totals via the meter's event summaries rather than assuming real-time balances.
- **High throughput / low latency:** use the **v2 meter event stream** (`POST /v2/billing/meter_event_stream` against `meter-events.stripe.com`) with a short-lived meter-event session token (valid ~15 min) to batch many events per call. The single-event call above is fine for typical volumes.
- **Related building blocks:** **Billing Credits** (grant prepaid/free credits drawn down by metered usage) and **usage alerts/thresholds** (notify or act when a customer crosses a usage level). For complex, high-scale metering (token/GPU-second billing à la OpenAI/Anthropic/Databricks), **Metronome** is the heavyweight option — Stripe and Metronome have a close partnership/integration (as of Jun 2026, verify the current relationship and any acquisition status at https://stripe.com/newsroom and https://metronome.com). Choose plain Billing Meters for standard usage products; reach for Metronome when you need hierarchical accounts, complex rating/credits, or real-time spend orchestration.

> APIs and the recommended approach evolve. Verify current meter syntax and limits at https://docs.stripe.com/billing/subscriptions/usage-based and the API version notes at https://docs.stripe.com/changelog.

## 10. Pricing Page Implementation

### Plan Comparison Component Pattern

```typescript
const PLANS = [
  { name: 'Free', price: '$0', priceId: null, features: ['5 projects', 'Community support'] },
  { name: 'Pro', price: '$29/mo', priceId: 'price_pro_monthly', features: ['Unlimited projects', 'Priority support', 'API access'], popular: true },
  { name: 'Enterprise', price: 'Custom', priceId: null, cta: 'Contact Sales', features: ['Everything in Pro', 'SSO', 'SLA', 'Dedicated CSM'] },
] as const;
```

### Upgrade/Downgrade Flows

**Upgrade — apply now and charge the prorated difference:**

```typescript
await stripe.subscriptions.update(subscriptionId, {
  items: [{ id: subscriptionItemId, price: newPriceId }],
  proration_behavior: 'always_invoice', // raise an invoice for the difference immediately
});
```

**Downgrade — defer to the end of the current period.**
A plain `subscriptions.update` with `proration_behavior: 'none'` changes the item **immediately** (just without proration) — it does **not** schedule the change for renewal. To actually take effect at period end, use a **subscription schedule** with two phases:

```typescript
// 1. Promote the subscription to a schedule (no-op billing-wise).
const schedule = await stripe.subscriptionSchedules.create({
  from_subscription: subscriptionId,
});

// 2. Phase 1 = current plan until period end; Phase 2 = new (lower) plan after.
const sub = await stripe.subscriptions.retrieve(subscriptionId);
const item = sub.items.data[0];

await stripe.subscriptionSchedules.update(schedule.id, {
  end_behavior: 'release', // return to a normal subscription once phases complete
  phases: [
    {
      items: [{ price: item.price.id, quantity: item.quantity }],
      start_date: item.current_period_start,
      end_date: item.current_period_end,   // run the current plan to period end
    },
    {
      items: [{ price: newPriceId, quantity: 1 }], // downgraded plan kicks in here
    },
  ],
});
// The customer keeps full access until current_period_end, then drops to the new plan.
```

Alternatively, if you use the **Customer Portal** for self-serve plan changes, enable "schedule downgrades at period end" (the `schedule_at_period_end` portal setting) and Stripe creates the schedule for you. Either way, gate in-app entitlements off the subscription's effective plan/status, not the requested one.

### Customer Portal (self-serve management)

```typescript
const portalSession = await stripe.billingPortal.sessions.create({
  customer: stripeCustomerId,
  return_url: `${process.env.APP_URL}/dashboard/billing`,
});
// Redirect user to portalSession.url
```

## 11. Testing Payments

| Item | Details |
|------|---------|
| Test card (success) | `4242 4242 4242 4242` any future exp, any CVC |
| Test card (decline) | `4000 0000 0000 0002` |
| Test card (3D Secure) | `4000 0025 0000 3155` |
| Webhook CLI | `stripe listen --forward-to localhost:3000/api/stripe/webhook` |

**Idempotency** — there are three distinct layers, don't conflate them:

1. **API write idempotency** — pass an `idempotencyKey` so a retried *create* call doesn't double-charge. Use Checkout/PaymentIntents, not the legacy Charges API:

```typescript
// Idempotent one-time payment (PaymentIntent — current API; Charges is legacy)
await stripe.paymentIntents.create(
  { amount: 2000, currency: 'usd', automatic_payment_methods: { enabled: true } },
  { idempotencyKey: `pi_${orderId}` },
);

// Or, for a Checkout Session:
await stripe.checkout.sessions.create({ /* ... */ }, { idempotencyKey: `co_${orderId}` });
```

2. **Meter-event idempotency** — the meter event `identifier` (see §9) dedupes usage within a rolling 24h window; this is separate from the header above.

3. **Webhook idempotency** — store each handled `event.id` and skip duplicates (see §8). Inbound delivery is at-least-once.

**Testing checklist:**
- [ ] Successful checkout → subscription created in DB
- [ ] Card decline → user sees error, no DB record created
- [ ] Webhook replay (`stripe trigger checkout.session.completed`) → idempotent
- [ ] Subscription cancel → access revoked, status updated
- [ ] Plan upgrade → prorated charge correct
- [ ] Plan downgrade → takes effect at period end

