## Response Envelope

```typescript
// Consistent response format
interface ApiResponse<T> {
  data: T;
  meta?: Record<string, any>;
  pagination?: CursorPagination;
}

// Always wrap in { data: ... }
// Single item:  { "data": { "id": "123", "name": "John" } }
// List:         { "data": [...], "pagination": { "next_cursor": "...", "has_more": true } }
// Error:        RFC 9457 Problem Details (no data wrapper)

// Why? Consistent parsing, easy to add metadata, forward-compatible
```

---
