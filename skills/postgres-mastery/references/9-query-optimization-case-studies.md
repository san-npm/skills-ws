## Contents

- 9. Query Optimization Case Studies
- Case 1: N+1 query → single JOIN
- Case 2: Pagination done right
- Case 3: COUNT() on large tables
- Case 4: Bulk upsert

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
