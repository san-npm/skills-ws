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
