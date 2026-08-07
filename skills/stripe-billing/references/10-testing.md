## Contents

- 10. Testing
- Test card numbers
- Integration tests

## 10. Testing

```bash
# Listen for webhooks locally
stripe listen --forward-to localhost:3000/api/webhooks/stripe

# Trigger events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.created
stripe trigger invoice.payment_failed
```

### Test card numbers

```
4242424242424242  — Success
4000000000003220  — 3D Secure required
4000000000009995  — Insufficient funds
4000000000000341  — Attach succeeds, charge fails
4000002500003155  — SCA required (EU)
```

### Integration tests

These hit Stripe's live **test**-mode API. Note the assertions: a freshly created subscription is rarely `'active'` synchronously — with `pm_card_visa` and no SCA it settles to `active`, but a card requiring SCA stays `incomplete` until confirmed. Assert against the set of acceptable states, not a single value. For time-dependent behavior (renewals, dunning), use Test Clocks (§8).

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { stripe } from '../lib/stripe';

const SETTLED = new Set(['active', 'trialing']);

describe('Billing', () => {
  let customerId: string | undefined;
  let subscriptionId: string | undefined;

  beforeAll(async () => {
    const customer = await stripe.customers.create({
      email: `test-${Date.now()}@example.com`,
      payment_method: 'pm_card_visa',
      invoice_settings: { default_payment_method: 'pm_card_visa' },
    });
    customerId = customer.id;
  });

  it('creates subscription', async () => {
    const sub = await stripe.subscriptions.create({
      customer: customerId!,
      items: [{ price: process.env.TEST_PRICE_ID! }],
      payment_behavior: 'default_incomplete',
      billing_mode: { type: 'flexible' },
      expand: ['latest_invoice.confirmation_secret'],
    });
    subscriptionId = sub.id;
    // No-SCA test card settles immediately; SCA cards stay 'incomplete' pending confirmation.
    expect(['active', 'trialing', 'incomplete']).toContain(sub.status);
  });

  it('upgrades', async () => {
    const sub = await stripe.subscriptions.retrieve(subscriptionId!);
    const updated = await stripe.subscriptions.update(subscriptionId!, {
      items: [{ id: sub.items.data[0].id, price: process.env.TEST_PRICE_PRO_ID! }],
      proration_behavior: 'always_invoice',
    });
    expect(updated.items.data[0].price.id).toBe(process.env.TEST_PRICE_PRO_ID);
  });

  it('cancels at period end', async () => {
    const updated = await stripe.subscriptions.update(subscriptionId!, { cancel_at_period_end: true });
    expect(updated.cancel_at_period_end).toBe(true);
    expect([...SETTLED, 'past_due', 'incomplete']).toContain(updated.status);
  });

  // Best-effort cleanup; guard each call so a failed setup step can't throw here.
  afterAll(async () => {
    if (subscriptionId) await stripe.subscriptions.cancel(subscriptionId).catch(() => {});
    if (customerId) await stripe.customers.del(customerId).catch(() => {});
  });
});
```

---
