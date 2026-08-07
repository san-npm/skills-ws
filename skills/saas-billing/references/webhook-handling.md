## Contents

- Webhook Handling
- The #1 Rule: Raw Body BEFORE express.json()
- Signature Verification
- Idempotency
- Essential Webhook Events
- Event Handlers — Complete Implementations

## Webhook Handling

This is the most critical section. **Get this wrong and you'll lose money, break provisioning, or create security holes.**

### The #1 Rule: Raw Body BEFORE express.json()

Stripe webhook signature verification requires the **raw request body**. If `express.json()` parses it first, the signature check will **always fail**.

```js
const express = require('express');
// Always pin your API version — see "Stripe Client Initialization" above.
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-06-24.dahlia',
});

const app = express();

// ┌─────────────────────────────────────────────────────────┐
// │  WEBHOOK ROUTE MUST BE REGISTERED BEFORE express.json() │
// └─────────────────────────────────────────────────────────┘

// Option A: Register webhook route with raw body parser FIRST
app.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  handleStripeWebhook
);

// THEN apply JSON parsing to everything else
app.use(express.json());

// Option B: If you can't control route order, use a custom verify function
// app.use(express.json({
//   verify: (req, res, buf) => {
//     if (req.originalUrl === '/webhooks/stripe') {
//       req.rawBody = buf;
//     }
//   },
// }));
```

### Signature Verification

```js
async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Process the event BEFORE responding — if you respond 200 first and
  // processing fails, Stripe won't retry and the event is silently lost.
  try {
    await processWebhookEvent(event);
    res.status(200).json({ received: true });
  } catch (err) {
    console.error(`Error processing webhook ${event.id}: ${err.message}`);
    res.status(500).json({ error: 'Processing failed' });
    // Stripe will retry on non-2xx responses
  }
}
```

### Idempotency

Stripe may send the same event **multiple times**. Your handler MUST be idempotent.

