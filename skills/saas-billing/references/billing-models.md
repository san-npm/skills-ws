## Contents

- Billing Models
- 1. Flat-Rate Subscription
- 2. Per-Seat / Per-Unit
- 3. Usage-Based (Metered)
- 4. Tiered Pricing
- 5. Hybrid

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
