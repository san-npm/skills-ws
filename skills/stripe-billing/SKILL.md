---
name: stripe-billing
description: "Production Stripe billing on Next.js App Router: subscriptions, Billing Meters usage, idempotent webhooks, portal, Stripe Tax + Adaptive Pricing, migrations, Test Clocks. Pins apiVersion 2025-09-30.clover (Clover line). Use when building or reviewing Stripe subscription/usage billing in Next.js; for Express/Node see `saas-billing`."
---
# Stripe Billing

> Disambiguation: this skill = Next.js App Router + Server Actions. For Express/Node backends see `saas-billing`.

Production patterns for Stripe billing that handle the edge cases tutorials skip. Subscription lifecycle, usage-based billing, webhook idempotency, EU VAT, and price migrations.

**Critical principle:** Webhooks are your source of truth, not API responses. Always design for eventual consistency.

### Clover API invariants (this skill pins `2025-09-30.clover`)

`2025-09-30.clover` is the first release of the Clover major line (majors run Acacia, Basil, Clover, Dahlia; breaking changes are cumulative, so Clover inherits Basil's). The first three invariants below were introduced in `2025-03-31.basil`; the flexible `billing_mode` default is Clover's own change. The code below depends on these, so if you bump the version, re-verify at <https://docs.stripe.com/changelog>:

- **Initial subscription payment secret** lives at `latest_invoice.confirmation_secret.client_secret`, NOT `latest_invoice.payment_intent`. Expand `latest_invoice.confirmation_secret`. (`expand: ['latest_invoice.payment_intent']` returns nothing on this version.)
- **Billing period fields moved to the subscription item:** use `sub.items.data[0].current_period_end` / `current_period_start`. `sub.current_period_end` no longer exists. `billing_cycle_anchor` stays on the subscription.
- **Legacy usage-based billing is removed:** `aggregate_usage` and `billing_thresholds` are gone; `UsageRecord`/`UsageRecordSummary` endpoints are deleted. A metered price MUST reference a Billing Meter via `recurring.meter`. Report usage with `billing.meterEvents.create`. (Changelog: <https://docs.stripe.com/changelog/basil/2025-03-31/deprecate-legacy-usage-based-billing>)
- **`billing_mode: { type: 'flexible' }`** is the default for new subscriptions and is what enables `confirmation_secret`; set it explicitly so behavior is stable across version bumps.

---

## Safety gate

Before executing commands or changing external systems, confirm scope, credentials, target environment, rollback, and required approval. Pin and verify third-party artifacts; never expose secrets to client code or logs.

## Reference guide

Read only the references needed for the current request:

- **1. Setup**: [references/1-setup.md](references/1-setup.md)
- **2. Subscription Lifecycle**: [references/2-subscription-lifecycle.md](references/2-subscription-lifecycle.md)
- **3. Usage-Based Billing (Billing Meters)**: [references/3-usage-based-billing-billing-meters.md](references/3-usage-based-billing-billing-meters.md)
- **4. Webhook Handler — Production Grade**: [references/4-webhook-handler-production-grade.md](references/4-webhook-handler-production-grade.md)
- **5. Customer Portal**: [references/5-customer-portal.md](references/5-customer-portal.md)
- **6. Stripe Tax for EU VAT**: [references/6-stripe-tax-for-eu-vat.md](references/6-stripe-tax-for-eu-vat.md)
- **7. Adaptive Pricing**: [references/7-adaptive-pricing.md](references/7-adaptive-pricing.md)
- **8. Recovery, Reconciliation & Test Clocks**: [references/8-recovery-reconciliation-test-clocks.md](references/8-recovery-reconciliation-test-clocks.md)
- **9. Price Migration**: [references/9-price-migration.md](references/9-price-migration.md)
- **10. Testing**: [references/10-testing.md](references/10-testing.md)
- **11. Frontend Checkout**: [references/11-frontend-checkout.md](references/11-frontend-checkout.md)
- **12. Common Pitfalls**: [references/12-common-pitfalls.md](references/12-common-pitfalls.md)
