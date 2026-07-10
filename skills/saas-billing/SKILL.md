---
name: saas-billing
description: "Express/Node SaaS billing with Stripe — subscriptions, usage billing (`billing.meterEvents`), webhooks, API key provisioning, dunning runbook, Adaptive Pricing, Stripe Tax. Use when building SaaS billing on an Express/Node backend; for Next.js see `stripe-billing`."
---

# SaaS Billing with Stripe — Expert Skill

> Disambiguation: this skill = Express/Node stack. For Next.js App Router + Server Actions billing, see `stripe-billing`. This skill pins Stripe `apiVersion: '2026-06-24.dahlia'`; `stripe-billing` currently pins `2025-09-30.clover`.

> Production-grade billing integration for SaaS applications using Stripe.
> Covers subscription, usage-based, and hybrid billing models with complete Express.js examples.

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Billing Models](#billing-models)
3. [Stripe Products & Prices](#stripe-products--prices)
4. [Checkout Sessions](#checkout-sessions)
5. [Stripe Tax](#stripe-tax)
6. [Adaptive Pricing (Local-Currency Checkout)](#adaptive-pricing-local-currency-checkout)
7. [Subscription Lifecycle](#subscription-lifecycle)
8. [Webhook Handling](#webhook-handling)
9. [API Key Provisioning](#api-key-provisioning)
10. [Customer Portal](#customer-portal)
11. [Metered / Usage-Based Billing](#metered--usage-based-billing)
12. [Dunning & Failed Payments](#dunning--failed-payments)
13. [Security](#security)
14. [Testing](#testing)
15. [Common Mistakes](#common-mistakes)
16. [Complete Express.js Server Example](#complete-expressjs-server-example)

---

## Core Concepts

### Stripe Object Hierarchy

```
Customer
  └── Subscription
        ├── Subscription Item (linked to a Price)
        │     └── Price (linked to a Product)
        │           └── Product
        └── Invoice
              └── Payment Intent → Payment Method
```

### Required Dependencies

```bash
npm install stripe express dotenv express-rate-limit
# Note: `crypto` is a Node.js core module — do NOT `npm install crypto`
# (that installs an abandoned, deprecated userland package). `require('crypto')` works out of the box.
# `body-parser` is unnecessary — Express 4.16+/5 ship `express.raw()` and `express.json()` built in.
```

Pin the Stripe SDK to a known major (`npm install stripe@^22`); the SDK major and the pinned `apiVersion` evolve together.

### Environment Variables

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PORTAL_CONFIG_ID=bpc_...    # optional
DATABASE_URL=postgres://...
```

### Stripe Client Initialization

```js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-06-24.dahlia',   // pin the API version
  maxNetworkRetries: 2,
});
```

**Always pin your API version.** Stripe changes behavior across versions. Pinning prevents silent breakage.

> Version note (as of Jul 2026): `2026-06-24.dahlia` is the current GA version and stripe-node v22 pins it. Before copying these examples, confirm the version your account defaults to (Dashboard → Developers → API version / Workbench) and the version your installed SDK major expects, then verify the latest at https://docs.stripe.com/api/versioning and https://docs.stripe.com/changelog. Bumping the version may change object shapes (e.g. invoice/subscription fields), so test webhooks against the new version before deploying.

---

## Billing Models

### 1. Flat-Rate Subscription

Fixed price per billing period. Simplest model.

- **Example:** $29/month for Pro plan
- **Stripe price type:** `recurring` with `unit_amount`
- **Best for:** Simple SaaS with feature-gated tiers

### 2. Per-Seat / Per-Unit

Price × quantity. Quantity updated as team grows/shrinks.

- **Example:** $10/user/month
- **Stripe price type:** `recurring` with `unit_amount`, adjust `quantity` on subscription item
- **Best for:** Collaboration tools, team-based SaaS

### 3. Usage-Based (Metered)

Pay for what you use. Reported via the Billing Meters API (`billing.meterEvents`).

- **Example:** $0.01 per API call
- **Stripe price type:** `recurring` with `usage_type: 'metered'` and `meter: <meter_id>` (Billing Meters era)
- **Best for:** API platforms, infrastructure, AI/ML services (per-token, per-inference billing)

### 4. Tiered Pricing

Price changes at volume thresholds.

- **Example:** First 1000 calls free, next 10k at $0.005, then $0.001
- **Stripe price type:** `recurring` with `tiers_mode: 'graduated'` or `'volume'`
- **Best for:** APIs with volume discounts

### 5. Hybrid

Combines a base subscription fee with metered usage on top.

- **Example:** $49/month base + $0.02 per API call
- **Implementation:** Single subscription with two subscription items (one flat, one metered)
- **Best for:** Most real-world SaaS products

---

## Stripe Products & Prices

### Creating Products & Prices (API)

```js
// Create the product (represents your offering)
const product = await stripe.products.create({
  name: 'Pro Plan',
  description: 'Full access to all features',
  metadata: {
    tier: 'pro',
    api_rate_limit: '1000',
  },
});

// Flat recurring price
const monthlyPrice = await stripe.prices.create({
  product: product.id,
  unit_amount: 2900,           // $29.00 in cents
  currency: 'usd',
  recurring: {
    interval: 'month',
  },
  metadata: { plan: 'pro_monthly' },
});

// Annual price with discount
const annualPrice = await stripe.prices.create({
  product: product.id,
  unit_amount: 29000,          // $290.00/year (saves ~$58)
  currency: 'usd',
  recurring: {
    interval: 'year',
  },
  metadata: { plan: 'pro_annual' },
});

// Per-seat price
const perSeatPrice = await stripe.prices.create({
  product: product.id,
  unit_amount: 1000,           // $10.00 per seat
  currency: 'usd',
  recurring: {
    interval: 'month',
  },
  metadata: { plan: 'pro_per_seat' },
});

// Metered usage price — MODERN (Billing Meters era, the default for new builds).
// First create a Meter (once, persisted), then back the price with it.
// See "Metered / Usage-Based Billing" below for the full meter setup + event reporting.
const meter = await stripe.billing.meters.create({
  display_name: 'API calls',
  event_name: 'api_request',                 // you send events with this event_name
  default_aggregation: { formula: 'sum' },   // 'sum' | 'count' | 'last'
});

const usagePrice = await stripe.prices.create({
  product: product.id,
  currency: 'usd',
  recurring: {
    interval: 'month',
    usage_type: 'metered',
    meter: meter.id,           // ← binds this price to the meter (required for Meters-era usage)
  },
  unit_amount: 1,              // $0.01 per unit (cents)
  metadata: { plan: 'pro_api_usage' },
});

// Tiered price (graduated), also meter-backed
const tieredPrice = await stripe.prices.create({
  product: product.id,
  currency: 'usd',
  recurring: {
    interval: 'month',
    usage_type: 'metered',
    meter: meter.id,
  },
  billing_scheme: 'tiered',
  tiers_mode: 'graduated',
  tiers: [
    { up_to: 1000, unit_amount: 0 },          // first 1000 free
    { up_to: 10000, unit_amount: 1 },          // $0.01 each
    { up_to: 'inf', unit_amount_decimal: '0.5' }, // $0.005 each — use unit_amount_decimal for sub-cent
  ],
  metadata: { plan: 'pro_tiered_api' },
});
```

> A `recurring.usage_type: 'metered'` price **without** `meter` falls back to the legacy
> subscription-item usage-record path (`createUsageRecord`), which is in maintenance mode for new
> integrations. Always set `meter` for new builds. The legacy path is documented in the appendix below.

### Best Practices for Products & Prices

- **Products = features/tiers.** Prices = billing variants (monthly, annual, per-seat).
- **Use `metadata`** extensively. Store your internal plan IDs, feature flags, rate limits.
- **Never delete prices.** Archive them with `active: false`. Existing subscriptions reference them.
- **Use lookup_keys** for stable references: `await stripe.prices.list({ lookup_keys: ['pro_monthly'] })`.

---

## Checkout Sessions

Checkout Sessions are the **correct** way to collect payment. Don't build custom forms unless you have a very good reason.

### Payment Mode (One-Time)

```js
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  customer: customerId,         // optional: attach to existing customer
  line_items: [
    {
      price: 'price_xxx',
      quantity: 1,
    },
  ],
  success_url: `${BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${BASE_URL}/billing/cancel`,
});
```

### Subscription Mode

```js
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer: customerId,
  line_items: [
    {
      price: 'price_pro_monthly',
      quantity: 1,
    },
  ],
  subscription_data: {
    trial_period_days: 14,
    metadata: {
      user_id: userId,
      plan: 'pro',
    },
  },
  success_url: `${BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${BASE_URL}/pricing`,
  allow_promotion_codes: true,

  // ─── Stripe Tax (see "Stripe Tax" section below for full setup) ───
  automatic_tax: { enabled: true },          // calculate & collect tax automatically
  billing_address_collection: 'required',    // 'required' so Tax always has a location
  customer_update: { address: 'auto', name: 'auto' }, // persist collected address onto the Customer
  tax_id_collection: { enabled: true },      // collect B2B VAT/GST IDs (enables reverse-charge)
});
```

### Hybrid Subscription (Base + Metered)

```js
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer: customerId,
  line_items: [
    {
      price: 'price_base_monthly',   // $49/month flat
      quantity: 1,
    },
    {
      price: 'price_api_metered',    // usage-based
      // no quantity for metered prices
    },
  ],
  success_url: `${BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${BASE_URL}/pricing`,
});
```

### Success URL: Retrieving the Session

**Critical:** `{CHECKOUT_SESSION_ID}` is a Stripe template literal — Stripe replaces it with the real session ID at redirect time.

```js
// GET /billing/success?session_id=cs_test_xxx
app.get('/billing/success', async (req, res) => {
  const { session_id } = req.query;

  if (!session_id) {
    return res.redirect('/pricing');
  }

  const session = await stripe.checkout.sessions.retrieve(session_id, {
    expand: ['subscription', 'customer'],
  });

  // Show confirmation page — but DO NOT provision here.
  // Provision in the webhook handler (checkout.session.completed).
  // The success page is just a "thank you" screen.

  res.render('billing-success', {
    customerEmail: session.customer_details?.email || session.customer_email,
    planName: session.subscription?.metadata?.plan || 'Pro',
  });
});
```

**Never provision access on the success URL.** Users can navigate away, close the tab, or the redirect can fail. Always provision in webhooks.

---

## Stripe Tax

Stripe Tax automatically calculates and collects sales tax, VAT, and GST based on the customer's location and your registrations. For SaaS, this is almost always preferable to hand-rolling tax — Stripe maintains rates and rules across jurisdictions.

### One-time account setup (Dashboard / API)

1. **Set your origin address** and enable Tax: Dashboard → **Tax** → Settings (or `POST /v1/tax/settings` with `defaults` + `head_office`). Tax stays in a non-collecting "preview" state until origin + a registration exist.
2. **Add registrations** for every jurisdiction where you have nexus/obligation. Stripe only *collects* tax where you are registered; everywhere else it returns a zero-rate "not registered" line, not an error.

```js
// Register to collect in a jurisdiction (do this per state/country where you have nexus)
await stripe.tax.registrations.create({
  country: 'US',
  country_options: {
    us: { state: 'CA', type: 'state_sales_tax' }, // e.g. California state sales tax
  },
  active_from: 'now',
});

// EU example (one-stop-shop style country registration)
await stripe.tax.registrations.create({
  country: 'DE',
  country_options: { de: { type: 'standard' } },
  active_from: 'now',
});

// List what you're currently registered to collect
const regs = await stripe.tax.registrations.list({ status: 'active' });
```

> **Nexus is a legal/accounting determination, not a Stripe feature.** Where you must register depends on revenue/transaction thresholds per jurisdiction (e.g. US economic-nexus thresholds, EU OSS). This is tax advice — confirm registrations with a tax professional or accountant. Stripe will not register for you, and collecting tax you aren't registered for can create liability. Rates/thresholds change; verify at https://docs.stripe.com/tax.

### Tax behavior & tax codes on Products/Prices

Two settings drive correct calculation:

- **`tax_behavior`** on the Price — whether `unit_amount` is `inclusive` (tax baked into the displayed price, common in EU/UK) or `exclusive` (tax added on top, common in US). `unspecified` blocks `automatic_tax` from finalizing.
- **`tax_code`** on the Product — Stripe's product tax category (a `txcd_...` code). SaaS commonly uses `txcd_10103001` (Software as a service — B2B) or `txcd_10103000` (SaaS — general); downloadable software, e-books, and physical goods each have distinct codes. The wrong code means the wrong rate.

```js
const product = await stripe.products.create({
  name: 'Pro Plan',
  tax_code: 'txcd_10103001', // SaaS (B2B). Browse codes: stripe.taxCodes.list() or docs.
});

const price = await stripe.prices.create({
  product: product.id,
  unit_amount: 2900,
  currency: 'usd',
  recurring: { interval: 'month' },
  tax_behavior: 'exclusive', // tax added on top of $29 (typical US SaaS)
});

// List available tax codes to find the right txcd_ for your product
const codes = await stripe.taxCodes.list({ limit: 50 });
```

> Tax-code identifiers (`txcd_...`) and their applicability change; **do not hardcode a code without verifying it** at https://docs.stripe.com/tax/tax-codes or via `stripe.taxCodes.list()`. As of Jun 2026 the SaaS codes above are current, but confirm for your product type.

### Enabling Tax in Checkout

```js
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer: customerId,
  line_items: [{ price: 'price_pro_monthly', quantity: 1 }],

  automatic_tax: { enabled: true },        // turn on calculation
  billing_address_collection: 'required',  // Tax needs a location; 'required' is safest
  customer_update: { address: 'auto', name: 'auto' }, // persist address onto the Customer
  tax_id_collection: { enabled: true },    // collect B2B VAT/GST IDs → enables reverse-charge

  success_url: `${BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${BASE_URL}/pricing`,
});
```

- `automatic_tax` requires a determinable customer location. With Checkout, `billing_address_collection: 'required'` guarantees one; Stripe can also infer from a verified card / IP, but don't rely on that for finalizing invoices.
- `customer_update: { address: 'auto' }` is **mandatory** when you pass an existing `customer` and want the collected address saved back — otherwise tax recalculation on renewals has no address.
- **Reverse charge (B2B EU/UK):** when a business customer enters a valid VAT ID via `tax_id_collection`, intra-EU B2B sales are typically zero-rated with a reverse-charge note. Stripe handles the validation and invoice wording; you just enable collection.

### Tax on API-created subscriptions and one-off invoices

```js
// Subscription created directly via API
await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: 'price_pro_monthly' }],
  automatic_tax: { enabled: true },
});

// One-off invoice
const invoice = await stripe.invoices.create({
  customer: customerId,
  automatic_tax: { enabled: true },
});
```

The Customer must have a valid `address` (or `tax.ip_address`) or Stripe cannot finalize a tax-enabled invoice — it will surface an error rather than guess.

### Testing tax

- Use a Checkout test address in a jurisdiction where you've added a (test-mode) registration — e.g. a California ZIP — and confirm a tax line appears.
- Confirm a non-registered jurisdiction yields a zero-rate "not registered" line, not a hard failure.
- Enter a valid EU VAT ID as a business customer and verify reverse-charge wording on the invoice.
- Inspect `invoice.total_taxes` (check `total_taxes[0].type` is `tax_rate_details` before reading amounts) in the webhook payload to reconcile what was collected.

> Filing/remittance is **not** automatic on standard Tax. Stripe calculates and collects; remittance is handled via Stripe Tax filing/exports or your accountant. Treat collected tax as a liability you owe, not revenue.

---

## Adaptive Pricing (Local-Currency Checkout)

Adaptive Pricing lets Checkout present prices in the **buyer's local currency** with localized rounding, even though your Price is defined in a single base currency (e.g. USD). Stripe handles the FX conversion and settlement. It improves conversion for international buyers without you maintaining a Price per currency.

### Enabling it

Adaptive Pricing is primarily an **account/Dashboard setting** (Dashboard → Settings → Checkout and Payment Links → Adaptive Pricing), and applies to eligible Checkout Sessions automatically once enabled. Where the Session API exposes it, the surface looks like:

```js
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer: customerId,
  line_items: [{ price: 'price_pro_monthly', quantity: 1 }], // USD-based price

  // Present localized currency to the buyer (account setting must also be on).
  adaptive_pricing: { enabled: true },

  success_url: `${BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${BASE_URL}/pricing`,
});
```

> The exact API parameter surface and the list of supported buyer currencies/regions have shifted across releases. **As of Jun 2026, verify the current parameter name, eligibility, and enablement steps at https://docs.stripe.com/payments/checkout/adaptive-pricing before relying on it in code** — treat the account-level toggle as the source of truth and the API flag as advisory.

### Caveats & when NOT to use it

- **Don't combine with manual multi-currency Prices.** If you already maintain a Price per currency (`currency_options` / separate Prices), use those instead — mixing the two double-converts and confuses reporting.
- **FX and rounding** are Stripe-managed; you don't control the exact displayed amount, and presented amounts move with exchange rates. Don't advertise an exact foreign price you can't guarantee.
- **Reconciliation:** charges settle and report in your **settlement currency**; the buyer sees local. Your revenue analytics must reconcile on settlement currency, not the displayed amount, or MRR/ARR will look noisy.
- **Tax interaction:** local-currency display does not change *where* you owe tax — Stripe Tax still keys off the customer's location and your registrations (see above).
- **Not a substitute for true local pricing.** If you want deliberately different price points per market (psychological pricing, PPP discounts), use explicit per-currency Prices, not Adaptive Pricing's FX conversion.

---

## Subscription Lifecycle

### Creating a Customer

```js
async function getOrCreateStripeCustomer(user) {
  if (user.stripe_customer_id) {
    return user.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: {
      user_id: user.id,
    },
  });

  await db.query(
    'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
    [customer.id, user.id]
  );

  return customer.id;
}
```

### Trials

```js
// Via Checkout Session
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer: customerId,
  line_items: [{ price: priceId, quantity: 1 }],
  subscription_data: {
    trial_period_days: 14,
  },
  // Collect payment method upfront (card saved, charged after trial)
  payment_method_collection: 'always',
  success_url: `${BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${BASE_URL}/pricing`,
});

