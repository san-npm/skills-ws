## Contents

- 8. Recovery, Reconciliation & Test Clocks
- Nightly reconciliation (catch drift / missed events)
- Test Clocks (simulate renewals, trials, dunning)

## 8. Recovery, Reconciliation & Test Clocks

Webhooks are the source of truth, but deliveries can be missed (downtime, a handler bug, a dropped 5xx). Add a periodic reconciliation sweep, and use Test Clocks to exercise time-dependent flows deterministically.

### Nightly reconciliation (catch drift / missed events)

```typescript
// scripts/reconcile.ts — run on a daily cron
import { stripe } from '../lib/stripe';
import { db } from '../lib/db';

async function reconcile() {
  // stripe-node list results are async-iterable and auto-paginate across pages.
  for await (const sub of stripe.subscriptions.list({ status: 'all', limit: 100 })) {
    const periodEnd = sub.items.data[0].current_period_end; // item, not subscription (Basil-line)
    await db.user.updateMany({
      where: { stripeCustomerId: sub.customer as string },
      data: {
        subscriptionStatus: sub.status,
        currentPeriodEnd: new Date(periodEnd * 1000),
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
    });
  }
}

reconcile().catch((e) => { console.error(e); process.exit(1); });
```

To re-drive missed events instead of polling state, list events and replay them through the same handler: `stripe.events.list({ type: 'customer.subscription.*' })` (Stripe retains events for 30 days) — the `ProcessedWebhook` claim in §4 makes replay safe and idempotent.

### Test Clocks (simulate renewals, trials, dunning)

Test Clocks let you fast-forward time so renewals, `trial_will_end`, and failed-payment retries fire on demand instead of waiting real days. Attach the customer to the clock **at creation**.

```typescript
// scripts/test-clock-renewal.ts (test mode only)
import { stripe } from '../lib/stripe';

async function run() {
  const clock = await stripe.testHelpers.testClocks.create({
    frozen_time: Math.floor(Date.now() / 1000),
    name: 'renewal test',
  });

  const customer = await stripe.customers.create({
    test_clock: clock.id,                 // must be set at creation; can't attach later
    payment_method: 'pm_card_visa',
    invoice_settings: { default_payment_method: 'pm_card_visa' },
  });

  const sub = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price: process.env.TEST_PRICE_ID! }],
    trial_period_days: 7,
  });

  // Jump to just after trial end → trial_will_end (3 days prior) + first renewal invoice fire.
  await stripe.testHelpers.testClocks.advance({
    id: clock.id,
    frozen_time: Math.floor(Date.now() / 1000) + 8 * 24 * 3600,
  });
  // Poll clock.status until 'ready', then assert your webhook handler updated the DB.
  console.log('Advanced clock for', sub.id);
}

run().catch((e) => { console.error(e); process.exit(1); });
```

> Method names are stripe-node `testHelpers.testClocks.*`; the underlying API is `/v1/test_helpers/test_clocks`. Test Clocks are test-mode only and a clock can advance at most ~2 years total.

---
