## Contents

- 3. Partitioning
- Range partitioning (time-series)
- Auto-create partitions with pgpartman
- Migrating an existing table to partitioned

## 3. Partitioning

### Range partitioning (time-series)

```sql
-- Create partitioned table
CREATE TABLE events (
    id          bigint GENERATED ALWAYS AS IDENTITY,
    event_type  text NOT NULL,
    payload     jsonb,
    created_at  timestamptz NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Create partitions (automate this!)
CREATE TABLE events_2025_01 PARTITION OF events
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
CREATE TABLE events_2025_02 PARTITION OF events
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Default partition catches anything that doesn't match
CREATE TABLE events_default PARTITION OF events DEFAULT;

-- Index on each partition (created automatically if you index the parent)
CREATE INDEX ON events (created_at);
CREATE INDEX ON events (event_type, created_at);
```

### Auto-create partitions with pg_partman

```sql
CREATE EXTENSION pg_partman;

SELECT partman.create_parent(
    p_parent_table := 'public.events',
    p_control := 'created_at',
    p_interval := '1 month',
    p_premake := 3  -- Create 3 months ahead
);
-- Note: p_type parameter was removed in pg_partman v5 (native is now the only option).

-- Run maintenance (schedule via pg_cron):
SELECT partman.run_maintenance();
```

### Migrating an existing table to partitioned

```sql
-- Step 1: Create the partitioned table
CREATE TABLE events_partitioned (LIKE events INCLUDING ALL)
    PARTITION BY RANGE (created_at);

-- Step 2: Create partitions
CREATE TABLE events_p2025_01 PARTITION OF events_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
-- ... more partitions

-- Step 3: Copy data in batches
INSERT INTO events_partitioned
SELECT * FROM events
WHERE created_at >= '2025-01-01' AND created_at < '2025-02-01';
-- Repeat for each partition range

-- Step 4: Swap (requires brief ACCESS EXCLUSIVE lock — set a short lock_timeout)
SET lock_timeout = '3s';
BEGIN;
ALTER TABLE events RENAME TO events_old;
ALTER TABLE events_partitioned RENAME TO events;
COMMIT;
```

> ⚠ `LIKE ... INCLUDING ALL` copies columns, defaults, CHECKs, indexes, comments and storage — but it does **not** copy foreign keys (in or out), grants/ownership, row-level security policies, triggers, publication membership, or rebind sequence ownership. The swap also leaves dependent views/matviews still pointing at `events_old`. Do **not** `DROP TABLE events_old` until every item below is handled and verified.

Pre/post-swap checklist:

```sql
-- BEFORE the swap, on events_partitioned, recreate everything LIKE didn't copy:
--   * Foreign keys that reference this table  → re-add ON the partitioned parent
--     (PG 12+ supports FKs referencing a partitioned table).
--   * Foreign keys this table declares        → re-add (consider NOT VALID then VALIDATE).
--   * Sequence ownership: ALTER SEQUENCE ... OWNED BY new column; reset to MAX(id)+1.
--   * Triggers, RLS policies (and ALTER TABLE ... ENABLE ROW LEVEL SECURITY).
--   * GRANTs and table ownership (ALTER TABLE ... OWNER TO ...).
SELECT setval(pg_get_serial_sequence('events','id'),
              (SELECT COALESCE(max(id),0) FROM events_partitioned), true);

-- AFTER the swap, before dropping the old table:
--   * Reattach/redefine dependent views & materialized views.
--   * Re-point logical replication publications (ALTER PUBLICATION ... ADD/DROP TABLE).
-- Validate row counts and a checksum match, partition by partition:
SELECT count(*) FROM events;       -- compare to events_old
SELECT count(*) FROM events_old;

-- Step 5: Only after validation passes. Rename first so a rollback is instant:
ALTER TABLE events_old RENAME TO events_retired;  -- keep for a release cycle
-- DROP TABLE events_retired;  -- final cleanup once you're confident

-- ROLLBACK plan if validation fails: reverse the rename in one transaction:
--   BEGIN; ALTER TABLE events RENAME TO events_partitioned;
--          ALTER TABLE events_old RENAME TO events; COMMIT;
```

For a truly zero-downtime cut-over on a hot table, dual-write to both tables (or use logical replication for the backfill, see §8) and validate before the swap, rather than relying on a one-shot batch copy.

---
