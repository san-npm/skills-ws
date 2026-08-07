## Contents

- 2. EXPLAIN ANALYZE Deep Dive
- Reading the output
- Fixing common problems

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
