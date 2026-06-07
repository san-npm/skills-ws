---
name: database-design
description: "Relational schema design and data modeling — normalization, denormalization, indexing strategy, safe migrations, N+1 fixes, and PostgreSQL patterns for production. Use when designing or evolving a schema, choosing indexes, writing a zero-downtime migration, modeling relationships, or deciding when to denormalize."
---

# Database Design

Design-time decisions for relational schemas: how to model data, where to denormalize, which index to reach for, and how to evolve a live schema without downtime. Examples target PostgreSQL 18 (the current stable major branch as of Jun 2026; PG 19 is in beta, ~Sep 2026 — verify at postgresql.org/support/versioning). The migration/locking semantics below hold for PG 12+.

> For the *operational* deep dives — `EXPLAIN ANALYZE` internals, partitioning automation, pgvector, PgBouncer tuning, replication, backup/PITR runbooks, config tuning — see the sibling skill `postgres-mastery`. This skill covers the modeling and migration design that comes *before* those.

## Schema Design Patterns

### Normalization Quick Reference

| Form | Rule | When to break |
|------|------|---------------|
| 1NF | Atomic values, no repeating groups | JSONB arrays for tags/metadata |
| 2NF | No partial dependencies | Denormalized read models |
| 3NF | No transitive dependencies | Caching computed fields |
| BCNF | Every determinant is a candidate key | Rarely broken |

### Denormalization Patterns

When to denormalize: read-heavy paths where the normalized query is provably hot (verified in `pg_stat_statements`), the derived value is read far more than written, and you can guarantee it stays consistent. Default to *not* denormalizing — a counter cache is permanent operational debt.

**Counter cache done correctly.** A naive `+1`/`-1` trigger that only fires on INSERT/DELETE drifts: it misses rows that are *re-parented* (`UPDATE` of the FK), can go negative under concurrent deletes, and starts wrong if the column was added to a non-empty table. Handle all three.

```sql
-- 1. Add the column, then BACKFILL the true value (never trust DEFAULT 0 on existing rows)
ALTER TABLE posts ADD COLUMN comments_count INT NOT NULL DEFAULT 0;
UPDATE posts p
SET comments_count = sub.c
FROM (SELECT post_id, count(*) AS c FROM comments GROUP BY post_id) sub
WHERE p.id = sub.post_id;

-- 2. Trigger covering INSERT, DELETE, *and* re-parenting UPDATEs, with a non-negative floor
CREATE FUNCTION sync_comments_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    -- GREATEST guards against drift sending the count below zero
    UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.post_id IS DISTINCT FROM OLD.post_id THEN
    UPDATE posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
    UPDATE posts SET comments_count = comments_count + 1            WHERE id = NEW.post_id;
  END IF;
  RETURN NULL;
END; $$ LANGUAGE plpgsql;

-- AFTER trigger so the count reflects committed rows; name the UPDATE columns to skip no-op updates
CREATE TRIGGER trg_comments_count
  AFTER INSERT OR DELETE OR UPDATE OF post_id ON comments
  FOR EACH ROW EXECUTE FUNCTION sync_comments_count();
```

Caveats to design for:
- **Concurrency / hotspotting.** Every comment on a viral post serializes on the same `posts` row (row lock for the duration of the transaction). For very hot parents, prefer an append-only `comment_events` ledger summed on read, or batch-aggregate periodically, instead of a per-row trigger.
- **Reconciliation.** Triggers drift over time (replication edge cases, manual `DELETE`s, logical-replication skips). Run a scheduled job that recomputes the truth and alerts on mismatch:
  ```sql
  SELECT p.id FROM posts p
  WHERE p.comments_count <> (SELECT count(*) FROM comments c WHERE c.post_id = p.id);
  ```
- **Alternative: materialized view.** For dashboard-style aggregates that tolerate staleness, a `MATERIALIZED VIEW` with `REFRESH MATERIALIZED VIEW CONCURRENTLY` (requires a unique index) avoids trigger maintenance entirely.

