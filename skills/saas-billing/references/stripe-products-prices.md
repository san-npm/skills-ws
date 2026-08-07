## Contents

- Stripe Products & Prices
- Creating Products & Prices (API)
- Best Practices for Products & Prices

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
