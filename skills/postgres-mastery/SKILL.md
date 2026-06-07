---
name: postgres-mastery
description: "Advanced PostgreSQL — index strategies, EXPLAIN ANALYZE, partitioning, pgvector, connection pooling, zero-downtime migrations, backups, and replication. Use when diagnosing slow queries, designing indexes, planning a migration, tuning PgBouncer, adding pgvector search, or setting up backups/replication."
---

# PostgreSQL Mastery

Production PostgreSQL patterns that go beyond `CREATE INDEX`. Index selection, query plan analysis, partitioning, pgvector for embeddings, zero-downtime migrations, and replication.

---

## 1. Index Types — When to Use Each

### B-tree (default) — 95% of your indexes

Best for: equality, range queries, sorting, uniqueness.

```sql
-- Standard index for lookups and sorting
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_orders_created ON orders (created_at DESC);

-- Composite index — column order matters!
-- This index serves: WHERE user_id = X AND status = Y
--                    WHERE user_id = X (leftmost prefix)
--                    NOT: WHERE status = Y (need separate index)
CREATE INDEX idx_orders_user_status ON orders (user_id, status);

-- Partial index — only index rows you query
-- 10x smaller than full index if 90% of orders are completed
CREATE INDEX idx_orders_pending ON orders (created_at)
  WHERE status IN ('pending', 'processing');

-- Covering index — includes columns needed by SELECT, avoids heap lookup
CREATE INDEX idx_orders_covering ON orders (user_id, created_at)
  INCLUDE (total, status);
-- Now this query uses INDEX ONLY SCAN:
-- SELECT total, status FROM orders WHERE user_id = 123 ORDER BY created_at DESC LIMIT 10;
```

### GIN — Full-text search, JSONB, arrays

```sql
-- Full-text search
ALTER TABLE articles ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(body, '')), 'B')
  ) STORED;

CREATE INDEX idx_articles_search ON articles USING gin(search_vector);

-- Query:
SELECT title, ts_rank(search_vector, query) AS rank
FROM articles, to_tsquery('english', 'postgres & performance') query
WHERE search_vector @@ query
ORDER BY rank DESC LIMIT 20;

-- JSONB containment
CREATE INDEX idx_events_metadata ON events USING gin(metadata jsonb_path_ops);
-- Query: WHERE metadata @> '{"source": "api", "version": 2}'

-- Array containment
CREATE INDEX idx_posts_tags ON posts USING gin(tags);
-- Query: WHERE tags @> ARRAY['postgres', 'performance']
```

### GiST — Geometric, range types, nearest neighbor

```sql
-- IP range lookups (e.g., geo-IP)
CREATE INDEX idx_ip_ranges ON ip_blocks USING gist(ip_range);
-- Query: WHERE ip_range @> '192.168.1.100'::inet

-- Nearest neighbor with PostGIS
CREATE INDEX idx_locations_geo ON locations USING gist(coordinates);
-- Query: ORDER BY coordinates <-> ST_MakePoint(-73.9857, 40.7484) LIMIT 10;

-- Range overlaps (booking systems)
CREATE INDEX idx_bookings_period ON bookings USING gist(
  tstzrange(check_in, check_out)
);
-- Query: WHERE tstzrange(check_in, check_out) && tstzrange('2025-03-01', '2025-03-05')
```

### BRIN — Huge tables with natural ordering

```sql
-- Perfect for time-series data where rows are inserted in order
-- 1000x smaller than B-tree for billion-row tables
CREATE INDEX idx_logs_created ON logs USING brin(created_at)
  WITH (pages_per_range = 32);

-- Only useful when data is physically ordered by the indexed column
-- Check correlation:
SELECT correlation FROM pg_stats
WHERE tablename = 'logs' AND attname = 'created_at';
-- correlation > 0.9 → BRIN is effective
-- correlation < 0.5 → use B-tree instead
```

### Index selection cheat sheet

