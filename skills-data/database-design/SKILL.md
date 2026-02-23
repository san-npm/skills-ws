---
name: database-design
description: Schema design, indexing, migrations, query optimization, and PostgreSQL patterns for production systems.
---

# Database Design

## Schema Design Patterns

### Normalization Quick Reference

| Form | Rule | When to break |
|------|------|---------------|
| 1NF | Atomic values, no repeating groups | JSONB arrays for tags/metadata |
| 2NF | No partial dependencies | Denormalized read models |
| 3NF | No transitive dependencies | Caching computed fields |
| BCNF | Every determinant is a candidate key | Rarely broken |

### Denormalization Patterns

```sql
-- Materialized counter cache (avoid COUNT queries)
ALTER TABLE posts ADD COLUMN comments_count INT DEFAULT 0;

-- Trigger to maintain it
CREATE FUNCTION update_comments_count() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END; $$ LANGUAGE plpgsql;
```

## Indexing Strategies

| Type | Use case | Example |
|------|----------|---------|
| B-tree | Equality, range, sorting (default) | `CREATE INDEX idx_users_email ON users(email)` |
| GIN | JSONB, arrays, full-text search | `CREATE INDEX idx_data ON items USING GIN(metadata)` |
| GiST | Geometric, range types, proximity | PostGIS spatial queries |
| BRIN | Large sequential/time-series tables | `CREATE INDEX idx_ts ON events USING BRIN(created_at)` |
| Composite | Multi-column queries | `CREATE INDEX idx_org_status ON tickets(org_id, status)` |
| Partial | Subset of rows | `CREATE INDEX idx_active ON users(email) WHERE active = true` |

**Composite index rule:** Left-to-right prefix matching. Index on `(a, b, c)` serves queries on `(a)`, `(a, b)`, `(a, b, c)` — not `(b, c)`.

## Query Optimization

```sql
-- Always start here
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT ...;
```

**Key indicators in query plans:**
- `Seq Scan` on large tables → missing index
- `Nested Loop` with high row counts → consider `Hash Join` via better stats
- `Rows Removed by Filter` ≫ `Actual Rows` → index not selective enough
- High `Buffers: shared read` → data not cached, check `shared_buffers`

### N+1 Detection and Fixes

```typescript
// BAD: N+1 with Prisma
const users = await prisma.user.findMany();
for (const u of users) {
  const posts = await prisma.post.findMany({ where: { authorId: u.id } }); // N queries
}

// GOOD: Eager load
const users = await prisma.user.findMany({ include: { posts: true } });

// GOOD: Drizzle with explicit join
const result = await db.select().from(users).leftJoin(posts, eq(users.id, posts.authorId));
```

## Migration Workflow

### Zero-Downtime Checklist

1. **Add nullable column** (safe, no lock)
2. **Backfill data** in batches (`UPDATE ... WHERE id BETWEEN $1 AND $2`)
3. **Add NOT NULL constraint** using `ALTER TABLE ... ADD CONSTRAINT ... NOT VALID` then `VALIDATE CONSTRAINT`
4. **Deploy app code** using new column
5. **Drop old column** after confirmation period

```bash
# Migration file naming: YYYYMMDDHHMMSS_description.sql
20260101120000_add_users_role.up.sql
20260101120000_add_users_role.down.sql
```

**Dangerous operations (take ACCESS EXCLUSIVE lock):**
- `ALTER TABLE ... ADD COLUMN ... DEFAULT` (PG < 11)
- `ALTER TABLE ... ALTER COLUMN TYPE`
- `CREATE INDEX` without `CONCURRENTLY`

Always use `CREATE INDEX CONCURRENTLY` in production.

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

**Rule of thumb:** `default_pool_size` ≈ 2-3× CPU cores of your database server.

## Backup Strategy

| Method | RPO | Use case |
|--------|-----|----------|
| `pg_dump` | Point-in-time | Small DBs, dev restore |
| WAL archiving + `pg_basebackup` | Seconds | Production PITR |
| Logical replication | Near-realtime | Cross-version, selective |

```bash
# Automated daily backup
pg_dump -Fc --no-owner mydb | zstd > "backup_$(date +%Y%m%d).dump.zst"
# Restore
zstd -d backup_20260101.dump.zst | pg_restore -d mydb --no-owner
```

## References

See `references/` for index tuning guides, migration templates, and ORM comparison matrices.
