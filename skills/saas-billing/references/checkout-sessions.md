## Contents

- Checkout Sessions
- Payment Mode (One-Time)
- Subscription Mode
- Hybrid Subscription (Base + Metered)
- Success URL: Retrieving the Session

## Checkout Sessions

Checkout Sessions are the **correct** way to collect payment. Don't build custom forms unless you have a very good reason.

### Payment Mode (One-Time)

```js
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  customer: customerId,         // optional: attach to existing customer
  line_items: [
    {
      price: 'price_xxx',
      quantity: 1,
    },
  ],
  success_url: `${BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${BASE_URL}/billing/cancel`,
});
```

### Subscription Mode

```js
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer: customerId,
  line_items: [
    {
      price: 'price_pro_monthly',
      quantity: 1,
    },
  ],
  subscription_data: {
    trial_period_days: 14,
    metadata: {
      user_id: userId,
      plan: 'pro',
    },
  },
  success_url: `${BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${BASE_URL}/pricing`,
  allow_promotion_codes: true,

  // ─── Stripe Tax (see "Stripe Tax" section below for full setup) ───
  automatic_tax: { enabled: true },          // calculate & collect tax automatically
  billing_address_collection: 'required',    // 'required' so Tax always has a location
  customer_update: { address: 'auto', name: 'auto' }, // persist collected address onto the Customer
  tax_id_collection: { enabled: true },      // collect B2B VAT/GST IDs (enables reverse-charge)
});
```

### Hybrid Subscription (Base + Metered)

```js
const session = await stripe.checkout.sessions.create({
  mode: 'subscription',
  customer: customerId,
  line_items: [
    {
      price: 'price_base_monthly',   // $49/month flat
      quantity: 1,
    },
    {
      price: 'price_api_metered',    // usage-based
      // no quantity for metered prices
    },
  ],
  success_url: `${BASE_URL}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${BASE_URL}/pricing`,
});
```

### Success URL: Retrieving the Session

**Critical:** `{CHECKOUT_SESSION_ID}` is a Stripe template literal — Stripe replaces it with the real session ID at redirect time.

```js
// GET /billing/success?session_id=cs_test_xxx
app.get('/billing/success', async (req, res) => {
  const { session_id } = req.query;

  if (!session_id) {
    return res.redirect('/pricing');
  }

  const session = await stripe.checkout.sessions.retrieve(session_id, {
    expand: ['subscription', 'customer'],
  });

  // Show confirmation page — but DO NOT provision here.
  // Provision in the webhook handler (checkout.session.completed).
  // The success page is just a "thank you" screen.

  res.render('billing-success', {
    customerEmail: session.customer_details?.email || session.customer_email,
    planName: session.subscription?.metadata?.plan || 'Pro',
  });
});
```

**Never provision access on the success URL.** Users can navigate away, close the tab, or the redirect can fail. Always provision in webhooks.

---
