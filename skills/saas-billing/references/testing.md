## Contents

- Testing
- Test Mode
- Test Cards
- Stripe CLI for Local Webhook Testing
- Integration Test Example
- Testing Webhooks Programmatically

## Testing

### Test Mode

Stripe provides a full parallel test environment. Your test API keys (`sk_test_...`) hit the test environment.

```js
// Detect test mode
const isTestMode = process.env.STRIPE_SECRET_KEY.startsWith('sk_test_');
```

### Test Cards

| Card Number          | Scenario                          |
| -------------------- | --------------------------------- |
| `4242 4242 4242 4242` | Success                           |
| `4000 0000 0000 3220` | 3D Secure required                |
| `4000 0000 0000 9995` | Payment fails (insufficient funds)|
| `4000 0000 0000 0341` | Attaching fails                   |
| `4000 0025 0000 3155` | Requires authentication on all txns |
| `4000 0000 0000 0002` | Card declined                     |

**Expiry:** Any future date. **CVC:** Any 3 digits. **ZIP:** Any valid format.

### Stripe CLI for Local Webhook Testing

```bash
# Install
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/webhooks/stripe

# The CLI prints a webhook signing secret (whsec_...) — use it locally
# > Ready! Your webhook signing secret is whsec_xxx

# Trigger specific events
stripe trigger checkout.session.completed
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.updated

# Trigger with custom data
stripe trigger checkout.session.completed \
  --override checkout_session:metadata.user_id=test_123
```

### Integration Test Example

```js
const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');

describe('Billing Integration', () => {
  let testCustomerId;
  let testSubscriptionId;

  before(async () => {
    // Create test customer
    // Create customer with a PaymentMethod (source/tok_visa is legacy)
    const pm = await stripe.paymentMethods.create({
      type: 'card',
      card: { token: 'tok_visa' },
    });
    const customer = await stripe.customers.create({
      email: 'test@example.com',
      payment_method: pm.id,
      invoice_settings: { default_payment_method: pm.id },
    });
    testCustomerId = customer.id;
  });

  after(async () => {
    // Cleanup
    if (testSubscriptionId) {
      await stripe.subscriptions.cancel(testSubscriptionId);
    }
    if (testCustomerId) {
      await stripe.customers.del(testCustomerId);
    }
  });

  it('should create a subscription', async () => {
    const subscription = await stripe.subscriptions.create({
      customer: testCustomerId,
      items: [{ price: 'price_test_monthly' }],
    });
    testSubscriptionId = subscription.id;

    assert.strictEqual(subscription.status, 'active');
    assert.strictEqual(subscription.items.data.length, 1);
  });

  it('should upgrade a subscription', async () => {
    const subscription = await stripe.subscriptions.retrieve(testSubscriptionId);
    const updated = await stripe.subscriptions.update(testSubscriptionId, {
      items: [{
        id: subscription.items.data[0].id,
        price: 'price_test_annual',
      }],
    });

    assert.strictEqual(updated.items.data[0].price.id, 'price_test_annual');
  });

  it('should cancel at period end', async () => {
    const updated = await stripe.subscriptions.update(testSubscriptionId, {
      cancel_at_period_end: true,
    });

    assert.strictEqual(updated.cancel_at_period_end, true);
    assert.strictEqual(updated.status, 'active'); // still active until period end
  });
});
```

### Testing Webhooks Programmatically

```js
const crypto = require('crypto');

function generateTestWebhookEvent(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const payloadString = JSON.stringify(payload);
  const signedPayload = `${timestamp}.${payloadString}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return {
    body: payloadString,
    headers: {
      'stripe-signature': `t=${timestamp},v1=${signature}`,
    },
  };
}
```

---
