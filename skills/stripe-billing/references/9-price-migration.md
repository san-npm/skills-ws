## Contents

- 9. Price Migration
- Grandfather existing customers
- Schedule future price change

## 9. Price Migration

### Grandfather existing customers

```typescript
// scripts/price-migration.ts — run with: npx tsx scripts/price-migration.ts
import { stripe } from '../lib/stripe';

// Use env vars, not literals: test and live have different price IDs.
const OLD_PRICE = process.env.STRIPE_PRICE_OLD!;
const NEW_PRICE = process.env.STRIPE_PRICE_NEW!;

async function migrate(grandfatherBefore: Date) {
  let startingAfter: string | undefined;
  let migrated = 0, skipped = 0, alreadyDone = 0;

  while (true) {
    const subs = await stripe.subscriptions.list({
      price: OLD_PRICE, status: 'active', limit: 100,
      ...(startingAfter && { starting_after: startingAfter }),
    });

    for (const sub of subs.data) {
      // Idempotent: re-runs (after a crash mid-batch) skip subs already migrated.
      if (sub.metadata.migratedFrom === OLD_PRICE) { alreadyDone++; continue; }

      if (new Date(sub.created * 1000) < grandfatherBefore) {
        await stripe.subscriptions.update(sub.id, {
          metadata: { grandfathered: 'true', originalPrice: OLD_PRICE },
        });
        skipped++;
        continue;
      }

      // Find the item on the OLD price (don't assume items.data[0]).
      const item = sub.items.data.find((i) => i.price.id === OLD_PRICE) ?? sub.items.data[0];
      await stripe.subscriptions.update(sub.id, {
        items: [{ id: item.id, price: NEW_PRICE }],
        proration_behavior: 'none',  // 'none' = no mid-cycle charge; new price applies next cycle
        metadata: { migratedFrom: OLD_PRICE, migratedAt: new Date().toISOString() },
      }, {
        idempotencyKey: `migrate-${sub.id}-${NEW_PRICE}`,
      });
      migrated++;
      await new Promise((r) => setTimeout(r, 50)); // gentle rate limiting
    }

    if (!subs.has_more) break;
    startingAfter = subs.data[subs.data.length - 1].id;
  }

  console.log(`Done. Migrated: ${migrated}, Grandfathered: ${skipped}, Already: ${alreadyDone}`);
}

// Grandfather anyone who subscribed before this date; migrate everyone newer.
migrate(new Date('2026-01-01')).catch((e) => { console.error(e); process.exit(1); });
```

### Schedule future price change

```typescript
async function schedulePriceChange(subscriptionId: string, newPriceId: string, effectiveDate: Date) {
  const schedule = await stripe.subscriptionSchedules.create({ from_subscription: subscriptionId });

  await stripe.subscriptionSchedules.update(schedule.id, {
    phases: [
      {
        items: [{ price: schedule.phases[0].items[0].price as string }],
        start_date: schedule.phases[0].start_date,
        end_date: Math.floor(effectiveDate.getTime() / 1000),
      },
      {
        items: [{ price: newPriceId }],
        start_date: Math.floor(effectiveDate.getTime() / 1000),
      },
    ],
  });
}
```

---