// Via API directly
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  trial_period_days: 14,
  payment_behavior: 'default_incomplete',
  // basil and later removed invoice.payment_intent; read the client secret from
  // subscription.latest_invoice.confirmation_secret.client_secret, and list
  // payments via the invoice.payments array if you need PaymentIntent records.
  expand: ['latest_invoice.confirmation_secret'],
});
```

### Upgrade / Downgrade (Plan Changes)

> **Never assume `items.data[0]` is "the plan".** Hybrid subscriptions (base +
> metered) have multiple items, and Stripe does not guarantee their order.
> Targeting the wrong item silently changes the metered item instead of the base
> price (or vice versa). Identify items explicitly — by `price.lookup_key`,
> product metadata, or a stored subscription-item id.

```js
// Resolve a specific subscription item by lookup_key (preferred) or by a
// predicate over its price/product. Falls back to throwing rather than guessing.
function findSubscriptionItem(subscription, { lookupKey, match } = {}) {
  const items = subscription.items.data;
  const found = items.find((it) =>
    (lookupKey && it.price.lookup_key === lookupKey) ||
    (match && match(it))
  );
  if (!found) {
    throw new Error(
      `No subscription item matched ${lookupKey ?? 'predicate'} ` +
      `on ${subscription.id} (has ${items.length} item(s))`
    );
  }
  return found;
}

