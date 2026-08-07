## Complete Express.js Server Example

Putting it all together — a **runnable end-to-end demo**. It wires up every flow above, but it deliberately uses in-memory `Map`/`Set` stores so you can run it without a database. **This is not production-safe as written:** restarting the process drops all idempotency records and billing state, so duplicate webhooks would re-provision and re-bill. For production, replace the in-memory stores with the Postgres schema and transactional handlers shown earlier (`users`, `api_keys`, `processed_events`), and follow this webhook architecture:

1. **Verify** the Stripe signature (authentication).
2. **Persist** the event id (`INSERT ... ON CONFLICT DO NOTHING`) to dedupe.
3. **Enqueue** the work (durable queue / outbox) and return `200` fast.
4. **Process idempotently** in a worker; **re-fetch** the current Stripe object (`subscriptions.retrieve`, etc.) as the source of truth rather than trusting possibly-stale or out-of-order payload fields.
5. **Reconcile** periodically — list recent Stripe events / objects and repair any your handler missed (Stripe only retries for a limited window).

```js
// server.js — Complete SaaS Billing DEMO (in-memory stores; swap for Postgres in prod)
require('dotenv').config();
const express = require('express');
const crypto = require('crypto');

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-06-24.dahlia',
  maxNetworkRetries: 2,
});

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WEBHOOK ENDPOINT — MUST be before express.json()
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error(`Webhook sig failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      // Idempotency check (use your DB in production)
      if (processedEvents.has(event.id)) {
        return res.status(200).json({ received: true });
      }

      await routeEvent(event);

      // Mark as processed AFTER success. If we add it before and
      // processing fails, Stripe retries will be silently ignored.
      processedEvents.add(event.id);
      res.status(200).json({ received: true });
    } catch (err) {
      console.error(`Error processing ${event.type} (${event.id}):`, err);
      // Don't add to processedEvents — let Stripe retry
      res.status(500).json({ error: 'Processing failed' });
    }
  }
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// JSON parsing for all other routes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.use(express.json());

// In-memory store (replace with DB in production)
const users = new Map();
const apiKeys = new Map();
const processedEvents = new Set();

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CHECKOUT — Create session
// ⚠️  In production, protect this route with authentication middleware.
//     Never trust userId from the request body alone — derive it from
//     the authenticated session (e.g., req.user.id from JWT/session).
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post('/billing/checkout', requireAuth, async (req, res) => {
  const { priceId, email } = req.body;
  const userId = req.user.id; // from auth middleware — never from body

  // Get or create Stripe customer
  let user = users.get(userId);
  let customerId = user?.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email,
      metadata: { user_id: userId },
    });
    customerId = customer.id;
    users.set(userId, { ...user, stripe_customer_id: customerId });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: { user_id: userId },
    },
    success_url: `${BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${BASE_URL}/pricing`,
    allow_promotion_codes: true,
  });

  res.json({ url: session.url, sessionId: session.id });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// BILLING PORTAL