```js
async function processWebhookEvent(event) {
  // Atomically insert-or-skip to avoid TOCTOU race between SELECT and INSERT.
  // If two identical events arrive concurrently, only one will proceed.
  const result = await db.query(
    `INSERT INTO processed_events (stripe_event_id, event_type, processed_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (stripe_event_id) DO NOTHING
     RETURNING id`,
    [event.id, event.type]
  );

  if (result.rows.length === 0) {
    console.log(`Event ${event.id} already processed, skipping.`);
    return;
  }

  // Process the event
  await handleEvent(event);
}
```

**Database schema for idempotency:**

```sql
CREATE TABLE processed_events (
  id SERIAL PRIMARY KEY,
  stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Clean up old events periodically (keep 90 days)
CREATE INDEX idx_processed_events_date ON processed_events (processed_at);
```

### Essential Webhook Events

```js
async function handleEvent(event) {
  const data = event.data.object;

  switch (event.type) {
    // ─── Checkout ──────────────────────────────────────────
    case 'checkout.session.completed': {
      await handleCheckoutCompleted(data);
      break;
    }

    // ─── Subscription Lifecycle ────────────────────────────
    case 'customer.subscription.created': {
      await handleSubscriptionCreated(data);
      break;
    }

    case 'customer.subscription.updated': {
      // previous_attributes lives on event.data, NOT on event.data.object.
      // Pass it as a second argument so the handler can detect what changed.
      await handleSubscriptionUpdated(data, event.data.previous_attributes || {});
      break;
    }

    case 'customer.subscription.deleted': {
      await handleSubscriptionDeleted(data);
      break;
    }

    // ─── Invoices & Payments ───────────────────────────────
    case 'invoice.payment_succeeded': {
      await handleInvoicePaymentSucceeded(data);
      break;
    }

    case 'invoice.payment_failed': {
      await handleInvoicePaymentFailed(data);
      break;
    }

    // ─── Optional but Recommended ──────────────────────────
    case 'customer.subscription.trial_will_end': {
      // Fires 3 days before trial ends — send reminder email
      await handleTrialEnding(data);
      break;
    }

    case 'invoice.upcoming': {
      // Fires ~3 days before next invoice — good for usage summary emails
      await handleUpcomingInvoice(data);
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}
```

### Event Handlers — Complete Implementations

```js
// NOTE: these handlers reuse the periodEnd() helper from "Upgrade / Downgrade"
// above. basil+ removed current_period_end from the Subscription object, so it
// must be read from the subscription items.

// ─── checkout.session.completed ────────────────────────────
// This is your PRIMARY provisioning trigger.
async function handleCheckoutCompleted(session) {
  if (session.mode === 'subscription') {
    const subscription = await stripe.subscriptions.retrieve(
      session.subscription,
      { expand: ['items.data.price.product'] }
    );

    const customerId = session.customer;
    const userId = session.metadata?.user_id
      || subscription.metadata?.user_id;

    if (!userId) {
      console.error('No user_id in checkout session metadata!');
      return;
    }

    // Resolve the tier from the BASE (non-metered) item, not blindly data[0] —
    // a hybrid sub also has a metered item whose product carries no tier.
    const baseItem = subscription.items.data.length === 1
      ? subscription.items.data[0]
      : subscription.items.data.find((it) => it.price.recurring?.usage_type !== 'metered')
        || subscription.items.data[0];
    const tier = baseItem.price.product?.metadata?.tier || 'pro';

    // Provision access
    await db.query(
      `UPDATE users SET
        stripe_customer_id = $1,
        stripe_subscription_id = $2,
        plan = $3,
        subscription_status = $4,
        current_period_end = to_timestamp($5)
      WHERE id = $6`,
      [
        customerId,
        subscription.id,
        tier,
        subscription.status,
        periodEnd(subscription),
        userId,
      ]
    );

    // Generate API key if this is a new subscription
    await provisionApiKey(userId);

    console.log(`Provisioned subscription for user ${userId}`);
  }

  if (session.mode === 'payment') {
    // One-time payment — fulfill the order
    const userId = session.metadata?.user_id;
    await fulfillOneTimePayment(userId, session);
  }
}

// ─── customer.subscription.created ─────────────────────────
async function handleSubscriptionCreated(subscription) {
  // Often redundant with checkout.session.completed,
  // but useful for subscriptions created via API (not Checkout).
  const userId = await getUserByCustomerId(subscription.customer);
  if (!userId) return;

  await db.query(
    `UPDATE users SET
      stripe_subscription_id = $1,
      subscription_status = $2,
      current_period_end = to_timestamp($3)
    WHERE id = $4`,
    [subscription.id, subscription.status, periodEnd(subscription), userId]
  );
}

// ─── customer.subscription.updated ─────────────────────────
// Fires on: plan change, status change, trial end, pause, resume, etc.
// NOTE: This handler receives both the subscription object AND previousAttributes
// because previous_attributes lives on event.data, not on the object itself.
// The caller (handleEvent) must pass it separately — see below.
async function handleSubscriptionUpdated(subscription, previousAttributes = {}) {
  const userId = await getUserByCustomerId(subscription.customer);
  if (!userId) return;

  // Detect plan change. The webhook payload's price.product is usually just a
  // STRING id (not expanded), so re-fetch with expansion to read real metadata
  // and resolve the base (non-metered) item rather than blindly using data[0].
  let newTier = null;
  if (previousAttributes.items) {
    const full = await stripe.subscriptions.retrieve(subscription.id, {
      expand: ['items.data.price.product'],
    });
    const baseItem = full.items.data.length === 1
      ? full.items.data[0]
      : full.items.data.find((it) => it.price.recurring?.usage_type !== 'metered')
        || full.items.data[0];
    newTier = baseItem.price.product?.metadata?.tier || null;
    console.log(`User ${userId} changed plan; tier=${newTier ?? 'unknown'}`);
  }

  // Detect cancellation scheduled
  if (subscription.cancel_at_period_end) {
    console.log(`User ${userId} scheduled cancellation`);
    // Send retention email, show reactivation option
  }

  // Detect pause
  if (subscription.pause_collection) {
    console.log(`User ${userId} paused subscription`);
    await revokeApiKey(userId);
  } else if (previousAttributes.pause_collection) {
    console.log(`User ${userId} resumed subscription`);
    await provisionApiKey(userId);
  }

  // Always update local state. Use COALESCE so a NULL plan (this update wasn't a
  // plan change, or metadata was absent) does NOT erase the stored plan.
  await db.query(
    `UPDATE users SET
      subscription_status = $1,
      current_period_end = to_timestamp($2),
      plan = COALESCE($3, plan),
      cancel_at_period_end = $4
    WHERE stripe_customer_id = $5`,
    [
      subscription.status,
      periodEnd(subscription),
      newTier || subscription.metadata?.plan || null,
      subscription.cancel_at_period_end,
      subscription.customer,
    ]
  );
}

// ─── customer.subscription.deleted ─────────────────────────
// Subscription is fully cancelled / ended.
async function handleSubscriptionDeleted(subscription) {
  const userId = await getUserByCustomerId(subscription.customer);
  if (!userId) return;

  // Revoke all access
  await db.query(
    `UPDATE users SET
      subscription_status = 'canceled',
      plan = 'free',
      stripe_subscription_id = NULL
    WHERE id = $1`,
    [userId]
  );

  // Revoke API keys
  await revokeApiKey(userId);

  console.log(`Subscription deleted for user ${userId}, access revoked.`);
}

// ─── invoice.payment_succeeded ─────────────────────────────
// Fires on every successful payment (initial + renewals).
async function handleInvoicePaymentSucceeded(invoice) {
  // Only process renewal invoices. Skip initial creation (handled by
  // checkout.session.completed) and other non-cycle reasons like
  // subscription_update, subscription_threshold, manual, etc.
  if (invoice.billing_reason !== 'subscription_cycle') {
    return;
  }

  // Renewal payment — extend access
  const userId = await getUserByCustomerId(invoice.customer);
  if (!userId) return;

  // basil+ removed invoice.subscription; the subscription id now lives under
  // invoice.parent.subscription_details (check parent.type first).
  const subId = invoice.parent?.type === 'subscription_details'
    ? invoice.parent.subscription_details.subscription
    : null;
  if (!subId) return;
  const subscription = await stripe.subscriptions.retrieve(subId);

  await db.query(
    `UPDATE users SET
      subscription_status = 'active',
      current_period_end = to_timestamp($1),
      failed_payment_count = 0
    WHERE id = $2`,
    [periodEnd(subscription), userId]
  );

  console.log(`Renewal payment succeeded for user ${userId}`);
}

// ─── invoice.payment_failed ────────────────────────────────
async function handleInvoicePaymentFailed(invoice) {
  const userId = await getUserByCustomerId(invoice.customer);
  if (!userId) return;

  const attemptCount = invoice.attempt_count;

  await db.query(
    `UPDATE users SET
      subscription_status = 'past_due',
      failed_payment_count = $1
    WHERE id = $2`,
    [attemptCount, userId]
  );

  // Send dunning email based on attempt count
  if (attemptCount === 1) {
    await sendEmail(userId, 'payment-failed-first', {
      updatePaymentUrl: await createPortalSession(invoice.customer),
    });
  } else if (attemptCount === 2) {
    await sendEmail(userId, 'payment-failed-second', {
      updatePaymentUrl: await createPortalSession(invoice.customer),
      daysUntilCancellation: 7,
    });
  } else if (attemptCount >= 3) {
    await sendEmail(userId, 'payment-failed-final', {
      updatePaymentUrl: await createPortalSession(invoice.customer),
    });
    // Consider revoking access at this point
  }

  console.log(`Payment failed (attempt ${attemptCount}) for user ${userId}`);
}

// ─── Helper: Resolve user from Stripe customer ID ─────────
async function getUserByCustomerId(stripeCustomerId) {
  const result = await db.query(
    'SELECT id FROM users WHERE stripe_customer_id = $1',
    [stripeCustomerId]
  );
  return result.rows[0]?.id || null;
}
```

---