| Query Pattern | Index Type |
|--------------|-----------|
| `WHERE col = value` | B-tree |
| `WHERE col BETWEEN a AND b` | B-tree |
| `ORDER BY col` | B-tree |
| `WHERE col @@ to_tsquery(...)` | GIN |
| `WHERE jsonb_col @> '{...}'` | GIN (jsonb_path_ops) |
| `WHERE array_col @> ARRAY[...]` | GIN |
| `ORDER BY point <-> point LIMIT N` | GiST |
| `WHERE range && range` | GiST |
| `WHERE col = value` (billion rows, ordered) | BRIN |

---

## 2. EXPLAIN ANALYZE Deep Dive

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, COUNT(o.id) as order_count
FROM users u
JOIN orders o ON o.user_id = u.id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name
ORDER BY order_count DESC
LIMIT 10;
```

### Reading the output

```
Limit  (cost=1234.56..1234.58 rows=10 width=40) (actual time=45.2..45.3 rows=10 loops=1)
  ->  Sort  (cost=1234.56..1256.78 rows=8900 width=40) (actual time=45.2..45.2 rows=10 loops=1)
        Sort Key: (count(o.id)) DESC
        Sort Method: top-N heapsort  Memory: 25kB
        ->  HashAggregate  (cost=1100.00..1189.00 rows=8900 width=40) (actual time=42.1..43.8 rows=8900 loops=1)
              Group Key: u.id
              Batches: 1  Memory Usage: 1200kB
              ->  Hash Join  (cost=300.00..950.00 rows=30000 width=36) (actual time=5.2..30.1 rows=30000 loops=1)
                    Hash Cond: (o.user_id = u.id)
                    ->  Seq Scan on orders o  (cost=0.00..500.00 rows=50000 width=8) (actual time=0.01..10.5 rows=50000 loops=1)
                    ->  Hash  (cost=250.00..250.00 rows=8900 width=36) (actual time=4.8..4.8 rows=8900 loops=1)
                          Buckets: 16384  Batches: 1  Memory Usage: 600kB
                          ->  Seq Scan on users u  (cost=0.00..250.00 rows=8900 width=36) (actual time=0.02..3.1 rows=8900 loops=1)
                                Filter: (created_at > '2024-01-01')
                                Rows Removed by Filter: 1100
Planning Time: 0.3 ms
Execution Time: 45.5 ms
Buffers: shared hit=800 read=50
```

**Key things to look for:**

| What | Meaning | Red Flag |
|------|---------|----------|
| `actual time` | Real execution time | First number is time to first row |
| `rows` estimate vs actual | Planner accuracy | Off by 10x+ → stale statistics |
| `Seq Scan` | Full table scan | Fine for small tables, bad for large |
| `Buffers: shared hit` | Pages from cache | Good — data is in memory |
| `Buffers: shared read` | Pages from disk | High = slow, need more RAM or better index |
| `Sort Method: external merge` | Sort spilled to disk | Increase `work_mem` |
| `Rows Removed by Filter` | Wasted work | Index could eliminate these rows |
| `loops=N` | Nested loop iterations | High loops × slow inner = problem |

### Fixing common problems

```sql
-- Problem: Seq Scan on large table
-- Check if an index exists and is being used:
SELECT indexrelname, idx_scan, idx_tup_read
FROM pg_stat_user_indexes WHERE relname = 'orders';

