## Contents

- Common Mistakes
- 1. Parsing JSON Before Webhooks
- 2. Provisioning on Success URL Instead of Webhooks
- 3. Not Handling Idempotency
- 4. Storing API Keys in Plaintext
- 5. Not Pinning Stripe API Version
- 6. Ignoring pastdue Status
- 7. Not Expanding Objects in Webhook Handlers
- 8. Hardcoding Price IDs
- 9. Not Handling Trial Expiration
- 10. Race Conditions Between Webhooks

## Common Mistakes

### 1. Parsing JSON Before Webhooks

**Wrong:**
```js
app.use(express.json());  // This parses ALL requests including webhooks
app.post('/webhooks/stripe', handleWebhook);  // Signature verification WILL FAIL
```

**Right:**
```js
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), handleWebhook);
app.use(express.json());  // After webhook route
```

### 2. Provisioning on Success URL Instead of Webhooks

**Wrong:**
```js
app.get('/success', async (req, res) => {
  await activateSubscription(req.query.session_id);  // User closes tab = no provisioning
});
```

**Right:** Provision in `checkout.session.completed` webhook. Success URL is just a thank-you page.

### 3. Not Handling Idempotency

**Wrong:**
```js
case 'checkout.session.completed':
  await createAccount(data);  // Duplicate event = duplicate account!
```

**Right:** Check `processed_events` table before acting. Use `INSERT ... ON CONFLICT DO NOTHING` or similar.

### 4. Storing API Keys in Plaintext

**Wrong:**
```sql
INSERT INTO api_keys (key) VALUES ('sk_live_actual_key_here');
```

**Right:** Store SHA-256 hash. Show the key once at creation. User must regenerate if lost.

### 5. Not Pinning Stripe API Version

**Wrong:**
```js
const stripe = require('stripe')(key);  // Uses latest version — may break unexpectedly
```

**Right:**
```js
const stripe = require('stripe')(key, { apiVersion: '2026-06-24.dahlia' });
```

### 6. Ignoring `past_due` Status

If a payment fails, the subscription goes `past_due`. Many apps only check for `active` and immediately cut off access. This frustrates customers who just have an expired card.

**Right:** Implement grace periods. Send dunning emails. Give them time to update payment info.

### 7. Not Expanding Objects in Webhook Handlers

```js
// The webhook event only contains IDs, not full objects
// If you need product metadata, retrieve with expand:
const subscription = await stripe.subscriptions.retrieve(data.id, {
  expand: ['items.data.price.product'],
});
```

### 8. Hardcoding Price IDs

**Wrong:**
```js
const PRICE_ID = 'price_1234567890';  // Breaks between test/live, fragile
```

**Right:** Use environment variables, lookup keys, or metadata:
```js
const prices = await stripe.prices.list({
  lookup_keys: ['pro_monthly'],
  limit: 1,
});
const priceId = prices.data[0].id;
```

### 9. Not Handling Trial Expiration

Trials end and `customer.subscription.updated` fires with `status: 'active'` (if payment succeeds) or `status: 'past_due'` (if it fails). Many devs forget to handle the failure case, leaving trialing users with indefinite free access.

### 10. Race Conditions Between Webhooks

Stripe doesn't guarantee event ordering. You might receive `customer.subscription.updated` before `checkout.session.completed`. Design handlers to be independent and idempotent.

---
