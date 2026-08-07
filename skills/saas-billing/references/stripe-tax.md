## Contents

- Stripe Tax
- One-time account setup (Dashboard / API)
- Tax behavior & tax codes on Products/Prices
- Enabling Tax in Checkout
- Tax on API-created subscriptions and one-off invoices
- Testing tax

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