-- Force index usage for testing (don't use in production):
SET enable_seqscan = off;
EXPLAIN ANALYZE SELECT ...;
SET enable_seqscan = on;

-- Problem: bad row estimates
ANALYZE orders;  -- Update statistics
-- For complex expressions:
CREATE STATISTICS orders_stats (dependencies) ON user_id, status FROM orders;
ANALYZE orders;

-- Problem: sort spilling to disk
SET work_mem = '256MB';  -- Per-operation, not global
EXPLAIN ANALYZE SELECT ...;
-- If it helps, set it per-query or per-connection, not globally
```

---

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

## 4. pgvector — Embeddings & Similarity Search

```sql
CREATE EXTENSION vector;

CREATE TABLE documents (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    content     text NOT NULL,
    embedding   vector(1536),  -- match your embedding model's output dimensions
    metadata    jsonb,
    created_at  timestamptz DEFAULT now()
);
```

**Pick `vector(N)` to match your model.** `text-embedding-ada-002` (legacy) is fixed at 1536. Prefer current models:

| Model | Native dims | Notes |
|-------|-------------|-------|
| `text-embedding-3-small` | 1536 | Cheaper; can shorten via `dimensions` param |
| `text-embedding-3-large` | 3072 | Highest quality; shorten to 1024/256 for storage/speed |
| Cohere `embed-v3` / open models | 1024 / varies | Check the model card before choosing `N` |

The `text-embedding-3-*` models support Matryoshka truncation: request fewer `dimensions` (e.g. 256) for ~6x smaller indexes with modest recall loss. Whatever you pick, `vector(N)` must equal the stored vector length exactly, so verify against current model docs (e.g. https://platform.openai.com/docs/guides/embeddings) before committing to a column type.

**Storage types (pgvector 0.7+).** For high-dimension models, `halfvec` (16-bit floats) halves index size and memory with negligible recall loss, and dodges the `vector`/`hnsw` ~2000-dim index limit:

```sql
-- halfvec column + HNSW index (recommended for 3-large at 3072 dims)
ALTER TABLE documents ALTER COLUMN embedding TYPE halfvec(3072);
CREATE INDEX ON documents USING hnsw (embedding halfvec_cosine_ops)
    WITH (m = 16, ef_construction = 200);

-- Binary quantization (bit) for extreme scale; rerank top-K with full vectors
CREATE INDEX ON documents USING hnsw (
    (binary_quantize(embedding)::bit(3072)) bit_hamming_ops);
```

### HNSW vs IVFFlat

| Feature | HNSW | IVFFlat |
|---------|------|---------|
| Build time | Slow (hours for 1M+ rows) | Fast |
| Query speed | Faster | Slower |
| Memory | Higher | Lower |
| Recall | Better (99%+) | Good (95%+) with tuning |
| Updates | Good | Needs periodic reindex |
| **Use when** | Default choice; you can fit the index in RAM | Index doesn't fit in RAM, or build time matters more than recall |

There is no fixed row count that switches you from HNSW to IVFFlat — it depends on dimensions, `halfvec` vs `vector`, available RAM, and build-time budget. HNSW is the default for most workloads; reach for IVFFlat (or `halfvec`/binary quantization) only when the HNSW graph won't fit in memory. Always benchmark recall and p95 latency on your own data before deciding.

```sql
-- HNSW index (preferred for most cases)
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 200);

-- At query time, increase ef_search for better recall:
SET hnsw.ef_search = 100;  -- Default 40, higher = more accurate but slower

-- IVFFlat (for very large datasets)
-- First, decide number of lists: sqrt(num_rows) is a good start
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 1000);  -- For ~1M rows

-- At query time:
SET ivfflat.probes = 10;  -- Default 1, check more lists for better recall
```

### Distance functions

```sql
-- Cosine distance (most common for text embeddings)
SELECT id, content, embedding <=> '[0.1, 0.2, ...]'::vector AS distance
FROM documents
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;

-- L2 (Euclidean) distance
SELECT id, content, embedding <-> '[0.1, 0.2, ...]'::vector AS distance
FROM documents
ORDER BY embedding <-> '[0.1, 0.2, ...]'::vector
LIMIT 10;

-- Inner product (for normalized vectors, equivalent to cosine)
SELECT id, content, (embedding <#> '[0.1, 0.2, ...]'::vector) * -1 AS similarity
FROM documents
ORDER BY embedding <#> '[0.1, 0.2, ...]'::vector
LIMIT 10;

-- Combine vector search with metadata filtering
SELECT id, content
FROM documents
WHERE metadata->>'category' = 'technical'
  AND created_at > now() - interval '30 days'
ORDER BY embedding <=> $1::vector
LIMIT 10;
-- ⚠ Pre-filter large result sets can be slow. Consider partial indexes:
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops)
    WHERE metadata->>'category' = 'technical';
```

### Inserting embeddings from your app

```typescript
import { Pool } from 'pg';
import pgvector from 'pgvector/pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await pgvector.registerType(pool);

