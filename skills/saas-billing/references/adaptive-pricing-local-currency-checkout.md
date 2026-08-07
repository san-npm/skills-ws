## Contents

- Adaptive Pricing (Local-Currency Checkout)
- Enabling it
- Caveats & when NOT to use it

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
