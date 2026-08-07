## Contents

- Customer Portal
- Configuration
- Creating Portal Sessions

## Customer Portal

Let customers manage their own billing. Stripe's portal handles plan changes, payment methods, invoices, and cancellation.

### Configuration

```js
// Create portal configuration (do this once, store the ID)
const portalConfig = await stripe.billingPortal.configurations.create({
  business_profile: {
    headline: 'Manage your subscription',
    privacy_policy_url: 'https://yourapp.com/privacy',
    terms_of_service_url: 'https://yourapp.com/terms',
  },
  features: {
    customer_update: {
      enabled: true,
      allowed_updates: ['email', 'address', 'tax_id'],
    },
    subscription_cancel: {
      enabled: true,
      mode: 'at_period_end',
      cancellation_reason: {
        enabled: true,
        options: [
          'too_expensive',
          'missing_features',
          'switched_service',
          'unused',
          'other',
        ],
      },
    },
    subscription_update: {
      enabled: true,
      default_allowed_updates: ['price', 'quantity'],
      proration_behavior: 'create_prorations',
      products: [
        {
          product: 'prod_xxx',
          prices: ['price_monthly', 'price_annual'],
        },
      ],
    },
    payment_method_update: { enabled: true },
    invoice_history: { enabled: true },
  },
});

// Save portalConfig.id → STRIPE_PORTAL_CONFIG_ID
```

### Creating Portal Sessions

```js
app.post('/billing/portal', requireAuth, async (req, res) => {
  const user = req.user;

  if (!user.stripe_customer_id) {
    return res.status(400).json({ error: 'No billing account found' });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: user.stripe_customer_id,
    return_url: `${BASE_URL}/dashboard/billing`,
    configuration: process.env.STRIPE_PORTAL_CONFIG_ID, // optional
  });

  res.json({ url: session.url });
  // Or redirect: res.redirect(303, session.url);
});
```

---
