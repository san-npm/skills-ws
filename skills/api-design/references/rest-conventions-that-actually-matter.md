## Contents

- REST Conventions That Actually Matter
- URL Design
- Filtering, Sorting, Pagination

## REST Conventions That Actually Matter

Forget the academic debates about REST maturity levels. Here's what matters in practice:

### URL Design

```
# Resources are nouns, plural
GET    /api/v1/users              # List users
POST   /api/v1/users              # Create user
GET    /api/v1/users/:id          # Get user
PATCH  /api/v1/users/:id          # Partial update
PUT    /api/v1/users/:id          # Full replace (rare)
DELETE /api/v1/users/:id          # Delete user

# Nesting: max 2 levels deep
GET    /api/v1/users/:id/orders           # User's orders
GET    /api/v1/users/:id/orders/:orderId  # Specific order

# Don't nest deeper — use query params instead
# BAD:  /api/v1/users/:id/orders/:orderId/items/:itemId
# GOOD: /api/v1/order-items/:itemId
# GOOD: /api/v1/orders/:orderId/items?expand=product

# Actions that don't map to CRUD — use verb sub-resources
POST   /api/v1/users/:id/verify-email
POST   /api/v1/orders/:id/cancel
POST   /api/v1/reports/generate
```

### Filtering, Sorting, Pagination

```
# Filtering — use query params with field names
GET /api/v1/users?status=active&role=admin&created_after=2024-01-01

# Sorting — comma-separated, prefix with - for descending
GET /api/v1/users?sort=-created_at,name

# Field selection — reduce payload
GET /api/v1/users?fields=id,name,email

# Search — use q for full-text
GET /api/v1/users?q=john&status=active

# Combining
GET /api/v1/orders?status=pending&sort=-created_at&limit=20&cursor=eyJ...
```

---
