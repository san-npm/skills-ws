## Contents

- Event-Driven Lifecycle Automation (Implementation)
- Event naming & payload
- Idempotent sends (don't double-fire)
- Suppression & frequency caps
- Preference center (vs. single unsubscribe)
- QA test cases before enabling any journey

## Event-Driven Lifecycle Automation (Implementation)

Timer-based drips are the floor. Production lifecycle messaging fires on **product events** streamed from your app/backend into a lifecycle platform (Customer.io, Braze, Iterable, Loops, Klaviyo). Below is what separates a robust implementation from one that double-sends, spams, or violates consent.

### Event naming & payload

Use a stable, namespaced `object.action` convention in past tense, with a stable identifier and the attributes the message and its filters need:

```jsonc
// POST to your ESP's track API, e.g. customer.io / segment
{
  "userId": "usr_8f3c...",            // stable internal ID, NOT email (emails change)
  "event": "checkout.abandoned",       // namespace.action, past tense, snake or dot case
  "messageId": "evt_2026-06-07_ab12",  // idempotency key — see below
  "timestamp": "2026-06-07T14:22:05Z",
  "properties": {
    "cart_id": "cart_771",
    "cart_value": 128.50,
    "currency": "USD",
    "items": [{ "sku": "SKU-1", "name": "Widget", "qty": 1 }],
    "locale": "en-GB",
    "marketing_consent": true          // carry consent so a journey can hard-gate on it
  }
}
```

Canonical lifecycle events worth instrumenting: `user.signed_up`, `email.verified`, `onboarding.step_completed`, `activation.key_action` (the one action correlated with retention), `trial.started` / `trial.ending` / `trial.expired`, `checkout.started` / `checkout.abandoned` / `order.placed`, `subscription.renewed` / `payment.failed` / `subscription.canceled`, `feature.adopted`, `session.inactive_30d`.

### Idempotent sends (don't double-fire)

Webhooks and queues retry; clients fire events twice. Without protection a flaky retry sends the same "abandoned cart" email three times.

- **Idempotency key per send:** derive a deterministic key (e.g. `userId + journey + cart_id`) and have the platform/your worker dedupe on it. Most ESP transactional APIs accept an `Idempotency-Key` header — use it.
- **Cancel/exit conditions:** the abandoned-cart journey MUST listen for `order.placed` and exit immediately, or you'll email "you forgot something!" to someone who just bought it. Define an explicit exit event for every triggered journey.
- **Re-entry guard:** prevent re-entering the same journey for N days (e.g. one cart-recovery series per cart, or per 7 days per user).

### Suppression & frequency caps

- **Global suppression list:** hard bounces, unsubscribes, spam complainers, and role/blocklisted addresses are suppressed across *all* sends — including from other tools. Sync it everywhere.
- **Frequency cap:** e.g. "max 1 marketing email / 24h and 4 / 7 days per user." Transactional mail (receipts, password resets, security) bypasses caps; promotional mail respects them.
- **Quiet hours / time-zone send:** suppress promotional sends 9pm–8am local; let transactional through.
- **Consent gate:** marketing journeys check `marketing_consent == true` at send time, not just at enrollment (consent can be withdrawn mid-journey — honor it live).
- **Cross-journey priority:** if a user qualifies for two journeys at once (e.g. cart recovery + weekly digest), define which wins so they don't get both in the same hour.

### Preference center (vs. single unsubscribe)

Offer granular opt-down, not just all-or-nothing — it cuts hard unsubscribes and spam complaints:

```
[ ] Product updates & new features      (weekly)
[ ] Tips & best practices               (biweekly)
[ ] Promotions & offers                 (occasional)
[ ] Account & billing  (transactional — cannot be turned off)
[ Unsubscribe from all marketing ]   ← must still exist and be honored
```

Persist preferences against the stable user ID; the RFC 8058 one-click header still unsubscribes globally from marketing regardless of the granular center.

### QA test cases before enabling any journey

- [ ] Trigger fires on the real event in staging (open *Show original* in Gmail; confirm SPF/DKIM/DMARC pass)
- [ ] Exit/cancel event removes the user mid-journey (e.g. purchase cancels cart series)
- [ ] Duplicate event within the dedupe window sends **once**, not twice
- [ ] User with `marketing_consent=false` (and suppressed users) receive **nothing**
- [ ] Frequency cap blocks the Nth send when another journey already sent today
- [ ] All merge tags render with real data AND degrade gracefully when a field is missing (no "Hi {{first_name}}")
- [ ] Time-zone/quiet-hours logic delays correctly for a non-UTC test user
- [ ] One-click unsubscribe POST actually suppresses and returns 200 without a login
- [ ] Links use the custom tracking domain and resolve; no broken/`localhost` URLs

---