## Indexing Strategies

| Type | Use case | Example |
|------|----------|---------|
| B-tree | Equality, range, sorting (default) | `CREATE INDEX idx_users_email ON users(email)` |
| GIN | JSONB, arrays, full-text search | `CREATE INDEX idx_data ON items USING GIN(metadata)` |
| GiST | Geometric, range types, proximity | PostGIS spatial queries |
| BRIN | Large sequential/time-series tables | `CREATE INDEX idx_ts ON events USING BRIN(created_at)` |
| Composite | Multi-column queries | `CREATE INDEX idx_org_status ON tickets(org_id, status)` |
| Partial | Subset of rows | `CREATE INDEX idx_active ON users(email) WHERE active = true` |

**Composite index rule:** Left-to-right prefix matching. Index on `(a, b, c)` serves queries on `(a)`, `(a, b)`, `(a, b, c)` — not `(b, c)`. Put the most selective *equality* column first, then the column you range/sort on last (`WHERE a = ? AND b = ? ORDER BY c` → `(a, b, c)`).

### Designing the index, not just adding one

**Selectivity decides everything.** An index only helps when it eliminates most rows. As a rule of thumb the planner will skip a plain B-tree if a predicate returns more than ~5–10% of the table — the index + heap fetches cost more than a scan. Check it before guessing:

```sql
SELECT attname, n_distinct, correlation
FROM pg_stats WHERE tablename = 'orders';   -- high |n_distinct| = selective = good index candidate
```

**Covering indexes (`INCLUDE`).** Append non-key columns so a query is served entirely from the index (Index-Only Scan, no heap lookup). Use for hot read paths:

```sql
CREATE INDEX idx_orders_user_covering ON orders (user_id, created_at DESC) INCLUDE (total, status);
-- SELECT total, status FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20;  → Index Only Scan
```

**Expression indexes.** Index the *expression* you actually filter on, or the planner can't use the index:

```sql
CREATE INDEX idx_users_lower_email ON users (lower(email));     -- WHERE lower(email) = lower($1)
CREATE INDEX idx_events_day ON events (date_trunc('day', created_at));
```

**Operator classes** tune an index for a specific operator. The big wins:
- `text_pattern_ops` — lets a B-tree serve `LIKE 'prefix%'`: `CREATE INDEX ON users (email text_pattern_ops);`
- `jsonb_path_ops` — smaller, faster GIN index when you only use the `@>` containment operator: `CREATE INDEX ON events USING gin (metadata jsonb_path_ops);`

**Find missing and unused indexes** (design feedback loop — make this part of every schema review):

```sql
-- Enable once: shared_preload_libraries = 'pg_stat_statements' in postgresql.conf
-- Hottest queries by total time — these are your indexing targets
SELECT query, calls, mean_exec_time, total_exec_time
FROM pg_stat_statements ORDER BY total_exec_time DESC LIMIT 20;

-- Unused indexes (idx_scan = 0) — dead weight on every write; drop them
SELECT relname AS table, indexrelname AS index, idx_scan,
       pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM pg_stat_user_indexes JOIN pg_index USING (indexrelid)
WHERE idx_scan = 0 AND NOT indisunique
ORDER BY pg_relation_size(indexrelid) DESC;
```

Every index is a write-time tax: each INSERT/UPDATE must maintain it, and it consumes cache/WAL. Index for the queries you actually run, then prune. For GIN/GiST/BRIN/pgvector internals and `EXPLAIN ANALYZE` plan-reading, see `postgres-mastery`.

## Query Optimization

```sql
-- Always start here
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;
```

