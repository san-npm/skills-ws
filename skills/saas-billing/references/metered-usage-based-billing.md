## Contents

- Metered / Usage-Based Billing
- Reporting Usage (Billing Meters — default)
- Batched / High-Volume Usage Reporting
- Legacy appendix — createUsageRecord (maintenance mode, existing integrations only)
- Usage Limits & Rate Limiting Per Plan

## Metered / Usage-Based Billing

> **Use Billing Meters for all new usage-based billing.** You send *meter events*
> keyed by `stripe_customer_id` (not subscription-item usage records); Stripe
> aggregates them against the meter that backs the price (see "Stripe Products &
> Prices" for creating the meter + meter-backed price). The legacy
> `subscriptionItems.createUsageRecord` path is in maintenance mode and is kept
> in the appendix at the end of this section only for existing integrations.
> Docs: https://docs.stripe.com/billing/subscriptions/usage-based

### Reporting Usage (Billing Meters — default)

```js
// Send a meter event. `event_name` MUST match the meter's event_name.
// `stripe_customer_id` is the aggregation key — NOT a subscription item id.
async function reportMeterEvent(customerId, value = 1, { eventName = 'api_request', timestamp, identifier } = {}) {
  return stripe.billing.meterEvents.create({
    event_name: eventName,
    // `identifier` makes the event idempotent — Stripe de-dupes events that
    // share the same identifier, so a retry after a network blip won't double-bill.
    identifier,                                  // e.g. a request id / ULID
    timestamp,                                   // Unix seconds; omit = "now". Most
                                                 // meters reject events older than ~35 days.
    payload: {
      stripe_customer_id: customerId,            // required aggregation key
      value: String(value),                      // payload values are strings
    },
  });
}

// Example: report API usage after each request (fire-and-forget, never block the response)
app.use('/api/v1', authenticateApiKey, async (req, res, next) => {
  res.on('finish', () => {
    // Resolve the Stripe customer id for this user (cache it on req in auth middleware
    // to avoid a DB hit per request).
    const customerId = req.stripeCustomerId;
    if (!customerId) return;
    reportMeterEvent(customerId, 1, {
      identifier: req.id,                         // unique per request → idempotent
    }).catch((err) => {
      console.error('Failed to report meter event:', err.message);
      enqueueUsageRetry({ customerId, value: 1, identifier: req.id }); // durable retry, see below
    });
  });
  next();
});
```

> **Reporting !== invoicing.** Meter events feed an aggregated total that Stripe
> bills at the period boundary. There is no per-event charge, so emitting events
> is cheap — but it is also eventually-consistent, so don't read meter totals to
> enforce hard real-time quotas (use your own counter for that; see
> "Usage Limits" below).

### Batched / High-Volume Usage Reporting

At high request rates, prefer a **durable queue** (Redis Stream, SQS, Postgres
`outbox` table) over an in-memory accumulator — a process restart must not lose
billable usage. The aggregation key is the **customer**, and each batched event
should carry a stable `identifier` so retries stay idempotent.

```js
// Aggregate in-memory only as a write-coalescing buffer in FRONT of a durable
// queue. On every flush, generate ONE identifier per (customer, window) so a
// retried flush de-dupes instead of double-billing.
class UsageAccumulator {
  constructor(flushIntervalMs = 60_000, { eventName = 'api_request' } = {}) {
    this.counters = new Map(); // stripeCustomerId → count
    this.eventName = eventName;
    this.interval = setInterval(() => this.flush().catch(console.error), flushIntervalMs);
  }

  increment(customerId, amount = 1) {
    this.counters.set(customerId, (this.counters.get(customerId) || 0) + amount);
  }

  async flush() {
    const windowId = Math.floor(Date.now() / 60_000); // 1-min bucket → stable id
    const entries = [...this.counters.entries()];
    this.counters.clear();

    for (const [customerId, value] of entries) {
      if (value === 0) continue;
      try {
        await stripe.billing.meterEvents.create({
          event_name: this.eventName,
          identifier: `${customerId}:${windowId}`, // idempotent per customer per minute
          payload: { stripe_customer_id: customerId, value: String(value) },
        });
      } catch (err) {
        console.error(`Failed to report usage for ${customerId}:`, err.message);
        // Re-buffer for the next flush (still de-duped by the windowId identifier).
        this.counters.set(customerId, (this.counters.get(customerId) || 0) + value);
      }
    }
  }

  async shutdown() {
    clearInterval(this.interval);
    await this.flush(); // flush remaining buffer on SIGTERM so usage isn't lost
  }
}

const usageTracker = new UsageAccumulator(60_000); // flush every 60s
process.on('SIGTERM', async () => { await usageTracker.shutdown(); process.exit(0); });
```

> **Caveat on `${customerId}:${windowId}` identifiers:** within a single window
> you must coalesce to exactly one event per customer (as above). If you instead
> emit multiple events per window, give each a unique identifier — reusing one
> identifier for different values means Stripe keeps only the first.

### Legacy appendix — `createUsageRecord` (maintenance mode, existing integrations only)

Only for subscriptions on **legacy metered prices created without a `meter`**.
Do not use for new builds. This endpoint only exists on API versions before
2025-03-31.basil; it was removed in basil and from current SDK majors. Existing
integrations must keep a pre-basil pinned version (2025-02-24.acacia or earlier)
or call it via `stripe.rawRequest` with a pre-basil `Stripe-Version` header after
upgrading the SDK (see
https://docs.stripe.com/billing/subscriptions/usage-based-legacy/sdk-upgrade).
It will not run against the client pinned above.

```js
// LEGACY — keyed by subscription ITEM id, not customer. Prefer meter events above.
async function reportUsageLegacy(subscriptionItemId, quantity, timestamp = null) {
  return stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
    quantity,
    timestamp: timestamp || Math.floor(Date.now() / 1000),
    action: 'increment', // 'increment' adds to the period total; 'set' overwrites it
  });
}
```

### Usage Limits & Rate Limiting Per Plan

```js
const PLAN_LIMITS = {
  free:       { monthly_api_calls: 100,    rpm: 10  },
  starter:    { monthly_api_calls: 10_000, rpm: 60  },
  pro:        { monthly_api_calls: 100_000, rpm: 300 },
  enterprise: { monthly_api_calls: Infinity, rpm: 1000 },
};

async function checkUsageLimit(userId, plan) {
  const limits = PLAN_LIMITS[plan];
  if (!limits) return false;

  const result = await db.query(
    `SELECT COUNT(*) as count FROM api_usage_log
     WHERE user_id = $1
       AND created_at >= date_trunc('month', NOW())`,
    [userId]
  );

  const used = parseInt(result.rows[0].count);
  return used < limits.monthly_api_calls;
}
```

---