// Insert
await pool.query(
  'INSERT INTO documents (content, embedding, metadata) VALUES ($1, $2, $3)',
  [content, pgvector.toSql(embedding), JSON.stringify(metadata)]
);

// Query
const result = await pool.query(
  `SELECT id, content, embedding <=> $1::vector AS distance
   FROM documents ORDER BY distance LIMIT $2`,
  [pgvector.toSql(queryEmbedding), 10]
);
```

---

## 5. Connection Pooling — PgBouncer

### Why you need it

PostgreSQL creates a process per connection (~10MB RAM each). 100 connections = 1GB RAM just for connections. PgBouncer multiplexes thousands of app connections over a small pool.

### Configuration

```ini
; /etc/pgbouncer/pgbouncer.ini

[databases]
myapp = host=10.0.1.100 port=5432 dbname=myapp

[pgbouncer]
listen_port = 6432
listen_addr = 0.0.0.0
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; Pool mode:
; transaction — releases connection after each transaction (recommended)
; session — holds connection for entire session (needed for LISTEN/NOTIFY, advisory-lock sessions)
pool_mode = transaction

; Prepared statements in transaction mode (PgBouncer 1.21+):
; PgBouncer tracks protocol-level (extended-protocol) prepared statements per server
; connection. Set this > 0 to enable them in transaction mode.
max_prepared_statements = 200   ; 0 disables; per server connection

; Pool sizing
default_pool_size = 25          ; Connections per user/db pair
max_client_conn = 1000          ; Max client connections
reserve_pool_size = 5           ; Emergency extra connections
reserve_pool_timeout = 3        ; Wait before using reserve

; Timeouts
server_idle_timeout = 600       ; Close idle server connections after 10min
client_idle_timeout = 0         ; Don't close idle client connections
query_timeout = 30              ; Kill queries running > 30s
query_wait_timeout = 120        ; Wait 2min for a connection before erroring

; Stats
stats_period = 60
log_connections = 0             ; Don't log every connect/disconnect
log_disconnections = 0
```

### Transaction mode gotchas

```sql
-- These DON'T work reliably in transaction mode (a later statement may land on
-- a different server connection that never saw the session-level command):
LISTEN channel;                       -- LISTEN/NOTIFY
SET search_path = myschema;          -- Session-level SET
CREATE TEMP TABLE ...;               -- Session-scoped temp tables
-- Session-level advisory locks (pg_advisory_lock); use *_xact_ versions instead.

-- Workaround: use SET LOCAL (transaction-scoped):
BEGIN;
SET LOCAL search_path = myschema;
SELECT * FROM my_table;
COMMIT;

-- Or use session mode for specific apps that need these features.