// 2025-03-31.basil and later removed current_period_start/current_period_end
// from the Subscription object: they now live on each subscription item.
// Read the period end from the base (non-metered) item.
function periodEnd(subscription) {
  const item = subscription.items.data.find(
    (it) => it.price.recurring?.usage_type !== 'metered'
  ) || subscription.items.data[0];
  return item.current_period_end;
}

// Change the BASE plan item only, leaving any metered item untouched.
async function changePlan(subscriptionId, newPriceId, { prorate = true, lookupKey } = {}) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Pick the base item explicitly. If the sub has exactly one item, that's it;
  // otherwise require a lookupKey (or a metadata match) to be unambiguous.
  const target = subscription.items.data.length === 1
    ? subscription.items.data[0]
    : findSubscriptionItem(subscription, {
        lookupKey,
        match: (it) => it.price.recurring?.usage_type !== 'metered', // the flat/base item
      });

  return stripe.subscriptions.update(subscriptionId, {
    items: [{ id: target.id, price: newPriceId }],
    proration_behavior: prorate ? 'create_prorations' : 'none',
    // For period-end downgrades, prefer a Subscription Schedule (below) — calling
    // update() with proration_behavior: 'none' switches the price object NOW
    // (no immediate proration, but the new price is on the subscription already).
  });
}

// Upgrade immediately with proration (single-item sub)
await changePlan(subId, 'price_enterprise_monthly', { prorate: true });
// Hybrid sub: name the base item so the metered item isn't touched
await changePlan(subId, 'price_enterprise_monthly', { prorate: true, lookupKey: 'base_plan' });

// Downgrade at period end — use Subscription Schedules to defer the change.
// Simply calling subscriptions.update() with proration_behavior: 'none'
// still switches the price immediately (billing changes at next cycle, but
// the price object on the subscription changes right away).
async function downgradeAtPeriodEnd(subscriptionId, newPriceId) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const endTs = periodEnd(subscription); // item-level period end (basil+)

  // Create a schedule from the existing subscription
  const schedule = await stripe.subscriptionSchedules.create({
    from_subscription: subscriptionId,
  });

  // Update the schedule: keep current phase, add new phase at period end.
  // IMPORTANT: Use 'now' for start_date of the first phase, not
  // subscription.current_period_start — that timestamp is in the past,
  // and Stripe rejects past start_date values.
  await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: 'release',
    phases: [
      {
        items: [{ price: subscription.items.data[0].price.id, quantity: 1 }],
        start_date: 'now',
        end_date: endTs,
      },
      {
        items: [{ price: newPriceId, quantity: 1 }],
        start_date: endTs,
        iterations: 1,
      },
    ],
  });
}
```

### Seat Changes

```js
// Update quantity on the per-seat item. Pass the seat item's lookup_key so this
// works on hybrid/multi-item subscriptions (metered items have no quantity).
async function updateSeats(subscriptionId, newQuantity, { lookupKey = 'per_seat' } = {}) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const seatItem = subscription.items.data.length === 1
    ? subscription.items.data[0]
    : findSubscriptionItem(subscription, { lookupKey });

  return stripe.subscriptionItems.update(seatItem.id, {
    quantity: newQuantity,
    proration_behavior: 'create_prorations',
  });
}
```

### Cancellation

```js
// Cancel at period end (recommended — user keeps access until paid period expires)
async function cancelAtPeriodEnd(subscriptionId) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

// Cancel immediately (rare — refund / abuse scenarios)
async function cancelImmediately(subscriptionId) {
  // `subscriptions.cancel` (DELETE) ends the subscription NOW. Its supported
  // options are `invoice_now` and `prorate` — NOT `proration_behavior`
  // (that belongs to subscriptions.update). Passing proration_behavior here
  // is ignored/invalid depending on API version.
  return stripe.subscriptions.cancel(subscriptionId, {
    invoice_now: true, // finalize any pending metered usage into a final invoice
    prorate: true,     // credit unused time as a proration on that final invoice
  });
  // `prorate: true`/`invoice_now: true` are the cancel-time flags. Immediate
  // cancellation does NOT auto-refund the customer — issue a refund or credit
  // note separately if you owe money back:
  //   await stripe.refunds.create({ payment_intent: '<pi_...>' });
}

// Alternative: schedule a hard cancel at a specific future timestamp without
// ending access now. Use cancel_at (a Unix timestamp) on update:
async function cancelAt(subscriptionId, unixTs) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at: unixTs,
    proration_behavior: 'none', // proration_behavior IS valid on update
  });
}

// Reactivate before period end
async function reactivateSubscription(subscriptionId) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}
```

### Pausing Subscriptions

Stripe supports pausing via `pause_collection`:

```js
// Pause — stop invoicing, keep subscription active
async function pauseSubscription(subscriptionId) {
  return stripe.subscriptions.update(subscriptionId, {
    pause_collection: {
      behavior: 'void',    // 'void' = skip invoices, 'keep_as_draft' = draft them
      // resumes_at: Math.floor(Date.now() / 1000) + 30 * 86400, // optional auto-resume
    },
  });
}

// Resume — set pause_collection to null (not empty string) to clear the pause
async function resumeSubscription(subscriptionId) {
  return stripe.subscriptions.update(subscriptionId, {
    pause_collection: null,
  });
}
```

**Decision:** Should paused users keep access? Usually no — revoke API keys / feature access on pause, restore on resume. Handle this in your webhook for `customer.subscription.updated`.

---

## Webhook Handling

This is the most critical section. **Get this wrong and you'll lose money, break provisioning, or create security holes.**

### The #1 Rule: Raw Body BEFORE express.json()

Stripe webhook signature verification requires the **raw request body**. If `express.json()` parses it first, the signature check will **always fail**.

```js
const express = require('express');
// Always pin your API version — see "Stripe Client Initialization" above.
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-06-24.dahlia',
});

const app = express();

// ┌─────────────────────────────────────────────────────────┐
// │  WEBHOOK ROUTE MUST BE REGISTERED BEFORE express.json() │
// └─────────────────────────────────────────────────────────┘

// Option A: Register webhook route with raw body parser FIRST
app.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

// THEN apply JSON parsing to everything else
app.use(express.json());

