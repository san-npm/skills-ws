## Contents

- 3. Usage-Based Billing (Billing Meters)
- Create the meter + metered price

## 3. Usage-Based Billing (Billing Meters)

Legacy usage records are removed (see Basil-line invariants above). The model is now: a **Billing Meter** (`mtr_...`) aggregates **meter events** you send with `billing.meterEvents.create`; a **metered price** references that meter via `recurring.meter`. Stripe rate-limits meter calls, so buffer locally and flush in batches.

Two correctness rules the naive tutorial misses:

1. **Never `KEYS` in production** — it blocks Redis O(n) over the whole keyspace. Use `SCAN`.
2. **Don't read-then-`DEL`** — increments written between `HGET` and `DEL` are silently lost. Atomically drain the counter (Lua `GETDEL`-style) so a concurrent `HINCRBY` lands in the next window instead of vanishing. And send a deterministic `identifier` so a retried flush is de-duplicated by Stripe rather than double-billed.

```typescript
// lib/usage-metering.ts
import { stripe } from './stripe';
import { Redis } from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

// Atomically read+reset a window's quantity. Returns the drained value as a string.
// HSET to 0 (rather than DEL) keeps the key alive only for the TTL it already has;
// any HINCRBY racing this script either ran before (counted here) or after (next window).
const DRAIN = `
  local q = redis.call('HGET', KEYS[1], 'quantity')
  if q then redis.call('HSET', KEYS[1], 'quantity', 0) end
  return q or '0'
`;

export class UsageMeter {
  constructor(private readonly flushIntervalMs = 60_000) {}

  /** event_name is the Billing Meter's event_name (e.g. 'api_requests'). */
  async recordUsage(eventName: string, customerId: string, quantity: number): Promise<void> {
    const window = String(Math.floor(Date.now() / 60_000) * 60);
    const key = `usage:${eventName}:${customerId}:${window}`;
    await redis.hincrby(key, 'quantity', quantity);
    await redis.expire(key, 7200); // outlive a flush window even if the flusher is down
  }

  async flush(): Promise<void> {
    let cursor = '0';
    do {
      // SCAN, not KEYS. COUNT is a hint; loop until cursor wraps to '0'.
      const [next, keys] = await redis.scan(cursor, 'MATCH', 'usage:*', 'COUNT', 500);
      cursor = next;

      for (const key of keys) {
        // key = usage:<eventName>:<customerId>:<window>; customerId itself contains no ':'.
        const parts = key.split(':');
        const window = parts.pop()!;
        const customerId = parts.pop()!;
        const eventName = parts.slice(1).join(':');

        const drained = (await redis.eval(DRAIN, 1, key)) as string;
        const value = parseInt(drained, 10);
        if (!value) continue;

        try {
          await stripe.billing.meterEvents.create({
            event_name: eventName,
            payload: { stripe_customer_id: customerId, value: String(value) },
            timestamp: parseInt(window, 10),       // bucket start; must be within the meter's window
            // Deterministic per (customer, event, window): a retried flush is ignored by Stripe
            // instead of double-counted. Stripe de-dupes meter events by identifier.
            identifier: `${customerId}:${eventName}:${window}`,
          });
        } catch (err) {
          // Flush failed AFTER draining → put it back so the next tick retries.
          // Same identifier means Stripe still de-dupes if the event actually landed.
          await redis.hincrby(key, 'quantity', value);
          console.error(`Usage flush failed for ${eventName}/${customerId}@${window}:`, err);
        }
      }
    } while (cursor !== '0');
  }

  start(): NodeJS.Timeout {
    return setInterval(() => this.flush(), this.flushIntervalMs);
  }
}

export const meter = new UsageMeter();
```

> At real scale, prefer a durable outbox over Redis-only buffering: write each usage delta to a `usage_events` table (or stream) and have a worker drain it to Stripe, marking rows sent. Redis buffering trades a small loss window for latency; an outbox gives you replay and an audit trail. The deterministic `identifier` above is what makes either approach safe to retry.

### Create the meter + metered price

Inline, runnable setup. Run once per environment (test and live have separate `mtr_`/`price_` IDs). Replace the placeholder env names with your own.

```typescript
// scripts/setup-metered-prices.ts — run with: npx tsx scripts/setup-metered-prices.ts
import { stripe } from '../lib/stripe';

async function setup() {
  // 1. The meter aggregates events named 'api_requests'. customer_mapping + value keys
  //    MUST match the payload sent in recordUsage (stripe_customer_id / value).
  const m = await stripe.billing.meters.create({
    display_name: 'API Requests',
    event_name: 'api_requests',
    default_aggregation: { formula: 'sum' },          // sum | count | last
    value_settings: { event_payload_key: 'value' },
    customer_mapping: { type: 'by_id', event_payload_key: 'stripe_customer_id' },
  });

  const product = await stripe.products.create({ name: 'API Access' });

  // 2. $29/mo flat base (licensed, not metered).
  const base = await stripe.prices.create({
    product: product.id, unit_amount: 2900, currency: 'usd',
    recurring: { interval: 'month' },
  });

  // 3. Metered, graduated-tier usage price. NOTE the required recurring.meter — and
  //    NO aggregate_usage (removed on the Basil line; aggregation lives on the meter).
  const usage = await stripe.prices.create({
    product: product.id, currency: 'usd',
    recurring: { interval: 'month', usage_type: 'metered', meter: m.id },
    billing_scheme: 'tiered', tiers_mode: 'graduated',
    tiers: [
      { up_to: 10_000, unit_amount: 0 },              // first 10k included
      { up_to: 100_000, unit_amount_decimal: '0.2' }, // $0.002/req
      { up_to: 'inf', unit_amount_decimal: '0.1' },   // $0.001/req volume discount
    ],
  });

  console.log('Meter:', m.id, 'Base:', base.id, 'Usage:', usage.id);
  // Subscribe a customer to BOTH prices: items: [{ price: base.id }, { price: usage.id }]
}

setup().catch((e) => { console.error(e); process.exit(1); });
```

---
