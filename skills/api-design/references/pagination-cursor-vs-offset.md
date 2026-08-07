## Contents

- Pagination: Cursor vs Offset
- Offset Pagination (Simple, Flawed)
- Cursor Pagination (Production-Grade)
- Keyset Pagination for Large Datasets

## Pagination: Cursor vs Offset

### Offset Pagination (Simple, Flawed)

```typescript
// Simple but problematic for large datasets
app.get('/api/v1/users', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = (page - 1) * limit;

  const [users, total] = await Promise.all([
    db.query('SELECT * FROM users ORDER BY id LIMIT $1 OFFSET $2', [limit, offset]),
    db.query('SELECT COUNT(*) FROM users'),
  ]);

  res.json({
    data: users.rows,
    pagination: {
      page,
      limit,
      total: parseInt(total.rows[0].count),
      totalPages: Math.ceil(parseInt(total.rows[0].count) / limit),
    },
  });
});
```

**Problems with offset pagination:**
- `OFFSET 100000` scans and discards 100k rows — O(n)
- Inserting/deleting rows between pages causes duplicates/gaps
- COUNT(*) on large tables is slow

### Cursor Pagination (Production-Grade)

```typescript
// Cursor-based — consistent, performant, no skipping
app.get('/api/v1/users', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const cursor = req.query.cursor as string | undefined;

  let query = 'SELECT * FROM users';
  const params: any[] = [limit + 1]; // Fetch one extra to detect hasMore

  if (cursor) {
    const decoded = decodeCursor(cursor); // { id: 123, created_at: '2024-01-01' }
    query += ' WHERE (created_at, id) < ($2, $3)';
    params.push(decoded.created_at, decoded.id);
  }

  query += ' ORDER BY created_at DESC, id DESC LIMIT $1';

  const result = await db.query(query, params);
  const hasMore = result.rows.length > limit;
  const items = hasMore ? result.rows.slice(0, -1) : result.rows;

  const nextCursor = hasMore
    ? encodeCursor({
        id: items[items.length - 1].id,
        created_at: items[items.length - 1].created_at,
      })
    : null;

  res.json({
    data: items,
    pagination: {
      next_cursor: nextCursor,
      has_more: hasMore,
    },
  });
});

// Cursor encoding — base64 JSON (not security, just obfuscation)
function encodeCursor(data: Record<string, any>): string {
  return Buffer.from(JSON.stringify(data)).toString('base64url');
}

function decodeCursor(cursor: string): Record<string, any> {
  return JSON.parse(Buffer.from(cursor, 'base64url').toString());
}
```

### Keyset Pagination for Large Datasets

For tables with 10M+ rows, keyset pagination on an indexed column:

```sql
-- Requires composite index: CREATE INDEX idx_users_created_id ON users(created_at DESC, id DESC);
SELECT * FROM users
WHERE (created_at, id) < ('2024-06-15 10:30:00', 12345)
ORDER BY created_at DESC, id DESC
LIMIT 20;
-- Avoids O(offset) scans entirely: one indexed seek to the cursor position,
-- then reads O(limit) rows — cost stays flat no matter how deep you paginate.
-- The trailing id is the tie-breaker: include a unique column in BOTH the
-- WHERE comparison and ORDER BY, or rows sharing a created_at can be skipped
-- or duplicated across pages.
```

---