**Key indicators in query plans:**
- `Seq Scan` on a large table where the predicate is *selective* → likely a missing/unusable index. But a Seq Scan is often the **correct** plan — for low-selectivity predicates (returning a large fraction of rows), small fully-cached tables, or when a Parallel Seq Scan beats random index I/O. Don't add an index just because you see "Seq Scan"; only when `actual rows` ≪ table size and the scan is hot.
- `Nested Loop` with high outer-row counts and a high-cost inner side → consider a `Hash Join` (usually a stats/`ANALYZE` problem, or a missing index on the inner join key).
- `Rows Removed by Filter` ≫ `actual rows` → the index (or scan) isn't selective enough; the work to discard rows dominates.
- Estimated rows wildly off from actual (e.g. estimates 10, gets 100k) → stale stats; run `ANALYZE`, or raise `default_statistics_target` / add extended statistics (`CREATE STATISTICS`) for correlated columns.
- High `Buffers: shared read` (vs `shared hit`) → data not cached; check `shared_buffers` and working-set size.

### N+1 Detection and Fixes

The N+1 pattern (1 query for the list + N queries for each row's relation) is the #1 ORM performance bug. Detect it by logging SQL and watching for a repeated parameterized query: in Prisma 7 set `new PrismaClient({ log: ['query'] })`; in Drizzle pass a `logger: true` to the client. Each fires once per row.

```typescript
// Prisma 7.x (the production-recommended line as of Jun 2026; "Prisma Next", the all-TypeScript
// rewrite, is still pre-release — verify the current line at prisma.io/docs)
// BAD: N+1 — one query per user
const users = await prisma.user.findMany();
for (const u of users) {
  const posts = await prisma.post.findMany({ where: { authorId: u.id } }); // N queries
}

// GOOD: eager load the relation in one round trip
const users = await prisma.user.findMany({ include: { posts: true } });

// CAVEAT: Prisma `include` does NOT emit a SQL JOIN by default — it issues a second batched
// `WHERE authorId IN (...)` query (the default "query" join strategy). That's fine and avoids
// row fan-out. If you specifically want a single JOIN, opt in per-query:
const users2 = await prisma.user.findMany({
  relationLoadStrategy: 'join',          // emit one LATERAL JOIN instead of two queries
  include: { posts: true },
});
// Also: `select` only the columns you need — `include` pulls every column of the relation.
```

```typescript
// Drizzle (drizzle-orm 0.45.x stable as of Jun 2026; a 1.0 beta is in flight, so pin your
// version and check the relational-query API in the v1 migration notes). Two idioms — pick by shape:

// (a) Relational query API — batches like Prisma's default, returns a nested object graph:
const usersWithPosts = await db.query.users.findMany({
  with: { posts: { columns: { id: true, title: true } } },  // select only needed columns
});

// (b) Explicit JOIN — one round trip, but FLAT rows with the parent repeated per child.
// You must de-duplicate/group in app code, and a LEFT JOIN multiplies parent rows by child count:
const rows = await db
  .select({ userId: users.id, postId: posts.id })
  .from(users)
  .leftJoin(posts, eq(users.id, posts.authorId));
```

Rule of thumb: a JOIN (idiom b) is one round trip but fans out parent columns across N child rows (more bytes on the wire, app-side grouping). A batched `IN (...)` load (Prisma default, Drizzle `with`) is two cheap queries with no fan-out. For a *single* hot endpoint, hand-write the SQL and shape it exactly; see the JOIN/pagination case studies in `postgres-mastery`.

## Migration Workflow

### Zero-Downtime Checklist (expand-migrate-contract)

Every online schema change follows the same shape: **expand** (add the new thing, backward-compatible), **migrate** (backfill + dual-write while old and new code coexist), **contract** (drop the old thing only after every deploy uses the new). Concretely, to add a required column:

1. **Add the column as nullable, no default** — instant (metadata only). Briefly takes `ACCESS EXCLUSIVE`, so it still queues behind long-running queries; on a busy table guard it with a short lock timeout (below).
2. **Deploy app code that writes the new column** (dual-write) before backfilling, so new rows are already populated.
3. **Backfill existing rows in batches** (see the production template below) — never one giant `UPDATE`.
4. **Add the NOT NULL constraint safely** via a validated `CHECK` (see recipe below) — do *not* run a bare `SET NOT NULL` on a large table.
5. **Deploy app code that reads the new column.**
6. **Contract**: drop the old column / trigger after a confirmation period.

**Always set a lock timeout** so a migration can't park behind a slow query and block the table:

```sql
SET lock_timeout = '3s';        -- fail fast instead of blocking all writes
SET statement_timeout = '0';    -- but allow the statement itself to run (e.g. CREATE INDEX)
```

```bash
# Migration file naming: YYYYMMDDHHMMSS_description.{up,down}.sql
20260101120000_add_users_role.up.sql
20260101120000_add_users_role.down.sql   # every migration ships a tested rollback
```

#### Adding a NOT NULL constraint safely

A bare `ALTER TABLE ... ALTER COLUMN ... SET NOT NULL` rewrites/scans the whole table under `ACCESS EXCLUSIVE`. Instead add a `CHECK (... IS NOT NULL) NOT VALID`, validate it without a write lock, then promote it:

```sql
-- Step 1: add the check WITHOUT scanning existing rows — instant
ALTER TABLE users ADD CONSTRAINT users_role_not_null CHECK (role IS NOT NULL) NOT VALID;

-- Step 2: validate existing rows — takes only SHARE UPDATE EXCLUSIVE (writes keep flowing)
ALTER TABLE users VALIDATE CONSTRAINT users_role_not_null;

-- Step 3 (PG 12+): SET NOT NULL is now nearly instant — the planner reuses the validated
-- CHECK as proof and skips the full-table scan. Then drop the redundant CHECK.
ALTER TABLE users ALTER COLUMN role SET NOT NULL;
ALTER TABLE users DROP CONSTRAINT users_role_not_null;
```

(On PG 11 and earlier, step 3's `SET NOT NULL` still scans; keep the `CHECK` constraint as the enforcement mechanism instead of promoting it.)

#### Lock levels for common DDL (PostgreSQL 12+; verified against PG 18)

| Operation | Lock taken | Blocks reads? | Blocks writes? | Notes |
|-----------|-----------|---------------|----------------|-------|
| `ADD COLUMN` (nullable, no default) | ACCESS EXCLUSIVE (brief) | momentarily | momentarily | Metadata-only; fast but still queues behind long txns |
| `ADD COLUMN ... DEFAULT <const>` | ACCESS EXCLUSIVE (brief) | momentarily | momentarily | **PG 11+**: constant default stored as metadata, no table rewrite |
| `ADD COLUMN ... DEFAULT <volatile>` (e.g. `now()`, a sequence) | ACCESS EXCLUSIVE (long) | yes | yes | Rewrites every row — avoid online; backfill in batches instead |
| `ALTER COLUMN ... SET DEFAULT` | ACCESS EXCLUSIVE (brief) | momentarily | momentarily | Affects future rows only |
| `ALTER COLUMN ... TYPE` | ACCESS EXCLUSIVE (long) | yes | yes | Full rewrite + index rebuild; use add-new-column + backfill instead |
| `SET NOT NULL` (bare) | ACCESS EXCLUSIVE (scan) | yes | yes | Use the validated-CHECK recipe above |
| `ADD FOREIGN KEY` | SHARE ROW EXCLUSIVE on both tables | no | yes | Add `NOT VALID`, then `VALIDATE CONSTRAINT` (SHARE UPDATE EXCLUSIVE) to avoid the write lock during the scan |
| `ADD CHECK ... NOT VALID` | ACCESS EXCLUSIVE (brief) | momentarily | momentarily | No row scan until you `VALIDATE` |
| `VALIDATE CONSTRAINT` | SHARE UPDATE EXCLUSIVE | no | no | Safe online |
| `CREATE INDEX` (plain) | SHARE | no | **yes** | Blocks writes for the whole build |
| `CREATE INDEX CONCURRENTLY` | SHARE UPDATE EXCLUSIVE | no | no | See caveats below |

> Lock-level details evolve across major versions; for the authoritative matrix verify against the "Explicit Locking" page of the PostgreSQL docs for your version (postgresql.org/docs/current/explicit-locking.html).

#### `CREATE INDEX CONCURRENTLY` — use it in production, but mind the sharp edges

```sql
-- Preferred online index build
CREATE INDEX CONCURRENTLY idx_orders_email ON orders (email);
```

- It **cannot run inside a transaction block** — so it can't go in a migration that the tool wraps in `BEGIN/COMMIT`. Run it outside a transaction (Prisma Migrate, Rails, etc. need an explicit "no transaction" annotation; raw scripts must not wrap it).
- On failure (including a lock timeout or a conflicting transaction) it **leaves an INVALID index behind** that still incurs write cost but isn't used. Detect and clean up, then retry:
  ```sql
  SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;   -- find leftovers
  DROP INDEX CONCURRENTLY idx_orders_email;                          -- then re-create
  ```
- It does two table passes and waits out concurrent transactions, so it's slower and won't complete while a long-running transaction is open.

### Production backfill template (batched, throttled, resumable)

A single `UPDATE big_table SET ...` locks every touched row, holds one giant transaction, bloats WAL, and blocks autovacuum — it will take an outage on a large table. Backfill in bounded batches, each its own transaction, with throttling, retries, and observability. Drive it from the app (so you get logging/metrics) rather than a single SQL statement.

```typescript
// Backfill users.role from a legacy column, online. Idempotent and resumable.
const BATCH = 5_000;          // rows per transaction — tune to keep each txn < ~1s
const SLEEP_MS = 200;         // throttle: let replicas catch up & autovacuum breathe
let lastId = 0;
let total = 0;

for (;;) {
  const updated = await withRetry(() =>
    db.transaction(async (tx) => {
      // Keyset pagination on the PK — NOT OFFSET (OFFSET re-scans and slows down).
      // Update only rows still needing it so re-runs are cheap and the job is resumable.
      const rows = await tx.execute(sql`
        WITH batch AS (
          SELECT id FROM users
          WHERE id > ${lastId} AND role IS NULL
          ORDER BY id
          LIMIT ${BATCH}
          FOR UPDATE SKIP LOCKED          -- don't fight live writers; skip locked rows
        )
        UPDATE users u SET role = 'member'
        FROM batch WHERE u.id = batch.id
        RETURNING u.id;
      `);
      return rows;
    }),
  );

  if (updated.length === 0) break;        // done
  lastId = Math.max(...updated.map((r) => r.id));
  total += updated.length;
  console.log(JSON.stringify({ evt: 'backfill', table: 'users', lastId, total }));  // observability

  // Rollback criteria: bail out if the DB is unhealthy so a backfill never causes an incident.
  const lagOk = await replicationLagSeconds() < 30;     // pause if replicas fall behind
  if (!lagOk) await sleep(5_000);
  await sleep(SLEEP_MS);
}
```

Design rules for any backfill:
- **Idempotent + resumable.** Filter on the not-yet-migrated condition (`role IS NULL`) and paginate by primary key, so a crashed job can simply be re-run.
- **Bounded transactions.** One transaction per batch; keep each well under a second to avoid long-lived locks and WAL/vacuum pressure.
- **Throttle to the slowest replica.** Watch replication lag and write throughput; sleep between batches. A backfill should be invisible to users.
- **Retry transient failures** (`deadlock_detected`, `serialization_failure`, lock timeout) with backoff; abort on anything structural.
- **Define rollback criteria up front:** error-rate or replication-lag thresholds that pause/stop the job. The migration's `.down.sql` (or a reverse backfill) must restore the prior state.

## PostgreSQL Power Features

```sql
-- JSONB: query nested data
SELECT * FROM events WHERE payload->>'type' = 'click' AND (payload->'meta'->>'duration')::int > 500;

-- CTE for readability
WITH active_users AS (
  SELECT id FROM users WHERE last_login > NOW() - INTERVAL '30 days'
)
SELECT p.* FROM posts p JOIN active_users u ON p.author_id = u.id;

-- Window function: running total
SELECT date, revenue, SUM(revenue) OVER (ORDER BY date ROWS UNBOUNDED PRECEDING) AS running_total
FROM daily_sales;

-- Table partitioning (range)
CREATE TABLE events (id BIGINT, created_at TIMESTAMPTZ, data JSONB)
  PARTITION BY RANGE (created_at);
CREATE TABLE events_2026_q1 PARTITION OF events
  FOR VALUES FROM ('2026-01-01') TO ('2026-04-01');
```

## Connection Pooling

Use **PgBouncer** in `transaction` mode for serverless/high-connection environments:

```ini
# pgbouncer.ini
[databases]
mydb = host=127.0.0.1 dbname=mydb
[pgbouncer]
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
```

**Sizing.** There is no single multiplier. A useful starting point for active server-side connections is `((core_count * 2) + effective_spindle_count)` (≈ `2-3× cores` on all-SSD), because a connection is either running on a core or waiting on I/O — but the real ceiling is set by your workload, query latency, per-connection `work_mem`, the database's `max_connections`, and **the number of app instances** all sharing the pool. Two hard constraints to respect:

- `max_client_conn` (clients PgBouncer accepts) can be huge; `default_pool_size` (real Postgres connections per database) must stay well under the database's `max_connections`, summed across every PgBouncer/app instance pointing at it.
- More connections is not faster: past the core/I/O budget, added connections only add context-switching and lock contention. Size for *active* queries, not concurrent clients — that's the entire point of `transaction` pooling.

For PgBouncer pool-mode gotchas (prepared statements, session-level features, `SET`/advisory locks under `transaction` mode) see `postgres-mastery`.

## Backup Strategy

| Method | RPO | Use case |
|--------|-----|----------|
| `pg_dump` | Point-in-time | Small DBs, dev restore |
| WAL archiving + `pg_basebackup` | Seconds | Production PITR |
| Logical replication | Near-realtime | Cross-version, selective |

```bash
# Automated daily backup, encrypted at rest (age/GPG) before it leaves the host
pg_dump -Fc --no-owner mydb | zstd | age -r "$BACKUP_PUBKEY" > "backup_$(date +%Y%m%d).dump.zst.age"
# Restore
age -d -i backup.key backup_20260101.dump.zst.age | zstd -d | pg_restore -d mydb --no-owner
```

**A backup you have never restored is not a backup.** Validation is the design requirement, not the dump command:

- **Test-restore cadence.** Automate a periodic restore into a throwaway instance and run a smoke query (row counts, latest timestamp). A restore that hasn't run in the last 30 days is an unverified assumption.
- **PITR drill.** At least quarterly, actually perform a point-in-time recovery to a chosen `recovery_target_time` and confirm the data lands where expected. Measure it so you know your real RTO, not a hoped-for one.
- **Retention / lifecycle.** Define explicit retention (e.g. 7 daily + 4 weekly + 12 monthly) and enforce it (object-store lifecycle rules). Pair RPO/RTO targets with the method: `pg_dump` is hours-old RPO; WAL archiving is seconds.
- **Encryption + access.** Encrypt backups before upload and restrict who can read the bucket and the decryption key — a readable backup bucket is a full database breach.
- **Monitor WAL archiving lag.** For PITR you must know `archive_command` is keeping up; alert on `pg_stat_archiver.last_failed_time` and on growing un-archived WAL (`SELECT last_archived_wal, last_failed_wal FROM pg_stat_archiver;`). Silent archiver failure = no recovery point.

For the full WAL-archiving / `pg_basebackup` / replication runbooks and `postgresql.conf` tuning, see the sibling skill `postgres-mastery`.

## Related skills

- **`postgres-mastery`** — operational PostgreSQL: `EXPLAIN ANALYZE` internals, partitioning automation (`pg_partman`), pgvector, replication, PITR runbooks, and config tuning.
- **`api-design`** — pagination, idempotency keys, and error contracts for the API layer that sits on top of these tables.

