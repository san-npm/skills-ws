## Decision Flowchart

```
New customer wants to subscribe
  → Create Checkout Session (mode: 'subscription')
  → Customer completes payment
  → Webhook: checkout.session.completed
  → Provision access + generate API key
  → Store subscription ID in your DB

Customer wants to change plan
  → stripe.subscriptions.update() with new price
  → Webhook: customer.subscription.updated
  → Update plan in your DB

Payment fails
  → Webhook: invoice.payment_failed
  → Send dunning email with portal link
  → Grace period (7 days)
  → If still unpaid → revoke access

Customer cancels
  → stripe.subscriptions.update({ cancel_at_period_end: true })
  → Webhook: customer.subscription.updated (cancel_at_period_end: true)
  → Show reactivation option in UI
  → At period end: customer.subscription.deleted
  → Webhook: customer.subscription.deleted
  → Revoke API keys, downgrade to free
```

---
