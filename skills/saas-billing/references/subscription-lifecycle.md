## Contents

- Subscription Lifecycle
- Creating a Customer
- Trials
- Upgrade / Downgrade (Plan Changes)
- Seat Changes
- Cancellation
- Pausing Subscriptions

## Subscription Lifecycle

### Creating a Customer

```js
async function getOrCreateStripeCustomer(user) {
  if (user.stripe_customer_id) {
    return user.stripe_customer_id;
  }

  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name,
    metadata: {
      user_id: user.id,
    },
  });

  await db.query(
    'UPDATE users SET stripe_customer_id = $1 WHERE id = $2',
    [customer.id, user.id]
  );

  return customer.id;
}
```

### Trials

```js
// Via Checkout Session
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer: customerId,
  line_items: [{ price: priceId, quantity: 1 }],
  subscription_data: {
    trial_period_days: 14,
  },
  // Collect payment method upfront (card saved, charged after trial)
  payment_method_collection: 'always',
  success_url: `${BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${BASE_URL}/pricing`,
});

// Via API directly
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  trial_period_days: 14,
  payment_behavior: 'default_incomplete',
  // basil and later removed invoice.payment_intent; read the client secret from
  // subscription.latest_invoice.confirmation_secret.client_secret, and list
  // payments via the invoice.payments array if you need PaymentIntent records.
  expand: ['latest_invoice.confirmation_secret'],
});
```

### Upgrade / Downgrade (Plan Changes)

> **Never assume `items.data[0]` is "the plan".** Hybrid subscriptions (base +
> metered) have multiple items, and Stripe does not guarantee their order.
> Targeting the wrong item silently changes the metered item instead of the base
> price (or vice versa). Identify items explicitly — by `price.lookup_key`,
> product metadata, or a stored subscription-item id.

```js
// Resolve a specific subscription item by lookup_key (preferred) or by a
// predicate over its price/product. Falls back to throwing rather than guessing.
function findSubscriptionItem(subscription, { lookupKey, match } = {}) {
  const items = subscription.items.data;
  const found = items.find((it) =>
    (lookupKey && it.price.lookup_key === lookupKey) ||
    (match && match(it))
  );
  if (!found) {
    throw new Error(
      `No subscription item matched ${lookupKey ?? 'predicate'} ` +
      `on ${subscription.id} (has ${items.length} item(s))`
    );
  }
  return found;
}

// 2025-03-31.basil and later removed current_period_start/current_period_end
// from the Subscription object: they now live on each subscription item.
// Read the period end from the base (non-metered) item.
function periodEnd(subscription) {
  const item = subscription.items.data.find(
    (it) => it.price.recurring?.usage_type !== 'metered'
  ) || subscription.items.data[0];
  return item.current_period_end;
}

// Change the BASE plan item only, leaving any metered item untouched.
async function changePlan(subscriptionId, newPriceId, { prorate = true, lookupKey } = {}) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Pick the base item explicitly. If the sub has exactly one item, that's it;
  // otherwise require a lookupKey (or a metadata match) to be unambiguous.
  const target = subscription.items.data.length === 1
    ? subscription.items.data[0]
    : findSubscriptionItem(subscription, {
        lookupKey,
        match: (it) => it.price.recurring?.usage_type !== 'metered', // the flat/base item
      });

  return stripe.subscriptions.update(subscriptionId, {
    items: [{ id: target.id, price: newPriceId }],
    proration_behavior: prorate ? 'create_prorations' : 'none',
    // For period-end downgrades, prefer a Subscription Schedule (below) — calling
    // update() with proration_behavior: 'none' switches the price object NOW
    // (no immediate proration, but the new price is on the subscription already).
  });
}

// Upgrade immediately with proration (single-item sub)
await changePlan(subId, 'price_enterprise_monthly', { prorate: true });
// Hybrid sub: name the base item so the metered item isn't touched
await changePlan(subId, 'price_enterprise_monthly', { prorate: true, lookupKey: 'base_plan' });

// Downgrade at period end — use Subscription Schedules to defer the change.
// Simply calling subscriptions.update() with proration_behavior: 'none'
// still switches the price immediately (billing changes at next cycle, but
// the price object on the subscription changes right away).
async function downgradeAtPeriodEnd(subscriptionId, newPriceId) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const endTs = periodEnd(subscription); // item-level period end (basil+)

  // Create a schedule from the existing subscription
  const schedule = await stripe.subscriptionSchedules.create({
    from_subscription: subscriptionId,
  });

  // Update the schedule: keep current phase, add new phase at period end.
  // IMPORTANT: Use 'now' for start_date of the first phase, not
  // subscription.current_period_start — that timestamp is in the past,
  // and Stripe rejects past start_date values.
  await stripe.subscriptionSchedules.update(schedule.id, {
    end_behavior: 'release',
    phases: [
      {
        items: [{ price: subscription.items.data[0].price.id, quantity: 1 }],
        start_date: 'now',
        end_date: endTs,
      },
      {
        items: [{ price: newPriceId, quantity: 1 }],
        start_date: endTs,
        iterations: 1,
      },
    ],
  });
}
```

### Seat Changes

```js
// Update quantity on the per-seat item. Pass the seat item's lookup_key so this
// works on hybrid/multi-item subscriptions (metered items have no quantity).
async function updateSeats(subscriptionId, newQuantity, { lookupKey = 'per_seat' } = {}) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const seatItem = subscription.items.data.length === 1
    ? subscription.items.data[0]
    : findSubscriptionItem(subscription, { lookupKey });

  return stripe.subscriptionItems.update(seatItem.id, {
    quantity: newQuantity,
    proration_behavior: 'create_prorations',
  });
}
```

### Cancellation

```js
// Cancel at period end (recommended — user keeps access until paid period expires)
async function cancelAtPeriodEnd(subscriptionId) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

// Cancel immediately (rare — refund / abuse scenarios)
async function cancelImmediately(subscriptionId) {
  // `subscriptions.cancel` (DELETE) ends the subscription NOW. Its supported
  // options are `invoice_now` and `prorate` — NOT `proration_behavior`
  // (that belongs to subscriptions.update). Passing proration_behavior here
  // is ignored/invalid depending on API version.
  return stripe.subscriptions.cancel(subscriptionId, {
    invoice_now: true, // finalize any pending metered usage into a final invoice
    prorate: true,     // credit unused time as a proration on that final invoice
  });
  // `prorate: true`/`invoice_now: true` are the cancel-time flags. Immediate
  // cancellation does NOT auto-refund the customer — issue a refund or credit
  // note separately if you owe money back:
  //   await stripe.refunds.create({ payment_intent: '<pi_...>' });
}

// Alternative: schedule a hard cancel at a specific future timestamp without
// ending access now. Use cancel_at (a Unix timestamp) on update:
async function cancelAt(subscriptionId, unixTs) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at: unixTs,
    proration_behavior: 'none', // proration_behavior IS valid on update
  });
}

// Reactivate before period end
async function reactivateSubscription(subscriptionId) {
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}
```

### Pausing Subscriptions

Stripe supports pausing via `pause_collection`:

```js
// Pause — stop invoicing, keep subscription active
async function pauseSubscription(subscriptionId) {
  return stripe.subscriptions.update(subscriptionId, {
    pause_collection: {
      behavior: 'void',    // 'void' = skip invoices, 'keep_as_draft' = draft them
      // resumes_at: Math.floor(Date.now() / 1000) + 30 * 86400, // optional auto-resume
    },
  });
}

// Resume — set pause_collection to null (not empty string) to clear the pause
async function resumeSubscription(subscriptionId) {
  return stripe.subscriptions.update(subscriptionId, {
    pause_collection: null,
  });
}
```

**Decision:** Should paused users keep access? Usually no — revoke API keys / feature access on pause, restore on resume. Handle this in your webhook for `customer.subscription.updated`.

---