// ⚠️  Always authenticate — customerId from the body is attacker-controlled.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.post('/billing/portal', requireAuth, async (req, res) => {
  // Look up the customer from the authenticated user, not from body
  const user = users.get(req.user.id);
  if (!user?.stripe_customer_id) {
    return res.status(400).json({ error: 'No billing account found' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${BASE_URL}/dashboard`,
  });

  res.json({ url: session.url });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// WEBHOOK EVENT ROUTER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function routeEvent(event) {
  const obj = event.data.object;

  switch (event.type) {
    case 'checkout.session.completed': {
      if (obj.mode !== 'subscription') break;

      // Retrieve the subscription once (with expansion) instead of twice
      const sub = await stripe.subscriptions.retrieve(obj.subscription, {
        expand: ['items.data.price.product'],
      });

      const userId = obj.metadata?.user_id || sub.metadata?.user_id;

      if (!userId) {
        console.error('checkout.session.completed: no user_id in metadata');
        break;
      }

      const baseItem = sub.items.data.length === 1
        ? sub.items.data[0]
        : sub.items.data.find((it) => it.price.recurring?.usage_type !== 'metered') || sub.items.data[0];
      const plan = baseItem.price.product?.metadata?.tier || 'pro';

      users.set(userId, {
        ...users.get(userId),
        stripe_customer_id: obj.customer,
        stripe_subscription_id: sub.id,
        plan,
        status: sub.status,
        current_period_end: periodEnd(sub),
      });

      // Provision API key
      const apiKey = generateApiKey();
      const keyHash = hashKey(apiKey);
      apiKeys.set(keyHash, { userId, plan, active: true });
      // Never log the full API key — log only the prefix
      console.log(`Provisioned user ${userId} on ${plan}. API key: ${apiKey.substring(0, 10)}...`);
      break;
    }

    case 'customer.subscription.updated': {
      const userId = findUserByCustomer(obj.customer);
      if (!userId) break;

      // basil+ moved current_period_end onto subscription items; re-fetch the
      // subscription so the items (with their period fields) are available.
      const sub = await stripe.subscriptions.retrieve(obj.id);

      const user = users.get(userId);
      users.set(userId, {
        ...user,
        status: obj.status,
        current_period_end: periodEnd(sub),
        cancel_at_period_end: obj.cancel_at_period_end,
      });

      // Handle pause / resume
      if (obj.pause_collection) {
        revokeKeysForUser(userId);
        console.log(`Subscription paused for ${userId}`);
      } else if (event.data.previous_attributes?.pause_collection) {
        // Was paused, now resumed — restore API keys
        const apiKey = generateApiKey();
        const keyHash = hashKey(apiKey);
        apiKeys.set(keyHash, { userId, plan: user?.plan || 'pro', active: true });
        console.log(`Subscription resumed for ${userId}, new API key provisioned`);
      }

      console.log(`Subscription updated for ${userId}: ${obj.status}`);
      break;
    }

    case 'customer.subscription.deleted': {
      const userId = findUserByCustomer(obj.customer);
      if (!userId) break;

      users.set(userId, {
        ...users.get(userId),
        status: 'canceled',
        plan: 'free',
        stripe_subscription_id: null,
      });

      revokeKeysForUser(userId);
      console.log(`Subscription canceled for ${userId}`);
      break;
    }

    case 'invoice.payment_succeeded': {
      if (obj.billing_reason === 'subscription_create') break;

      const userId = findUserByCustomer(obj.customer);
      if (!userId) break;

      users.set(userId, {
        ...users.get(userId),
        status: 'active',
        failed_payments: 0,
      });

      console.log(`Renewal succeeded for ${userId}`);
      break;
    }

    case 'invoice.payment_failed': {
      const userId = findUserByCustomer(obj.customer);
      if (!userId) break;

      const user = users.get(userId);
      const failCount = (user?.failed_payments || 0) + 1;

      users.set(userId, {
        ...user,
        status: 'past_due',
        failed_payments: failCount,
      });

      console.log(`Payment failed for ${userId} (attempt ${failCount})`);
      // Send dunning email here
      break;
    }

    case 'customer.subscription.trial_will_end': {
      const userId = findUserByCustomer(obj.customer);
      console.log(`Trial ending soon for ${userId}`);
      // Send trial ending email
      break;
    }

    default:
      console.log(`Unhandled: ${event.type}`);
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function generateApiKey(prefix = 'myapp_live') { // product-specific, never `sk_`
  return `${prefix}_${crypto.randomBytes(32).toString('hex')}`;
}

// basil+ removed current_period_end from the Subscription object; read it from
// the base (non-metered) subscription item instead.
function periodEnd(subscription) {
  const item = subscription.items.data.find(
    (it) => it.price.recurring?.usage_type !== 'metered'
  ) || subscription.items.data[0];
  return item.current_period_end;
}

function hashKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function findUserByCustomer(customerId) {
  for (const [userId, user] of users) {
    if (user.stripe_customer_id === customerId) return userId;
  }
  return null;
}

function revokeKeysForUser(userId) {
  for (const [hash, data] of apiKeys) {
    if (data.userId === userId) {
      data.active = false;
    }
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API KEY AUTH MIDDLEWARE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function authenticateKey(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  const key = auth.slice(7);
  const hash = hashKey(key);
  const keyData = apiKeys.get(hash);

  if (!keyData || !keyData.active) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  const user = users.get(keyData.userId);
  if (!user || !['active', 'trialing'].includes(user.status)) {
    return res.status(402).json({ error: 'Subscription inactive' });
  }

  req.userId = keyData.userId;
  req.plan = user.plan;
  next();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROTECTED API ENDPOINT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.get('/api/v1/data', authenticateKey, (req, res) => {
  res.json({
    message: 'Authenticated!',
    userId: req.userId,
    plan: req.plan,
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// START
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
app.listen(PORT, () => {
  console.log(`Billing server on port ${PORT}`);
  console.log(`Test mode: ${process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') ?? 'unknown'}`);
});
```

---