// Option B: If you can't control route order, use a custom verify function
// app.use(express.json({
//   verify: (req, res, buf) => {
//     if (req.originalUrl === '/webhooks/stripe') {
//       req.rawBody = buf;
//     }
//   },
// }));
```

### Signature Verification

```js
async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Process the event BEFORE responding — if you respond 200 first and
  // processing fails, Stripe won't retry and the event is silently lost.
  try {
    await processWebhookEvent(event);
    res.status(200).json({ received: true });
  } catch (err) {
    console.error(`Error processing webhook ${event.id}: ${err.message}`);
    res.status(500).json({ error: 'Processing failed' });
    // Stripe will retry on non-2xx responses
  }
}
```

### Idempotency

Stripe may send the same event **multiple times**. Your handler MUST be idempotent.

```js
async function processWebhookEvent(event) {
  // Atomically insert-or-skip to avoid TOCTOU race between SELECT and INSERT.
  // If two identical events arrive concurrently, only one will proceed.
  const result = await db.query(
    `INSERT INTO processed_events (stripe_event_id, event_type, processed_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (stripe_event_id) DO NOTHING
     RETURNING id`,
    [event.id, event.type]
  );

  if (result.rows.length === 0) {
    console.log(`Event ${event.id} already processed, skipping.`);
    return;
  }

  // Process the event
  await handleEvent(event);
}
```

**Database schema for idempotency:**

```sql
CREATE TABLE processed_events (
  id SERIAL PRIMARY KEY,
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clean up old events periodically (keep 90 days)
CREATE INDEX idx_processed_events_date ON processed_events (processed_at);
```

### Essential Webhook Events

```js
async function handleEvent(event) {
  const data = event.data.object;

  switch (event.type) {
    // ─── Checkout ──────────────────────────────────────────
    case 'checkout.session.completed': {
      await handleCheckoutCompleted(data);
      break;
    }

    // ─── Subscription Lifecycle ────────────────────────────
    case 'customer.subscription.created': {
      await handleSubscriptionCreated(data);
      break;
    }

    case 'customer.subscription.updated': {
      // previous_attributes lives on event.data, NOT on event.data.object.
      // Pass it as a second argument so the handler can detect what changed.
      await handleSubscriptionUpdated(data, event.data.previous_attributes || {});
      break;
    }

    case 'customer.subscription.deleted': {
      await handleSubscriptionDeleted(data);
      break;
    }

    // ─── Invoices & Payments ───────────────────────────────
    case 'invoice.payment_succeeded': {
      await handleInvoicePaymentSucceeded(data);
      break;
    }

    case 'invoice.payment_failed': {
      await handleInvoicePaymentFailed(data);
      break;
    }

    // ─── Optional but Recommended ──────────────────────────
    case 'customer.subscription.trial_will_end': {
      // Fires 3 days before trial ends — send reminder email
      await handleTrialEnding(data);
      break;
    }

    case 'invoice.upcoming': {
      // Fires ~3 days before next invoice — good for usage summary emails
      await handleUpcomingInvoice(data);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}
```

### Event Handlers — Complete Implementations

```js
// NOTE: these handlers reuse the periodEnd() helper from "Upgrade / Downgrade"
// above. basil+ removed current_period_end from the Subscription object, so it
// must be read from the subscription items.

// ─── checkout.session.completed ────────────────────────────
// This is your PRIMARY provisioning trigger.
async function handleCheckoutCompleted(session) {
  if (session.mode === 'subscription') {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription,
      { expand: ['items.data.price.product'] }
    );

    const customerId = session.customer;
    const userId = session.metadata?.user_id
      || subscription.metadata?.user_id;

    if (!userId) {
      console.error('No user_id in checkout session metadata!');
      return;
    }

    // Resolve the tier from the BASE (non-metered) item, not blindly data[0] —
    // a hybrid sub also has a metered item whose product carries no tier.
    const baseItem = subscription.items.data.length === 1
      ? subscription.items.data[0]
      : subscription.items.data.find((it) => it.price.recurring?.usage_type !== 'metered')
        || subscription.items.data[0];
    const tier = baseItem.price.product?.metadata?.tier || 'pro';

    // Provision access
    await db.query(
      `UPDATE users SET
        stripe_customer_id = $1,
        stripe_subscription_id = $2,
        plan = $3,
        subscription_status = $4,
        current_period_end = to_timestamp($5)
      WHERE id = $6`,
      [
        customerId,
        subscription.id,
        tier,
        subscription.status,
        periodEnd(subscription),
        userId,
      ]
    );

    // Generate API key if this is a new subscription
    await provisionApiKey(userId);

    console.log(`Provisioned subscription for user ${userId}`);
  }

  if (session.mode === 'payment') {
    // One-time payment — fulfill the order
    const userId = session.metadata?.user_id;
    await fulfillOneTimePayment(userId, session);
  }
}

// ─── customer.subscription.created ─────────────────────────
async function handleSubscriptionCreated(subscription) {
  // Often redundant with checkout.session.completed,
  // but useful for subscriptions created via API (not Checkout).
  const userId = await getUserByCustomerId(subscription.customer);
  if (!userId) return;

  await db.query(
    `UPDATE users SET
      stripe_subscription_id = $1,
      subscription_status = $2,
      current_period_end = to_timestamp($3)
    WHERE id = $4`,
    [subscription.id, subscription.status, periodEnd(subscription), userId]
  );
}

// ─── customer.subscription.updated ─────────────────────────
// Fires on: plan change, status change, trial end, pause, resume, etc.
// NOTE: This handler receives both the subscription object AND previousAttributes
// because previous_attributes lives on event.data, not on the object itself.
// The caller (handleEvent) must pass it separately — see below.
async function handleSubscriptionUpdated(subscription, previousAttributes = {}) {
  const userId = await getUserByCustomerId(subscription.customer);
  if (!userId) return;

  // Detect plan change. The webhook payload's price.product is usually just a
  // STRING id (not expanded), so re-fetch with expansion to read real metadata
  // and resolve the base (non-metered) item rather than blindly using data[0].
  let newTier = null;
  if (previousAttributes.items) {
    const full = await stripe.subscriptions.retrieve(subscription.id, {
      expand: ['items.data.price.product'],
    });
    const baseItem = full.items.data.length === 1
      ? full.items.data[0]
      : full.items.data.find((it) => it.price.recurring?.usage_type !== 'metered')
        || full.items.data[0];
    newTier = baseItem.price.product?.metadata?.tier || null;
    console.log(`User ${userId} changed plan; tier=${newTier ?? 'unknown'}`);
  }

  // Detect cancellation scheduled
  if (subscription.cancel_at_period_end) {
    console.log(`User ${userId} scheduled cancellation`);
    // Send retention email, show reactivation option
  }

  // Detect pause
  if (subscription.pause_collection) {
    console.log(`User ${userId} paused subscription`);
    await revokeApiKey(userId);
  } else if (previousAttributes.pause_collection) {
    console.log(`User ${userId} resumed subscription`);
    await provisionApiKey(userId);
  }

  // Always update local state. Use COALESCE so a NULL plan (this update wasn't a
  // plan change, or metadata was absent) does NOT erase the stored plan.
  await db.query(
    `UPDATE users SET
      subscription_status = $1,
      current_period_end = to_timestamp($2),
      plan = COALESCE($3, plan),
      cancel_at_period_end = $4
    WHERE stripe_customer_id = $5`,
    [
      subscription.status,
      periodEnd(subscription),
      newTier || subscription.metadata?.plan || null,
      subscription.cancel_at_period_end,
      subscription.customer,
    ]
  );
}

// ─── customer.subscription.deleted ─────────────────────────
// Subscription is fully cancelled / ended.
async function handleSubscriptionDeleted(subscription) {
  const userId = await getUserByCustomerId(subscription.customer);
  if (!userId) return;

  // Revoke all access
  await db.query(
    `UPDATE users SET
      subscription_status = 'canceled',
      plan = 'free',
      stripe_subscription_id = NULL
    WHERE id = $1`,
    [userId]
  );

  // Revoke API keys
  await revokeApiKey(userId);

  console.log(`Subscription deleted for user ${userId}, access revoked.`);
}

// ─── invoice.payment_succeeded ─────────────────────────────
// Fires on every successful payment (initial + renewals).
async function handleInvoicePaymentSucceeded(invoice) {
  // Only process renewal invoices. Skip initial creation (handled by
  // checkout.session.completed) and other non-cycle reasons like
  // subscription_update, subscription_threshold, manual, etc.
  if (invoice.billing_reason !== 'subscription_cycle') {
    return;
  }

  // Renewal payment — extend access
  const userId = await getUserByCustomerId(invoice.customer);
  if (!userId) return;

  // basil+ removed invoice.subscription; the subscription id now lives under
  // invoice.parent.subscription_details (check parent.type first).
  const subId = invoice.parent?.type === 'subscription_details'
    ? invoice.parent.subscription_details.subscription
    : null;
  if (!subId) return;
  const subscription = await stripe.subscriptions.retrieve(subId);

  await db.query(
    `UPDATE users SET
      subscription_status = 'active',
      current_period_end = to_timestamp($1),
      failed_payment_count = 0
    WHERE id = $2`,
    [periodEnd(subscription), userId]
  );

  console.log(`Renewal payment succeeded for user ${userId}`);
}

// ─── invoice.payment_failed ────────────────────────────────
async function handleInvoicePaymentFailed(invoice) {
  const userId = await getUserByCustomerId(invoice.customer);
  if (!userId) return;

  const attemptCount = invoice.attempt_count;

  await db.query(
    `UPDATE users SET
      subscription_status = 'past_due',
      failed_payment_count = $1
    WHERE id = $2`,
    [attemptCount, userId]
  );

  // Send dunning email based on attempt count
  if (attemptCount === 1) {
    await sendEmail(userId, 'payment-failed-first', {
      updatePaymentUrl: await createPortalSession(invoice.customer),
    });
  } else if (attemptCount === 2) {
    await sendEmail(userId, 'payment-failed-second', {
      updatePaymentUrl: await createPortalSession(invoice.customer),
      daysUntilCancellation: 7,
    });
  } else if (attemptCount >= 3) {
    await sendEmail(userId, 'payment-failed-final', {
      updatePaymentUrl: await createPortalSession(invoice.customer),
    });
    // Consider revoking access at this point
  }

  console.log(`Payment failed (attempt ${attemptCount}) for user ${userId}`);
}

// ─── Helper: Resolve user from Stripe customer ID ─────────
async function getUserByCustomerId(stripeCustomerId) {
  const result = await db.query(
    'SELECT id FROM users WHERE stripe_customer_id = $1',
    [stripeCustomerId]
  );
  return result.rows[0]?.id || null;
}
```

---

## API Key Provisioning

For SaaS products that expose an API, provision keys tied to the subscription lifecycle.

### Generating Secure API Keys

```js
const crypto = require('crypto');

// Generate a cryptographically secure API key.
// Use a PRODUCT-specific prefix (e.g. `myapp_live_`) — never `sk_`, which collides
// with Stripe secret keys (`sk_live_`/`sk_test_`) and confuses secret scanners.
function generateApiKey(prefix = 'myapp_live') {
  const key = crypto.randomBytes(32).toString('hex');  // 64 hex chars
  return `${prefix}_${key}`;
  // Example: myapp_live_a1b2c3d4e5f6...
}

// Hash for storage (never store plaintext keys in your DB)
function hashApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}
```

### Database Schema

```sql
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  key_prefix VARCHAR(24) NOT NULL,        -- leading chars for display: "myapp_live_a1b2..."
  name VARCHAR(100) DEFAULT 'Default',
  scopes TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_hash ON api_keys (key_hash) WHERE is_active = true;
CREATE INDEX idx_api_keys_user ON api_keys (user_id) WHERE is_active = true;
```

### Provisioning & Revocation

```js
async function provisionApiKey(userId) {
  // Check if user already has an active key
  const existing = await db.query(
    'SELECT id FROM api_keys WHERE user_id = $1 AND is_active = true',
    [userId]
  );

  if (existing.rows.length > 0) {
    return; // Already has a key
  }

  const apiKey = generateApiKey();           // product-prefixed, e.g. myapp_live_...
  const keyHash = hashApiKey(apiKey);
  const keyPrefix = apiKey.substring(0, 18) + '...'; // store namespace + a few chars for display

  await db.query(
    `INSERT INTO api_keys (user_id, key_hash, key_prefix, name)
     VALUES ($1, $2, $3, 'Default')`,
    [userId, keyHash, keyPrefix]
  );

  // Send the key to the user (email, dashboard, etc.)
  // This is the ONLY time the full key is visible.
  await sendEmail(userId, 'api-key-provisioned', { apiKey, keyPrefix });

  return apiKey;
}

async function revokeApiKey(userId) {
  await db.query(
    `UPDATE api_keys SET
      is_active = false,
      revoked_at = NOW()
    WHERE user_id = $1 AND is_active = true`,
    [userId]
  );
}

// Validate an API key on incoming requests
async function validateApiKey(apiKey) {
  const keyHash = hashApiKey(apiKey);

  const result = await db.query(
    `SELECT ak.id, ak.user_id, ak.scopes, u.plan, u.subscription_status
     FROM api_keys ak
     JOIN users u ON u.id = ak.user_id
     WHERE ak.key_hash = $1
       AND ak.is_active = true
       AND (ak.expires_at IS NULL OR ak.expires_at > NOW())`,
    [keyHash]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const keyData = result.rows[0];

  // Check subscription is active
  if (!['active', 'trialing'].includes(keyData.subscription_status)) {
    return null;
  }

  // Update last_used_at (fire and forget)
  db.query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [keyData.id]);

  return keyData;
}
```

### API Key Authentication Middleware

```js
async function authenticateApiKey(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  const apiKey = authHeader.substring(7);
  const keyData = await validateApiKey(apiKey);

  if (!keyData) {
    return res.status(401).json({ error: 'Invalid or expired API key' });
  }

  req.userId = keyData.user_id;
  req.plan = keyData.plan;
  req.scopes = keyData.scopes;
  next();
}

// Usage
app.get('/api/v1/data', authenticateApiKey, (req, res) => {
  res.json({ userId: req.userId, plan: req.plan });
});
```

---

## Customer Portal

Let customers manage their own billing. Stripe's portal handles plan changes, payment methods, invoices, and cancellation.

### Configuration

```js
// Create portal configuration (do this once, store the ID)
const portalConfig = await stripe.billingPortal.configurations.create({
  business_profile: {
    headline: 'Manage your subscription',
    privacy_policy_url: 'https://yourapp.com/privacy',
    terms_of_service_url: 'https://yourapp.com/terms',
  },
  features: {
    customer_update: {
      enabled: true,
      allowed_updates: ['email', 'address', 'tax_id'],
    },
    subscription_cancel: {
      enabled: true,
      mode: 'at_period_end',
      cancellation_reason: {
        enabled: true,
        options: [
          'too_expensive',
          'missing_features',
          'switched_service',
          'unused',
          'other',
        ],
      },
    },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ['price', 'quantity'],
      proration_behavior: 'create_prorations',
      products: [
        {
          product: 'prod_xxx',
          prices: ['price_monthly', 'price_annual'],
        },
      ],
    },
    payment_method_update: { enabled: true },
    invoice_history: { enabled: true },
  },
});

