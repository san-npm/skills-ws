## Contents

- 1. Index Types — When to Use Each
- B-tree (default) — 95% of your indexes
- GIN — Full-text search, JSONB, arrays
- GiST — Geometric, range types, nearest neighbor
- BRIN — Huge tables with natural ordering
- Index selection cheat sheet

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