-- Explicit SQL-level "PREPARE stmt AS ..." still won't survive across
-- transactions in transaction mode — only protocol-level prepared statements
-- (the extended query protocol your driver uses) are pooled, when
-- max_prepared_statements > 0.
```

**Prepared statements & drivers (2026).** PgBouncer 1.21+ pools protocol-level prepared statements in transaction mode when `max_prepared_statements > 0`. Driver caveats:

- **node-postgres / pg, asyncpg, JDBC, libpq** — use the extended protocol; named prepared statements work once `max_prepared_statements` is set. asyncpg also lets you disable its own statement cache (`statement_cache_size=0`) if you prefer.
- **Prisma** — for transaction-mode poolers, append `?pgbouncer=true` to the `DATABASE_URL` (disables Prisma's prepared statements). Prisma's own Accelerate / pooled `prisma://` URLs already handle this.
- **Serverless (Lambda, Vercel, Cloud Run)** — many short-lived clients overwhelm direct connections; route through a transaction-mode pooler (PgBouncer, RDS Proxy, Supabase pooler, Neon's pooled endpoint). Keep per-instance client pools tiny (often `max: 1`) and let the pooler do the multiplexing.

Session mode is still required when a feature genuinely needs connection affinity for its whole lifetime: `LISTEN`/`NOTIFY`, session-level advisory locks, `SET` that must persist across transactions, or session-scoped temp tables.

---

## 6. Zero-Downtime Migrations

### Adding a column safely

```sql
-- SAFE: nullable column, no default (instant, no table rewrite)
ALTER TABLE users ADD COLUMN avatar_url text;

-- SAFE in PG 11+: column with a DEFAULT (instant, stored as metadata)
ALTER TABLE users ADD COLUMN is_active boolean DEFAULT true;

-- DANGEROUS: NOT NULL without default (scans entire table)
-- NEVER DO THIS:
ALTER TABLE users ADD COLUMN bio text NOT NULL;
-- Instead: add nullable, backfill, then add constraint
```

### Adding an index without locking

```sql
-- CONCURRENTLY doesn't lock the table for writes
CREATE INDEX CONCURRENTLY idx_orders_email ON orders (email);

-- Check if it succeeded (CONCURRENTLY can fail silently):
SELECT indexrelid::regclass, indisvalid
FROM pg_index WHERE indexrelid = 'idx_orders_email'::regclass;
-- indisvalid = true → good
-- indisvalid = false → DROP INDEX idx_orders_email; and retry
```

### Renaming a column

```sql
-- DON'T rename directly — breaks running code
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN display_name text;

-- Step 2: Backfill (in batches)
UPDATE users SET display_name = name WHERE display_name IS NULL AND id BETWEEN 1 AND 10000;
UPDATE users SET display_name = name WHERE display_name IS NULL AND id BETWEEN 10001 AND 20000;
-- Continue in batches...

-- Step 3: Create a trigger to keep both in sync during transition
CREATE OR REPLACE FUNCTION sync_display_name() RETURNS trigger AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    NEW.display_name := NEW.name;
  ELSIF NEW.display_name IS DISTINCT FROM OLD.display_name THEN
    NEW.name := NEW.display_name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_display_name_trigger
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION sync_display_name();

-- Step 4: Deploy code reading from display_name
-- Step 5: Deploy code writing to display_name only
-- Step 6: Drop trigger and old column
DROP TRIGGER sync_display_name_trigger ON users;
ALTER TABLE users DROP COLUMN name;
```

### Adding a NOT NULL constraint

```sql
-- DANGEROUS: ALTER TABLE ... SET NOT NULL scans entire table with lock
-- SAFE: use a CHECK constraint with NOT VALID

-- Step 1: Add constraint without validating existing rows (instant)
ALTER TABLE users ADD CONSTRAINT users_email_not_null
  CHECK (email IS NOT NULL) NOT VALID;

-- Step 2: Validate in background (no lock on writes)
ALTER TABLE users VALIDATE CONSTRAINT users_email_not_null;

-- Step 3: Optionally convert to NOT NULL (instant after validation)
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users DROP CONSTRAINT users_email_not_null;
```

---

## 7. Backup & Recovery

### pg_dump for logical backups

```bash
# Full backup (custom format — compressed, allows selective restore)
pg_dump -Fc -h localhost -U myapp -d myapp > backup_$(date +%Y%m%d_%H%M%S).dump

# Schema only
pg_dump -Fc --schema-only -d myapp > schema.dump

# Specific tables
pg_dump -Fc -t users -t orders -d myapp > users_orders.dump

# Restore
pg_restore -d myapp_new backup.dump

# Restore specific table
pg_restore -d myapp -t users backup.dump
```

### WAL archiving for point-in-time recovery

```ini
# postgresql.conf
wal_level = replica
archive_mode = on
# archive_command MUST: (1) return non-zero on ANY failure so Postgres retries
# (it will keep the WAL segment until success — never return 0 on a failed copy),
# and (2) refuse to overwrite an already-archived segment with DIFFERENT content.
# Naive `aws s3 cp` silently overwrites and masks corruption. Guard it:
archive_command = 'test ! -f /mnt/wal/%f && aws s3 cp %p s3://my-wal-archive/%f --only-show-errors'
archive_timeout = 300  # Archive at least every 5 minutes
```

In practice, do not hand-roll this. Prefer a purpose-built tool that handles idempotency, compression, encryption, parallelism, retention, and verified restores:

```bash
# pgBackRest (recommended): WAL archive + full/incremental backups to S3, with
# integrity checks and restore testing built in.
archive_command = 'pgbackrest --stanza=main archive-push %p'

# Or stream WAL continuously off-host (complements, not replaces, base backups):
pg_receivewal -h primary -U replicator -D /mnt/wal --synchronous
```

Monitor archiving health and alert on `failed_count > 0` or a stalled `last_archived_time`:

```sql
SELECT archived_count, failed_count, last_archived_wal, last_archived_time,
       last_failed_wal, last_failed_time
FROM pg_stat_archiver;
```

Periodically run a real restore to a throwaway host — an untested backup is not a backup.

```bash
# Point-in-time recovery
# 1. Stop PostgreSQL
# 2. Replace data directory with base backup
# 3. Create recovery.signal
# 4. Configure recovery target in postgresql.conf:
#    recovery_target_time = '2025-03-01 14:30:00+00'
#    restore_command = 'aws s3 cp s3://my-wal-archive/%f %p'
# 5. Start PostgreSQL — it replays WAL to the target time
```

### Automated backup script

```bash
#!/bin/bash
set -euo pipefail

DB_NAME="myapp"
S3_BUCKET="myapp-backups"        # versioned + Object Lock + SSE enabled (see below)
DATE=$(date -u +%Y%m%d_%H%M%S)
BACKUP_FILE="$(mktemp -d)/${DB_NAME}_${DATE}.dump"

# Dump (-Fc = compressed custom format). PGPASSWORD/.pgpass, never inline secrets.
pg_dump -Fc -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE"

# Upload with server-side encryption. Retention/expiry is handled by the bucket
# lifecycle policy below — this script NEVER deletes old backups.
aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET}/daily/${DB_NAME}_${DATE}.dump" \
  --storage-class STANDARD_IA --sse aws:kms --only-show-errors

rm -rf "$(dirname "$BACKUP_FILE")"
echo "Backup complete: ${DB_NAME}_${DATE}.dump"
```

**Do retention with bucket policy, not a delete loop.** Parsing filenames to `aws s3 rm` is dangerous: a date-parse bug, a clock skew, or an empty `ls` (transient error → `awk` yields nothing → no guard) can wipe your only good backup, and it ignores legal/compliance holds. Instead:

- **Versioning + Object Lock (compliance/governance, WORM):** ransomware or a bad script cannot delete or overwrite a locked object before its retention expires.
- **Lifecycle rules** expire/transition objects automatically (set once, in IaC):

```json
{ "Rules": [{
  "ID": "pg-daily-retention",
  "Filter": { "Prefix": "daily/" },
  "Status": "Enabled",
  "Transitions": [{ "Days": 30, "StorageClass": "GLACIER" }],
  "Expiration": { "Days": 365 },
  "NoncurrentVersionExpiration": { "NoncurrentDays": 30 }
}]}
```

- **Encryption** at rest (SSE-KMS) and in transit; restrict who can read/delete the bucket.

**RPO/RTO — logical vs physical:**

| | Logical (`pg_dump`) | Physical / PITR (`pgBackRest`, base backup + WAL) |
|---|---|---|
| RPO | Since last dump (hours) | Seconds — replay WAL to any point in time |
| RTO | Slow restore + reindex on big DBs | Faster; full-cluster restore |
| Scope | Per-DB, portable across major versions | Whole cluster, same major version |
| Use for | Small/medium DBs, migrations, partial restores | Large DBs, low-RPO production |

Pick logical for portability and selective restores; pick physical/PITR when you need a low RPO on a large database. **Test restores on a schedule** — measure actual RTO and confirm the dump deserializes. An unrestored backup is a hope, not a backup.

---

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
primary_conninfo = 'host=primary-host user=replicator password=xxx'
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

## 9. Query Optimization Case Studies

### Case 1: N+1 query → single JOIN

```sql
-- BAD: N+1 (100 queries for 100 orders)
SELECT * FROM orders WHERE user_id = 1;
-- Then for each order:
SELECT * FROM order_items WHERE order_id = ?;

-- GOOD: single query
SELECT o.*, json_agg(oi.*) as items
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = 1
GROUP BY o.id;
```

### Case 2: Pagination done right

```sql
-- BAD: OFFSET for deep pages (scans and discards rows)
SELECT * FROM products ORDER BY created_at DESC OFFSET 10000 LIMIT 20;
-- Scans 10,020 rows to return 20

-- GOOD: Cursor-based pagination
SELECT * FROM products
WHERE created_at < '2025-02-15T10:30:00Z'  -- Last item's created_at
ORDER BY created_at DESC
LIMIT 20;
-- Only scans 20 rows with an index on created_at

-- For equal timestamps, use a composite cursor:
WHERE (created_at, id) < ('2025-02-15T10:30:00Z', 12345)
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

### Case 3: COUNT(*) on large tables

```sql
-- SLOW: exact count scans entire table
SELECT COUNT(*) FROM events;  -- 50M rows → 5+ seconds

-- FAST: approximate count. Accuracy depends entirely on how recently autovacuum/
-- ANALYZE ran — it can be far off right after bulk loads/deletes or on churny tables.
-- Run ANALYZE first if you need it tighter; never use it where exactness matters.
SELECT reltuples::bigint FROM pg_class WHERE relname = 'events';

-- FAST: exact count with conditions (if indexed)
SELECT COUNT(*) FROM events WHERE status = 'active';  -- Uses index

-- For dashboards showing "~1.2M events", the approximate is fine
```

### Case 4: Bulk upsert

```sql
-- SLOW: individual INSERTs in a loop
INSERT INTO products (sku, name, price) VALUES ($1, $2, $3)
ON CONFLICT (sku) DO UPDATE SET name = $2, price = $3;
-- 10,000 times...

-- FAST: batch with unnest
INSERT INTO products (sku, name, price)
SELECT * FROM unnest($1::text[], $2::text[], $3::numeric[])
ON CONFLICT (sku) DO UPDATE SET
  name = EXCLUDED.name,
  price = EXCLUDED.price;
-- Single query for 10,000 rows
```

---

## 10. Essential Configuration

> These are **starting points for a self-hosted OLTP server on PostgreSQL 16/17/18-era with NVMe SSD, ~16GB RAM, 4 CPU** — not universal truths. Adjust for your reality:
> - **Storage:** the SSD `random_page_cost`/`effective_io_concurrency` below are wrong on spinning disks or throttled network/EBS volumes.
> - **Workload:** analytics/OLAP wants much larger `work_mem` and `max_wal_size` and fewer connections; high-write OLTP wants more aggressive autovacuum. Don't copy OLTP settings onto an analytics box.
> - **Managed services (RDS, Cloud SQL, Aurora, Supabase, Neon):** many of these are preset by the provider or not user-tunable — change them via the provider's parameter groups, not `postgresql.conf`. Aurora ignores some entirely.
> - Generate a baseline for your box at https://pgtune.leopard.in.ua/ then tune from `pg_stat_statements` and `EXPLAIN`, validating each change.

```ini
# postgresql.conf — STARTING POINT for a self-hosted OLTP server,
# ~16GB RAM / 4 CPU / NVMe SSD, PostgreSQL 16+. Tune to your workload.

# Memory
shared_buffers = '4GB'           # 25% of RAM
effective_cache_size = '12GB'    # 75% of RAM (includes OS cache)
work_mem = '64MB'                # Per-operation sort/hash memory
maintenance_work_mem = '512MB'   # For VACUUM, CREATE INDEX

# WAL
wal_buffers = '64MB'
checkpoint_completion_target = 0.9
max_wal_size = '4GB'

# Query planning
random_page_cost = 1.1           # SSDs (default 4.0 is for HDDs)
effective_io_concurrency = 200   # SSDs

# Connections
max_connections = 200            # Use PgBouncer, not high max_connections

# Logging
log_min_duration_statement = 200  # Log queries > 200ms
log_checkpoints = on
log_lock_waits = on
log_temp_files = 0                # Log any temp file usage

# Autovacuum (tune if you have high-write tables)
autovacuum_max_workers = 4
autovacuum_naptime = '30s'
autovacuum_vacuum_cost_limit = 1000
```
