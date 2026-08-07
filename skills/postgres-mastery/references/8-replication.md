## Contents

- 8. Replication
- Streaming replication (physical)
- Logical replication (selective)
- Using read replicas in your app

## 8. Replication

### Streaming replication (physical)

```ini
# Primary postgresql.conf
wal_level = replica
max_wal_senders = 10
wal_keep_size = '1GB'

# Primary pg_hba.conf
host replication replicator 10.0.0.0/24 scram-sha-256
```

```bash
# On replica:
pg_basebackup -h primary-host -U replicator -D /var/lib/postgresql/data -Fp -Xs -P
```

```ini
# Replica postgresql.conf
primary_conninfo = 'host=primary-host user=replicator'  # credentials via ~/.pgpass (or passfile=), never inline in postgresql.conf
hot_standby = on
```

### Logical replication (selective)

```sql
-- On publisher (primary)
CREATE PUBLICATION my_pub FOR TABLE users, orders;

-- On subscriber (replica)
CREATE SUBSCRIPTION my_sub
  CONNECTION 'host=primary-host dbname=myapp user=replicator'
  PUBLICATION my_pub;

-- Check replication status
SELECT * FROM pg_stat_replication;  -- On primary
SELECT * FROM pg_stat_subscription;  -- On subscriber
```

**Logical replication caveats — read before relying on it:**

- **Replica identity / primary keys.** `UPDATE`/`DELETE` replication needs a way to identify the row. A primary key works out of the box; otherwise set `ALTER TABLE t REPLICA IDENTITY FULL` (or USING a unique index). Without it, updates/deletes either fail or are skipped.
- **DDL is NOT replicated.** Schema changes (new columns, type changes) must be applied to the subscriber **first**, then the publisher — otherwise apply errors and replication stalls.
- **Sequences are NOT replicated.** After a cut-over/failover you must advance subscriber sequences manually (`setval(...)`) or you'll collide on IDs.
- **Initial copy.** Each table is fully copied on subscribe (a long `COPY` on big tables); throttle with `max_sync_workers_per_subscription` and watch disk/IO.
- **Replication slot WAL bloat.** A publisher slot retains WAL until the subscriber consumes it. A down/lagging subscriber can fill the primary's disk. Monitor and cap:

```sql
-- Slot lag in bytes (kill or fix slots that grow unbounded):
SELECT slot_name, active,
       pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)) AS retained
FROM pg_replication_slots;
```

Set `max_slot_wal_keep_size` to bound retention (the primary will drop a slot rather than run out of disk). Track apply lag via `pg_stat_subscription` (`latest_end_lsn` vs current WAL) and alert on it.
- **Failover.** Logical replication does not give you an automatic HA failover; promotion, sequence advancement, slot/DDL state, and re-pointing apps are manual or tooling-driven.

### Using read replicas in your app

```typescript
// Prisma example with read replica
import { PrismaClient } from '@prisma/client';
import { readReplicas } from '@prisma/extension-read-replicas';

const prisma = new PrismaClient().$extends(
  readReplicas({
    url: process.env.DATABASE_REPLICA_URL!,
  })
);

// Reads go to replica automatically
const users = await prisma.user.findMany();

// Writes go to primary
await prisma.user.create({ data: { ... } });

// Force read from primary (when you need consistency)
await prisma.$primary().user.findUnique({ where: { id: 1 } });
```

---