// Save portalConfig.id → STRIPE_PORTAL_CONFIG_ID
```

### Creating Portal Sessions

```js
app.post('/billing/portal', requireAuth, async (req, res) => {
  const user = req.user;

  if (!user.stripe_customer_id) {
    return res.status(400).json({ error: 'No billing account found' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${BASE_URL}/dashboard/billing`,
    configuration: process.env.STRIPE_PORTAL_CONFIG_ID, // optional
  });

  res.json({ url: session.url });
  // Or redirect: res.redirect(303, session.url);
});
```

---

## Metered / Usage-Based Billing

> **Use Billing Meters for all new usage-based billing.** You send *meter events*
> keyed by `stripe_customer_id` (not subscription-item usage records); Stripe
> aggregates them against the meter that backs the price (see "Stripe Products &
> Prices" for creating the meter + meter-backed price). The legacy
> `subscriptionItems.createUsageRecord` path is in maintenance mode and is kept
> in the appendix at the end of this section only for existing integrations.
> Docs: https://docs.stripe.com/billing/subscriptions/usage-based

### Reporting Usage (Billing Meters — default)

```js
// Send a meter event. `event_name` MUST match the meter's event_name.
// `stripe_customer_id` is the aggregation key — NOT a subscription item id.
async function reportMeterEvent(customerId, value = 1, { eventName = 'api_request', timestamp, identifier } = {}) {
  return stripe.billing.meterEvents.create({
    event_name: eventName,
    // `identifier` makes the event idempotent — Stripe de-dupes events that
    // share the same identifier, so a retry after a network blip won't double-bill.
    identifier,                                  // e.g. a request id / ULID
    timestamp,                                   // Unix seconds; omit = "now". Most
                                                 // meters reject events older than ~35 days.
    payload: {
      stripe_customer_id: customerId,            // required aggregation key
      value: String(value),                      // payload values are strings
    },
  });
}

// Example: report API usage after each request (fire-and-forget, never block the response)
app.use('/api/v1', authenticateApiKey, async (req, res, next) => {
  res.on('finish', () => {
    // Resolve the Stripe customer id for this user (cache it on req in auth middleware
    // to avoid a DB hit per request).
    const customerId = req.stripeCustomerId;
    if (!customerId) return;
    reportMeterEvent(customerId, 1, {
      identifier: req.id,                         // unique per request → idempotent
    }).catch((err) => {
      console.error('Failed to report meter event:', err.message);
      enqueueUsageRetry({ customerId, value: 1, identifier: req.id }); // durable retry, see below
    });
  });
  next();
});
```

> **Reporting !== invoicing.** Meter events feed an aggregated total that Stripe
> bills at the period boundary. There is no per-event charge, so emitting events
> is cheap — but it is also eventually-consistent, so don't read meter totals to
> enforce hard real-time quotas (use your own counter for that; see
> "Usage Limits" below).

### Batched / High-Volume Usage Reporting

At high request rates, prefer a **durable queue** (Redis Stream, SQS, Postgres
`outbox` table) over an in-memory accumulator — a process restart must not lose
billable usage. The aggregation key is the **customer**, and each batched event
should carry a stable `identifier` so retries stay idempotent.

```js
// Aggregate in-memory only as a write-coalescing buffer in FRONT of a durable
// queue. On every flush, generate ONE identifier per (customer, window) so a
// retried flush de-dupes instead of double-billing.
class UsageAccumulator {
  constructor(flushIntervalMs = 60_000, { eventName = 'api_request' } = {}) {
    this.counters = new Map(); // stripeCustomerId → count
    this.eventName = eventName;
    this.interval = setInterval(() => this.flush().catch(console.error), flushIntervalMs);
  }

  increment(customerId, amount = 1) {
    this.counters.set(customerId, (this.counters.get(customerId) || 0) + amount);
  }

  async flush() {
    const windowId = Math.floor(Date.now() / 60_000); // 1-min bucket → stable id
    const entries = [...this.counters.entries()];
    this.counters.clear();

    for (const [customerId, value] of entries) {
      if (value === 0) continue;
      try {
        await stripe.billing.meterEvents.create({
          event_name: this.eventName,
          identifier: `${customerId}:${windowId}`, // idempotent per customer per minute
          payload: { stripe_customer_id: customerId, value: String(value) },
        });
      } catch (err) {
        console.error(`Failed to report usage for ${customerId}:`, err.message);
        // Re-buffer for the next flush (still de-duped by the windowId identifier).
        this.counters.set(customerId, (this.counters.get(customerId) || 0) + value);
      }
    }
  }

  async shutdown() {
    clearInterval(this.interval);
    await this.flush(); // flush remaining buffer on SIGTERM so usage isn't lost
  }
}

const usageTracker = new UsageAccumulator(60_000); // flush every 60s
process.on('SIGTERM', async () => { await usageTracker.shutdown(); process.exit(0); });
```

> **Caveat on `${customerId}:${windowId}` identifiers:** within a single window
> you must coalesce to exactly one event per customer (as above). If you instead
> emit multiple events per window, give each a unique identifier — reusing one
> identifier for different values means Stripe keeps only the first.

### Legacy appendix — `createUsageRecord` (maintenance mode, existing integrations only)

Only for subscriptions on **legacy metered prices created without a `meter`**.
Do not use for new builds. This endpoint only exists on API versions before
2025-03-31.basil; it was removed in basil and from current SDK majors. Existing
integrations must keep a pre-basil pinned version (2025-02-24.acacia or earlier)
or call it via `stripe.rawRequest` with a pre-basil `Stripe-Version` header after
upgrading the SDK (see
https://docs.stripe.com/billing/subscriptions/usage-based-legacy/sdk-upgrade).
It will not run against the client pinned above.

```js
// LEGACY — keyed by subscription ITEM id, not customer. Prefer meter events above.
async function reportUsageLegacy(subscriptionItemId, quantity, timestamp = null) {
  return stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
    quantity,
    timestamp: timestamp || Math.floor(Date.now() / 1000),
    action: 'increment', // 'increment' adds to the period total; 'set' overwrites it
  });
}
```

### Usage Limits & Rate Limiting Per Plan

```js
const PLAN_LIMITS = {
  free:       { monthly_api_calls: 100,    rpm: 10  },
  starter:    { monthly_api_calls: 10_000, rpm: 60  },
  pro:        { monthly_api_calls: 100_000, rpm: 300 },
  enterprise: { monthly_api_calls: Infinity, rpm: 1000 },
};

async function checkUsageLimit(userId, plan) {
  const limits = PLAN_LIMITS[plan];
  if (!limits) return false;

  const result = await db.query(
    `SELECT COUNT(*) as count FROM api_usage_log
     WHERE user_id = $1
       AND created_at >= date_trunc('month', NOW())`,
    [userId]
  );

  const used = parseInt(result.rows[0].count);
  return used < limits.monthly_api_calls;
}
```

---

## Dunning & Failed Payments

Dunning is the process of recovering failed payments. Stripe has Smart Retries built in, but you should also act on your side.

### Stripe Smart Retries Configuration

Configure in Stripe Dashboard → Settings → Billing → Subscription and emails:

- **Retry schedule:** Stripe retries 3-4 times over ~3 weeks by default
- **Customer emails:** Enable Stripe's built-in failed payment emails
- **Subscription status:** Moves from `active` → `past_due` → `unpaid` → `canceled`

### Your Dunning Logic

```js
// In your subscription status check middleware
async function requireActiveSubscription(req, res, next) {
  const user = req.user;

  switch (user.subscription_status) {
    case 'active':
    case 'trialing':
      return next();

    case 'past_due':
      // Grace period — allow limited access but show warning
      req.pastDue = true;
      return next();

    case 'unpaid':
    case 'canceled':
      return res.status(402).json({
        error: 'subscription_required',
        message: 'Your subscription has expired. Please update your payment method.',
        portal_url: '/billing/portal',
      });

    default:
      return res.status(403).json({ error: 'Unknown subscription status' });
  }
}
```

### Grace Periods

```js
// Allow X days of access after payment failure before hard cutoff
const GRACE_PERIOD_DAYS = 7;

function isInGracePeriod(user) {
  if (user.subscription_status !== 'past_due') return false;

  const firstFailedAt = user.first_failed_payment_at;
  if (!firstFailedAt) return true; // just failed, still in grace

  const gracePeriodEnd = new Date(firstFailedAt);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

  return new Date() < gracePeriodEnd;
}
```

---

## Security

### Webhook Signature Verification (Mandatory)

Already covered above. **Never skip this.** Without it, anyone can POST fake events to your webhook endpoint.

### Timing-Safe Comparison for API Keys

```js
const crypto = require('crypto');

// WRONG — vulnerable to timing attacks
// if (providedKey === storedKey) { ... }

// RIGHT — constant-time comparison
function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// For hashed keys (what you should actually do):
// Hash the incoming key, then compare hashes. SHA-256 is fixed-length,
// so timingSafeEqual works perfectly.
function validateKeyHash(providedKey, storedHash) {
  const providedHash = crypto.createHash('sha256').update(providedKey).digest('hex');
  return secureCompare(providedHash, storedHash);
}
```

### Rate Limiting

```js
const rateLimit = require('express-rate-limit');

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

// Per-plan rate limit — pre-create one limiter per plan to avoid
// creating a new rateLimit instance on every request (which resets
// the window each time, making it nonfunctional).
const planLimiters = Object.fromEntries(
  Object.entries(PLAN_LIMITS).map(([plan, limits]) => [
    plan,
    rateLimit({
      windowMs: 60 * 1000,
      max: limits.rpm,
      keyGenerator: (req) => req.userId,
      standardHeaders: true,
      message: {
        error: 'rate_limit_exceeded',
        limit: limits.rpm,
        window: '1m',
      },
    }),
  ])
);

function planRateLimiter(req, res, next) {
  const limiter = planLimiters[req.plan];
  if (!limiter) return res.status(403).json({ error: 'No plan' });
  return limiter(req, res, next);
}

// ⚠️  Do NOT rate-limit the Stripe webhook endpoint by request volume before
// verifying the signature. Stripe legitimately bursts events (backfills,
// migrations, incident recovery) and a 429 just triggers retries, growing a
// backlog and risking dropped events past Stripe's retry window.
//
// Instead: (1) verify the signature first — that IS your authentication and
// rejects forged/replayed payloads; (2) keep the handler cheap by enqueuing
// work and returning 200 fast; (3) protect the box with a generous infra-level
// connection/QPS cap (LB/WAF), not an app-level per-window cap that drops valid
// events. If you must cap in-app, cap AFTER verification and only on bodies that
// fail signature checks (i.e. throttle attackers, never Stripe).
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);
```

### Secure Key Storage

- **Never log full API keys.** Log only the prefix (`myapp_live_a1b2...`).
- **Never store plaintext keys.** Always hash with SHA-256.
- **Rotate webhook secrets** periodically via Stripe Dashboard.
- **Use separate restricted API keys** for different services (read-only for analytics, write for billing).

---

## Testing

### Test Mode

Stripe provides a full parallel test environment. Your test API keys (`sk_test_...`) hit the test environment.

```js
// Detect test mode
const isTestMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
```

### Test Cards

| Card Number          | Scenario                          |
| -------------------- | --------------------------------- |
| `4242 4242 4242 4242` | Success                           |
| `4000 0000 0000 3220` | 3D Secure required                |
| `4000 0000 0000 9995` | Payment fails (insufficient funds)|
| `4000 0000 0000 0341` | Attaching fails                   |
| `4000 0025 0000 3155` | Requires authentication on all txns |
| `4000 0000 0000 0002` | Card declined                     |

**Expiry:** Any future date. **CVC:** Any 3 digits. **ZIP:** Any valid format.

### Stripe CLI for Local Webhook Testing

```bash
# Install
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/webhooks/stripe

# The CLI prints a webhook signing secret (whsec_...) — use it locally
# > Ready! Your webhook signing secret is whsec_xxx

# Trigger specific events
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.updated

# Trigger with custom data
stripe trigger checkout.session.completed \
  --override checkout_session:metadata.user_id=test_123
```

### Integration Test Example

```js
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');

describe('Billing Integration', () => {
  let testCustomerId;
  let testSubscriptionId;

  before(async () => {
    // Create test customer
    // Create customer with a PaymentMethod (source/tok_visa is legacy)
    const pm = await stripe.paymentMethods.create({
      type: 'card',
      card: { token: 'tok_visa' },
    });
    const customer = await stripe.customers.create({
      email: 'test@example.com',
      payment_method: pm.id,
      invoice_settings: { default_payment_method: pm.id },
    });
    testCustomerId = customer.id;
  });

  after(async () => {
    // Cleanup
    if (testSubscriptionId) {
      await stripe.subscriptions.cancel(testSubscriptionId);
    }
    if (testCustomerId) {
      await stripe.customers.del(testCustomerId);
    }
  });

  it('should create a subscription', async () => {
    const subscription = await stripe.subscriptions.create({
      customer: testCustomerId,
      items: [{ price: 'price_test_monthly' }],
    });
    testSubscriptionId = subscription.id;

    assert.strictEqual(subscription.status, 'active');
    assert.strictEqual(subscription.items.data.length, 1);
  });

  it('should upgrade a subscription', async () => {
    const subscription = await stripe.subscriptions.retrieve(testSubscriptionId);
    const updated = await stripe.subscriptions.update(testSubscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: 'price_test_annual',
      }],
    });

    assert.strictEqual(updated.items.data[0].price.id, 'price_test_annual');
  });

  it('should cancel at period end', async () => {
    const updated = await stripe.subscriptions.update(testSubscriptionId, {
      cancel_at_period_end: true,
    });

    assert.strictEqual(updated.cancel_at_period_end, true);
    assert.strictEqual(updated.status, 'active'); // still active until period end
  });
});
```

### Testing Webhooks Programmatically

```js
const crypto = require('crypto');

function generateTestWebhookEvent(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);
  const signedPayload = `${timestamp}.${payloadString}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return {
    body: payloadString,
    headers: {
      'stripe-signature': `t=${timestamp},v1=${signature}`,
    },
  };
}
```

---

## Common Mistakes

### 1. Parsing JSON Before Webhooks

**Wrong:**
```js
app.use(express.json());  // This parses ALL requests including webhooks
app.post('/webhooks/stripe', handleWebhook);  // Signature verification WILL FAIL
```

**Right:**
```js
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), handleWebhook);
app.use(express.json());  // After webhook route
```

### 2. Provisioning on Success URL Instead of Webhooks

**Wrong:**
```js
app.get('/success', async (req, res) => {
  await activateSubscription(req.query.session_id);  // User closes tab = no provisioning
});
```

**Right:** Provision in `checkout.session.completed` webhook. Success URL is just a thank-you page.

### 3. Not Handling Idempotency

**Wrong:**
```js
case 'checkout.session.completed':
  await createAccount(data);  // Duplicate event = duplicate account!
```

**Right:** Check `processed_events` table before acting. Use `INSERT ... ON CONFLICT DO NOTHING` or similar.

### 4. Storing API Keys in Plaintext

**Wrong:**
```sql
INSERT INTO api_keys (key) VALUES ('sk_live_actual_key_here');
```

**Right:** Store SHA-256 hash. Show the key once at creation. User must regenerate if lost.

### 5. Not Pinning Stripe API Version

**Wrong:**
```js
const stripe = require('stripe')(key);  // Uses latest version — may break unexpectedly
```

**Right:**
```js
const stripe = require('stripe')(key, { apiVersion: '2026-06-24.dahlia' });
```

### 6. Ignoring `past_due` Status

If a payment fails, the subscription goes `past_due`. Many apps only check for `active` and immediately cut off access. This frustrates customers who just have an expired card.

**Right:** Implement grace periods. Send dunning emails. Give them time to update payment info.

### 7. Not Expanding Objects in Webhook Handlers

```js
// The webhook event only contains IDs, not full objects
// If you need product metadata, retrieve with expand:
const subscription = await stripe.subscriptions.retrieve(data.id, {
  expand: ['items.data.price.product'],
});
```

### 8. Hardcoding Price IDs

**Wrong:**
```js
const PRICE_ID = 'price_1234567890';  // Breaks between test/live, fragile
```

**Right:** Use environment variables, lookup keys, or metadata:
```js
const prices = await stripe.prices.list({
  lookup_keys: ['pro_monthly'],
  limit: 1,
});
const priceId = prices.data[0].id;
```

### 9. Not Handling Trial Expiration

Trials end and `customer.subscription.updated` fires with `status: 'active'` (if payment succeeds) or `status: 'past_due'` (if it fails). Many devs forget to handle the failure case, leaving trialing users with indefinite free access.

### 10. Race Conditions Between Webhooks

Stripe doesn't guarantee event ordering. You might receive `customer.subscription.updated` before `checkout.session.completed`. Design handlers to be independent and idempotent.

---

## Complete Express.js Server Example

Putting it all together — a **runnable end-to-end demo**. It wires up every flow above, but it deliberately uses in-memory `Map`/`Set` stores so you can run it without a database. **This is not production-safe as written:** restarting the process drops all idempotency records and billing state, so duplicate webhooks would re-provision and re-bill. For production, replace the in-memory stores with the Postgres schema and transactional handlers shown earlier (`users`, `api_keys`, `processed_events`), and follow this webhook architecture:

1. **Verify** the Stripe signature (authentication).
2. **Persist** the event id (`INSERT ... ON CONFLICT DO NOTHING`) to dedupe.
3. **Enqueue** the work (durable queue / outbox) and return `200` fast.
4. **Process idempotently** in a worker; **re-fetch** the current Stripe object (`subscriptions.retrieve`, etc.) as the source of truth rather than trusting possibly-stale or out-of-order payload fields.
5. **Reconcile** periodically — list recent Stripe events / objects and repair any your handler missed (Stripe only retries for a limited window).

```js
// server.js — Complete SaaS Billing DEMO (in-memory stores; swap for Postgres in prod)
require('dotenv').config();
const express = require('express');
const crypto = require('crypto');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-06-24.dahlia',
  maxNetworkRetries: 2,
});

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WEBHOOK ENDPOINT — MUST be before express.json()
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error(`Webhook sig failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      // Idempotency check (use your DB in production)
      if (processedEvents.has(event.id)) {
        return res.status(200).json({ received: true });
      }

      await routeEvent(event);

      // Mark as processed AFTER success. If we add it before and
      // processing fails, Stripe retries will be silently ignored.
      processedEvents.add(event.id);
      res.status(200).json({ received: true });
    } catch (err) {
      console.error(`Error processing ${event.type} (${event.id}):`, err);
      // Don't add to processedEvents — let Stripe retry
      res.status(500).json({ error: 'Processing failed' });
    }
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// JSON parsing for all other routes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(express.json());

// In-memory store (replace with DB in production)
const users = new Map();
const apiKeys = new Map();
const processedEvents = new Set();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHECKOUT — Create session
// ⚠️  In production, protect this route with authentication middleware.
//     Never trust userId from the request body alone — derive it from
//     the authenticated session (e.g., req.user.id from JWT/session).
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post('/billing/checkout', requireAuth, async (req, res) => {
  const { priceId, email } = req.body;
  const userId = req.user.id; // from auth middleware — never from body

  // Get or create Stripe customer
  let user = users.get(userId);
  let customerId = user?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { user_id: userId },
    });
    customerId = customer.id;
    users.set(userId, { ...user, stripe_customer_id: customerId });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: { user_id: userId },
    },
    success_url: `${BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/pricing`,
    allow_promotion_codes: true,
  });

  res.json({ url: session.url, sessionId: session.id });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BILLING PORTAL
// ⚠️  Always authenticate — customerId from the body is attacker-controlled.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post('/billing/portal', requireAuth, async (req, res) => {
  // Look up the customer from the authenticated user, not from body
  const user = users.get(req.user.id);
  if (!user?.stripe_customer_id) {
    return res.status(400).json({ error: 'No billing account found' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${BASE_URL}/dashboard`,
  });

  res.json({ url: session.url });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WEBHOOK EVENT ROUTER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function routeEvent(event) {
  const obj = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      if (obj.mode !== 'subscription') break;

      // Retrieve the subscription once (with expansion) instead of twice
      const sub = await stripe.subscriptions.retrieve(obj.subscription, {
        expand: ['items.data.price.product'],
      });

      const userId = obj.metadata?.user_id || sub.metadata?.user_id;

      if (!userId) {
        console.error('checkout.session.completed: no user_id in metadata');
        break;
      }

      const baseItem = sub.items.data.length === 1
        ? sub.items.data[0]
        : sub.items.data.find((it) => it.price.recurring?.usage_type !== 'metered') || sub.items.data[0];
      const plan = baseItem.price.product?.metadata?.tier || 'pro';

      users.set(userId, {
        ...users.get(userId),
        stripe_customer_id: obj.customer,
        stripe_subscription_id: sub.id,
        plan,
        status: sub.status,
        current_period_end: periodEnd(sub),
      });

      // Provision API key
      const apiKey = generateApiKey();
      const keyHash = hashKey(apiKey);
      apiKeys.set(keyHash, { userId, plan, active: true });
      // Never log the full API key — log only the prefix
      console.log(`Provisioned user ${userId} on ${plan}. API key: ${apiKey.substring(0, 10)}...`);
      break;
    }

    case 'customer.subscription.updated': {
      const userId = findUserByCustomer(obj.customer);
      if (!userId) break;

      // basil+ moved current_period_end onto subscription items; re-fetch the
      // subscription so the items (with their period fields) are available.
      const sub = await stripe.subscriptions.retrieve(obj.id);

      const user = users.get(userId);
      users.set(userId, {
        ...user,
        status: obj.status,
        current_period_end: periodEnd(sub),
        cancel_at_period_end: obj.cancel_at_period_end,
      });

      // Handle pause / resume
      if (obj.pause_collection) {
        revokeKeysForUser(userId);
        console.log(`Subscription paused for ${userId}`);
      } else if (event.data.previous_attributes?.pause_collection) {
        // Was paused, now resumed — restore API keys
        const apiKey = generateApiKey();
        const keyHash = hashKey(apiKey);
        apiKeys.set(keyHash, { userId, plan: user?.plan || 'pro', active: true });
        console.log(`Subscription resumed for ${userId}, new API key provisioned`);
      }

      console.log(`Subscription updated for ${userId}: ${obj.status}`);
      break;
    }

    case 'customer.subscription.deleted': {
      const userId = findUserByCustomer(obj.customer);
      if (!userId) break;

      users.set(userId, {
        ...users.get(userId),
        status: 'canceled',
        plan: 'free',
        stripe_subscription_id: null,
      });

      revokeKeysForUser(userId);
      console.log(`Subscription canceled for ${userId}`);
      break;
    }

    case 'invoice.payment_succeeded': {
      if (obj.billing_reason === 'subscription_create') break;

      const userId = findUserByCustomer(obj.customer);
      if (!userId) break;

      users.set(userId, {
        ...users.get(userId),
        status: 'active',
        failed_payments: 0,
      });

      console.log(`Renewal succeeded for ${userId}`);
      break;
    }

    case 'invoice.payment_failed': {
      const userId = findUserByCustomer(obj.customer);
      if (!userId) break;

      const user = users.get(userId);
      const failCount = (user?.failed_payments || 0) + 1;

      users.set(userId, {
        ...user,
        status: 'past_due',
        failed_payments: failCount,
      });

      console.log(`Payment failed for ${userId} (attempt ${failCount})`);
      // Send dunning email here
      break;
    }

    case 'customer.subscription.trial_will_end': {
      const userId = findUserByCustomer(obj.customer);
      console.log(`Trial ending soon for ${userId}`);
      // Send trial ending email
      break;
    }

    default:
      console.log(`Unhandled: ${event.type}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function generateApiKey(prefix = 'myapp_live') { // product-specific, never `sk_`
  return `${prefix}_${crypto.randomBytes(32).toString('hex')}`;
}

// basil+ removed current_period_end from the Subscription object; read it from
// the base (non-metered) subscription item instead.
function periodEnd(subscription) {
  const item = subscription.items.data.find(
    (it) => it.price.recurring?.usage_type !== 'metered'
  ) || subscription.items.data[0];
  return item.current_period_end;
}

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function findUserByCustomer(customerId) {
  for (const [userId, user] of users) {
    if (user.stripe_customer_id === customerId) return userId;
  }
  return null;
}

function revokeKeysForUser(userId) {
  for (const [hash, data] of apiKeys) {
    if (data.userId === userId) {
      data.active = false;
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API KEY AUTH MIDDLEWARE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function authenticateKey(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  const key = auth.slice(7);
  const hash = hashKey(key);
  const keyData = apiKeys.get(hash);

  if (!keyData || !keyData.active) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const user = users.get(keyData.userId);
  if (!user || !['active', 'trialing'].includes(user.status)) {
    return res.status(402).json({ error: 'Subscription inactive' });
  }

  req.userId = keyData.userId;
  req.plan = user.plan;
  next();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROTECTED API ENDPOINT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/v1/data', authenticateKey, (req, res) => {
  res.json({
    message: 'Authenticated!',
    userId: req.userId,
    plan: req.plan,
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// START
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.listen(PORT, () => {
  console.log(`Billing server on port ${PORT}`);
  console.log(`Test mode: ${process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ?? 'unknown'}`);
});
```

---

## Quick Reference: Webhook Events Cheat Sheet

| Event | When | Action |
|-------|------|--------|
| `checkout.session.completed` | Customer completes Checkout | **Provision access** |
| `customer.subscription.created` | Subscription created | Store subscription ID |
| `customer.subscription.updated` | Plan change, pause, trial end | Update plan/status |
| `customer.subscription.deleted` | Subscription fully canceled | **Revoke access** |
| `customer.subscription.trial_will_end` | 3 days before trial ends | Send reminder email |
| `invoice.payment_succeeded` | Payment collected | Extend access period |
| `invoice.payment_failed` | Payment failed | Start dunning flow |
| `invoice.upcoming` | ~3 days before next invoice | Send usage summary |

---

## Decision Flowchart

```
New customer wants to subscribe
  → Create Checkout Session (mode: 'subscription')
  → Customer completes payment
  → Webhook: checkout.session.completed
  → Provision access + generate API key
  → Store subscription ID in your DB

Customer wants to change plan
  → stripe.subscriptions.update() with new price
  → Webhook: customer.subscription.updated
  → Update plan in your DB

Payment fails
  → Webhook: invoice.payment_failed
  → Send dunning email with portal link
  → Grace period (7 days)
  → If still unpaid → revoke access

Customer cancels
  → stripe.subscriptions.update({ cancel_at_period_end: true })
  → Webhook: customer.subscription.updated (cancel_at_period_end: true)
  → Show reactivation option in UI
  → At period end: customer.subscription.deleted
  → Webhook: customer.subscription.deleted
  → Revoke API keys, downgrade to free
```

---

## Checklist: Go-Live

- [ ] Webhook endpoint registered in Stripe Dashboard (not just CLI)
- [ ] Webhook signing secret in production env vars
- [ ] All essential events selected in webhook config
- [ ] Idempotency implemented (processed_events table)
- [ ] Raw body parsing before `express.json()`
- [ ] API version pinned
- [ ] Test mode cards verified for all flows
- [ ] Dunning emails configured
- [ ] Customer portal configured
- [ ] Grace period logic for failed payments
- [ ] API keys hashed in database
- [ ] Rate limiting on API and webhook endpoints
- [ ] Success URL does NOT provision (webhooks do)
- [ ] `metadata.user_id` set on checkout sessions and subscriptions
- [ ] Error monitoring/alerting on webhook failures
- [ ] Stripe CLI webhook forwarding tested locally
