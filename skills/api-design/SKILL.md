---
name: api-design
description: "REST, GraphQL, and OpenAPI design patterns with auth, error handling, versioning, and webhook best practices."
---

# API Design

## REST Resource Naming

```
GET    /users                  # List
GET    /users/123              # Get one
POST   /users                  # Create
PUT    /users/123              # Full replace
PATCH  /users/123              # Partial update
DELETE /users/123              # Delete

GET    /users/123/orders       # Sub-resource
POST   /users/123/orders       # Create sub-resource

POST   /orders/123/cancel      # Action (verb OK for non-CRUD)
```

**Rules:** Plural nouns. Lowercase kebab-case. No trailing slashes. No file extensions. Max 2 levels of nesting.

## HTTP Methods & Status Codes

| Method | Success | Idempotent | Body |
|---|---|---|---|
| GET | 200 | Yes | Response only |
| POST | 201 + Location header | No | Request + Response |
| PUT | 200 or 204 | Yes | Request |
| PATCH | 200 | No | Partial request |
| DELETE | 204 | Yes | None |

| Code | When |
|---|---|
| 400 | Validation error, malformed request |
| 401 | Missing or invalid authentication |
| 403 | Authenticated but not authorized |
| 404 | Resource not found |
| 409 | Conflict (duplicate, state mismatch) |
| 422 | Semantically invalid (valid JSON, bad data) |
| 429 | Rate limited |
| 500 | Server error (never leak stack traces) |

## Pagination

```bash
# Cursor-based (recommended — stable, performant)
GET /posts?limit=20&after=eyJpZCI6MTAwfQ

# Response
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTIwfQ",
    "has_more": true
  }
}
```

Offset-based (`?page=3&per_page=20`) is simpler but breaks with concurrent writes. Use cursor for production APIs.

## Filtering & Sorting

```bash
GET /products?status=active&category=electronics&price_min=10&price_max=100
GET /products?sort=-created_at,name    # - prefix = descending
GET /products?fields=id,name,price     # Sparse fieldsets
```

## Error Response (RFC 7807)

```json
{
  "type": "https://api.example.com/errors/insufficient-funds",
  "title": "Insufficient Funds",
  "status": 422,
  "detail": "Account balance is $5.00, but transfer requires $10.00.",
  "instance": "/transfers/abc-123",
  "errors": [
    { "field": "amount", "message": "Exceeds available balance" }
  ]
}
```

Always return `Content-Type: application/problem+json`. Include `errors[]` array for field-level validation.

## Authentication Patterns

| Method | Use Case | Token Location |
|---|---|---|
| **JWT (Bearer)** | User sessions, SPAs | `Authorization: Bearer <token>` |
| **API Key** | Service-to-service, public APIs | `X-API-Key` header or query param |
| **OAuth2** | Third-party integrations | Bearer token via auth code flow |

```bash
# JWT best practices
- Short-lived access tokens (15 min)
- Long-lived refresh tokens (httpOnly cookie)
- Include: sub, iat, exp, roles/permissions
- Never store in localStorage
```

## Rate Limiting

```
# Response headers
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1703275200    # Unix timestamp
Retry-After: 60                   # On 429 response
```

Strategies: **Token bucket** (bursty), **Sliding window** (smooth), **Fixed window** (simple). Scope per API key or user. Return `429` with `Retry-After`.

## API Versioning

| Strategy | Example | Pros | Cons |
|---|---|---|---|
| **URL path** | `/v2/users` | Obvious, cacheable | URL pollution |
| **Header** | `Accept: application/vnd.api+json;v=2` | Clean URLs | Hidden |
| **Query** | `/users?version=2` | Easy | Caching issues |

**Recommendation:** URL path for public APIs, header for internal. Support N-1 versions. Deprecate with `Sunset` header + docs.

## OpenAPI 3.1 Spec

```yaml
openapi: "3.1.0"
info:
  title: Users API
  version: "2.0.0"
paths:
  /users:
    get:
      summary: List users
      parameters:
        - name: limit
          in: query
          schema: { type: integer, default: 20, maximum: 100 }
        - name: after
          in: query
          schema: { type: string }
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/UserList"
```

Generate from code: `tsoa`, `nestjs/swagger`, `fastify-swagger`. Validate requests against spec with middleware.

See `references/openapi-template.yaml` for a full starter spec.

## GraphQL Schema Design

```graphql
type Query {
  user(id: ID!): User
  users(first: Int = 20, after: String): UserConnection!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
}

type UserEdge {
  node: User!
  cursor: String!
}
```

**Rules:** Use Relay connection spec for pagination. Prefer input types for mutations. Use DataLoader for N+1. Set query depth/complexity limits.

## CORS Configuration

```javascript
// Express
app.use(cors({
  origin: ['https://app.example.com'],  // Never use '*' with credentials
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400  // Cache preflight for 24h
}));
```

## Webhook Design

```json
// POST to subscriber URL
{
  "id": "evt_abc123",
  "type": "order.completed",
  "created_at": "2025-01-15T10:30:00Z",
  "data": { "order_id": "ord_456", "total": 99.99 }
}
```

**Checklist:**
- [ ] Sign payloads with HMAC-SHA256 (`X-Signature` header)
- [ ] Retry with exponential backoff (1s, 5s, 30s, 5m, 30m)
- [ ] Include event `id` for idempotent processing
- [ ] Allow subscribers to verify with a challenge/ping
- [ ] Log delivery attempts and expose status in dashboard
- [ ] Timeout webhook calls at 10s

See `references/webhook-signing.md` for HMAC verification examples.

## API Design Checklist

- [ ] Resources are nouns, actions use HTTP methods
- [ ] Consistent error format (RFC 7807) across all endpoints
- [ ] Pagination on all list endpoints
- [ ] Rate limiting with proper headers
- [ ] Auth on every endpoint (explicit public exceptions)
- [ ] Request validation with clear error messages
- [ ] Idempotency keys for non-idempotent mutations
- [ ] OpenAPI spec generated and published
- [ ] Versioning strategy documented
- [ ] CORS configured (not `*` with credentials)

