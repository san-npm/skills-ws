## 7. Adaptive Pricing

Adaptive Pricing presents your single home-currency Price to international buyers in their **local currency** at Stripe-managed FX, so you don't maintain a Price per currency. It is **not** the same as multi-currency Prices (where you set explicit `currency_options` and bear FX yourself) — pick one model, not both, for a given Price.

- **Where it's configured:** Dashboard → Settings → **Adaptive Pricing** (account-level toggle). There is no per-request API flag — once enabled, eligible **Stripe-hosted Checkout** and the **Pricing Table** present localized amounts automatically.
- **When it applies:** Stripe-hosted Checkout Sessions / Payment Links / Pricing Tables, when Stripe can geolocate the buyer and the presentment currency differs from the Price currency. It does **not** apply to a self-hosted Payment Element flow like §1's direct-subscription path — that path always charges in the Price's currency. If you need localized presentment there, either move that flow to Checkout or define explicit `currency_options` on the Price.
- **Limitations:** settlement/payout is still in your account currency (buyers see local, you receive home minus FX); not all currencies/payment methods are eligible; it composes with Stripe Tax but the taxable amount follows the presentment currency. Interaction with coupons/trials can vary — verify in your account at <https://docs.stripe.com/payments/checkout/adaptive-pricing>.
- **How to test:** open a Checkout Session from a non-home locale (VPN or a browser `Accept-Language`/IP in another country) and confirm the displayed currency. Do this in test mode before enabling in live; don't confuse a localized presentment amount with having created a second Price.

---
