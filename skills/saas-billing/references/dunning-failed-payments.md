## Contents

- Dunning & Failed Payments
- Stripe Smart Retries Configuration
- Your Dunning Logic
- Grace Periods

## Dunning & Failed Payments

Dunning is the process of recovering failed payments. Stripe has Smart Retries built in, but you should also act on your side.

### Stripe Smart Retries Configuration

Configure in Stripe Dashboard → Settings → Billing → Subscription and emails:

- **Retry schedule:** Stripe retries 3-4 times over ~3 weeks by default
- **Customer emails:** Enable Stripe's built-in failed payment emails
- **Subscription status:** Moves from `active` → `past_due` → `unpaid` → `canceled`

### Your Dunning Logic

```js
// In your subscription status check middleware
async function requireActiveSubscription(req, res, next) {
  const user = req.user;

  switch (user.subscription_status) {
    case 'active':
    case 'trialing':
      return next();

    case 'past_due':
      // Grace period — allow limited access but show warning
      req.pastDue = true;
      return next();

    case 'unpaid':
    case 'canceled':
      return res.status(402).json({
        error: 'subscription_required',
        message: 'Your subscription has expired. Please update your payment method.',
        portal_url: '/billing/portal',
      });

    default:
      return res.status(403).json({ error: 'Unknown subscription status' });
  }
}
```

### Grace Periods

```js
// Allow X days of access after payment failure before hard cutoff
const GRACE_PERIOD_DAYS = 7;

function isInGracePeriod(user) {
  if (user.subscription_status !== 'past_due') return false;

  const firstFailedAt = user.first_failed_payment_at;
  if (!firstFailedAt) return true; // just failed, still in grace

  const gracePeriodEnd = new Date(firstFailedAt);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

  return new Date() < gracePeriodEnd;
}
```

---
