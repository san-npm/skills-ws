## Quick Reference: Webhook Events Cheat Sheet

| Event | When | Action |
|-------|------|--------|
| `checkout.session.completed` | Customer completes Checkout | **Provision access** |
| `customer.subscription.created` | Subscription created | Store subscription ID |
| `customer.subscription.updated` | Plan change, pause, trial end | Update plan/status |
| `customer.subscription.deleted` | Subscription fully canceled | **Revoke access** |
| `customer.subscription.trial_will_end` | 3 days before trial ends | Send reminder email |
| `invoice.payment_succeeded` | Payment collected | Extend access period |
| `invoice.payment_failed` | Payment failed | Start dunning flow |
| `invoice.upcoming` | ~3 days before next invoice | Send usage summary |

---
