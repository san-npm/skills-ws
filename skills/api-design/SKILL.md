---
name: api-design
description: "Production API design — REST conventions, pagination, error handling, versioning, rate limiting, authentication, idempotency, and OpenAPI specs."
---

# API Design

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
-- Always O(1) with the right index, regardless of how deep you paginate
```

---

## Error Handling: RFC 7807 Problem Details

### Standard Error Response

```typescript
// types/error.ts
interface ProblemDetail {
  type: string;          // URI reference identifying the error type
  title: string;         // Human-readable summary
  status: number;        // HTTP status code
  detail?: string;       // Human-readable explanation specific to this occurrence
  instance?: string;     // URI reference identifying this specific occurrence
  // Extensions
  errors?: FieldError[]; // Field-level validation errors
  code?: string;         // Machine-readable error code
  traceId?: string;      // For debugging
}

interface FieldError {
  field: string;
  message: string;
  code: string;
}
```

### Error Handler Middleware

```typescript
// middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express';

class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public errors?: FieldError[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Specific error classes
class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(404, 'RESOURCE_NOT_FOUND', `${resource} with id '${id}' not found`);
  }
}

class ValidationError extends AppError {
  constructor(errors: FieldError[]) {
    super(422, 'VALIDATION_ERROR', 'Request validation failed', errors);
  }
}

class ConflictError extends AppError {
  constructor(message: string) {
    super(409, 'CONFLICT', message);
  }
}

class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super(429, 'RATE_LIMITED', `Rate limit exceeded. Retry after ${retryAfter}s`);
  }
}

// The error handler
function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.headers['x-request-id'] as string;

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      type: `https://api.example.com/errors/${err.code.toLowerCase()}`,
      title: err.code.replace(/_/g, ' ').toLowerCase(),
      status: err.statusCode,
      detail: err.message,
      instance: req.originalUrl,
      code: err.code,
      errors: err.errors,
      traceId: requestId,
    });
  }

  // Unexpected errors — log full details, return generic message
  req.log?.error({ err }, 'Unhandled error');

  res.status(500).json({
    type: 'https://api.example.com/errors/internal',
    title: 'Internal Server Error',
    status: 500,
    detail: 'An unexpected error occurred',
    instance: req.originalUrl,
    code: 'INTERNAL_ERROR',
    traceId: requestId,
  });
}

app.use(errorHandler);
```

### Usage

```typescript
app.get('/api/v1/users/:id', async (req, res) => {
  const user = await db.findUser(req.params.id);
  if (!user) throw new NotFoundError('User', req.params.id);
  res.json({ data: user });
});

app.post('/api/v1/users', async (req, res) => {
  const errors: FieldError[] = [];
  if (!req.body.email) errors.push({ field: 'email', message: 'Email is required', code: 'REQUIRED' });
  if (!req.body.name) errors.push({ field: 'name', message: 'Name is required', code: 'REQUIRED' });
  if (errors.length) throw new ValidationError(errors);

  const existing = await db.findUserByEmail(req.body.email);
  if (existing) throw new ConflictError('A user with this email already exists');

  const user = await db.createUser(req.body);
  res.status(201).json({ data: user });
});
```

### Error Response Examples

```json
// 404
{
  "type": "https://api.example.com/errors/resource_not_found",
  "title": "resource not found",
  "status": 404,
  "detail": "User with id 'abc-123' not found",
  "instance": "/api/v1/users/abc-123",
  "code": "RESOURCE_NOT_FOUND",
  "traceId": "req-xyz-789"
}

// 422 with field-level errors
{
  "type": "https://api.example.com/errors/validation_error",
  "title": "validation error",
  "status": 422,
  "detail": "Request validation failed",
  "code": "VALIDATION_ERROR",
  "errors": [
    { "field": "email", "message": "Must be a valid email address", "code": "INVALID_FORMAT" },
    { "field": "age", "message": "Must be at least 18", "code": "MIN_VALUE" }
  ]
}
```

---

## API Versioning

### URL Versioning (Preferred for Public APIs)

```
/api/v1/users
/api/v2/users
```

Simple, explicit, easy to route. The pragmatic choice.

### Header Versioning (Alternative)

```
Accept: application/vnd.myapi.v2+json
```

More "RESTful" but harder to test (can't just paste a URL).

### Deprecation Strategy

```typescript
// middleware/deprecation.ts
function deprecationWarning(sunset: string, alternative: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', sunset);  // RFC 8594
    res.setHeader('Link', `<${alternative}>; rel="successor-version"`);
    next();
  };
}

// Usage
app.get('/api/v1/users',
  deprecationWarning('2025-06-01', '/api/v2/users'),
  v1UserHandler,
);
```

### Versioning Timeline

```
v1 released → v2 released → v1 deprecated (6 month warning) → v1 sunset (returns 410 Gone)
```

---

## Rate Limiting

### Token Bucket with Redis (Production)

```typescript
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - windowSeconds;

  // Sliding window log using sorted set
  const pipeline = redis.pipeline();
  pipeline.zremrangebyscore(key, 0, windowStart);      // Remove old entries
  pipeline.zadd(key, now.toString(), `${now}:${Math.random()}`);  // Add current
  pipeline.zcard(key);                                   // Count in window
  pipeline.expire(key, windowSeconds);                   // TTL cleanup

  const results = await pipeline.exec();
  const count = results![2][1] as number;

  if (count > maxRequests) {
    const oldestInWindow = await redis.zrange(key, 0, 0, 'WITHSCORES');
    const retryAfter = oldestInWindow.length >= 2
      ? parseInt(oldestInWindow[1]) + windowSeconds - now
      : windowSeconds;

    return {
      allowed: false,
      remaining: 0,
      resetAt: now + retryAfter,
      retryAfter,
    };
  }

  return {
    allowed: true,
    remaining: maxRequests - count,
    resetAt: now + windowSeconds,
  };
}

// Middleware
function rateLimit(maxRequests: number, windowSeconds: number) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Per-user if authenticated, per-IP otherwise
    const key = req.user
      ? `ratelimit:user:${req.user.id}`
      : `ratelimit:ip:${req.ip}`;

    const result = await checkRateLimit(key, maxRequests, windowSeconds);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetAt);

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter!);
      throw new RateLimitError(result.retryAfter!);
    }

    next();
  };
}

// Different limits for different endpoints
app.use('/api/v1/auth', rateLimit(10, 60));       // 10/min for auth
app.use('/api/v1/', rateLimit(100, 60));           // 100/min general
app.use('/api/v1/search', rateLimit(30, 60));      // 30/min for search
```

---

## Authentication Patterns

### JWT Access + Refresh Token (Fastify)

```typescript
import Fastify from 'fastify';
import jwt from '@fastify/jwt';

const app = Fastify();

await app.register(jwt, {
  secret: process.env.JWT_SECRET!,
  sign: { expiresIn: '15m' },  // Short-lived access tokens
});

// Login
app.post('/api/v1/auth/login', async (req, reply) => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await db.findUserByEmail(email);
  if (!user || !await argon2.verify(user.passwordHash, password)) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const accessToken = app.jwt.sign({ sub: user.id, role: user.role });
  const refreshToken = crypto.randomUUID();

  // Store refresh token in DB (hashed)
  await db.storeRefreshToken({
    token: await argon2.hash(refreshToken),
    userId: user.id,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  reply.send({ accessToken, refreshToken, expiresIn: 900 });
});

// Refresh
app.post('/api/v1/auth/refresh', async (req, reply) => {
  const { refreshToken } = req.body as { refreshToken: string };

  const stored = await db.findActiveRefreshTokens(/* all for user */);
  const match = await findMatchingToken(stored, refreshToken);

  if (!match) {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid refresh token');
  }

  // Rotate: invalidate old, issue new
  await db.revokeRefreshToken(match.id);

  const user = await db.findUser(match.userId);
  const accessToken = app.jwt.sign({ sub: user.id, role: user.role });
  const newRefreshToken = crypto.randomUUID();

  await db.storeRefreshToken({
    token: await argon2.hash(newRefreshToken),
    userId: user.id,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  reply.send({ accessToken, refreshToken: newRefreshToken, expiresIn: 900 });
});

// Protected route
app.get('/api/v1/me', {
  preHandler: [app.authenticate],
}, async (req, reply) => {
  const user = await db.findUser(req.user.sub);
  reply.send({ data: user });
});
```

### API Keys (Service-to-Service)

```typescript
// Generate API keys
function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `sk_live_${crypto.randomBytes(32).toString('base64url')}`;
  const prefix = key.slice(0, 12);  // For identification without exposing key
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return { key, hash, prefix };
}

// Validate — always compare hashes, never raw keys
async function validateApiKey(key: string): Promise<ApiKeyRecord | null> {
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return db.findApiKeyByHash(hash);
}

// Middleware
async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['x-api-key'] as string
    || req.headers.authorization?.replace('Bearer ', '');

  if (!key) throw new AppError(401, 'MISSING_API_KEY', 'API key required');

  const record = await validateApiKey(key);
  if (!record) throw new AppError(401, 'INVALID_API_KEY', 'Invalid API key');
  if (record.revokedAt) throw new AppError(401, 'REVOKED_API_KEY', 'API key has been revoked');

  req.apiKey = record;
  next();
}
```

---

## Idempotency

### Idempotency Keys for Safe Retries

```typescript
// middleware/idempotency.ts
async function idempotency(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'POST') return next();

  const idempotencyKey = req.headers['idempotency-key'] as string;
  if (!idempotencyKey) return next();  // Optional — proceed without

  // Check for existing result
  const cached = await redis.get(`idempotency:${idempotencyKey}`);
  if (cached) {
    const { statusCode, body } = JSON.parse(cached);
    return res.status(statusCode).json(body);
  }

  // Lock to prevent concurrent duplicate processing
  const lockKey = `idempotency:lock:${idempotencyKey}`;
  const locked = await redis.set(lockKey, '1', 'EX', 60, 'NX');
  if (!locked) {
    return res.status(409).json({
      type: 'https://api.example.com/errors/concurrent_request',
      title: 'Concurrent request',
      status: 409,
      detail: 'A request with this idempotency key is already being processed',
    });
  }

  // Intercept response to cache it
  const originalJson = res.json.bind(res);
  res.json = (body: any) => {
    redis.set(
      `idempotency:${idempotencyKey}`,
      JSON.stringify({ statusCode: res.statusCode, body }),
      'EX', 86400,  // Cache for 24 hours
    );
    redis.del(lockKey);
    return originalJson(body);
  };

  next();
}

app.use('/api/v1', idempotency);
```

Client usage:
```typescript
// Client retries safely
const response = await fetch('/api/v1/payments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Idempotency-Key': crypto.randomUUID(),  // Generate once, retry with same key
  },
  body: JSON.stringify({ amount: 5000, currency: 'usd' }),
});
```

---

## OpenAPI 3.1 Specification

### Complete Example

```yaml
openapi: 3.1.0
info:
  title: Users API
  version: 1.0.0
  description: User management API
  contact:
    email: api@example.com
  license:
    name: MIT

servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://staging-api.example.com/v1
    description: Staging

security:
  - bearerAuth: []

paths:
  /users:
    get:
      operationId: listUsers
      summary: List users
      tags: [Users]
      parameters:
        - name: cursor
          in: query
          schema:
            type: string
        - name: limit
          in: query
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: status
          in: query
          schema:
            type: string
            enum: [active, inactive, suspended]
        - name: sort
          in: query
          schema:
            type: string
            default: -created_at
      responses:
        '200':
          description: Users list
          content:
            application/json:
              schema:
                type: object
                required: [data, pagination]
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
                  pagination:
                    $ref: '#/components/schemas/CursorPagination'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '429':
          $ref: '#/components/responses/RateLimited'

    post:
      operationId: createUser
      summary: Create user
      tags: [Users]
      parameters:
        - name: Idempotency-Key
          in: header
          schema:
            type: string
            format: uuid
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    $ref: '#/components/schemas/User'
        '422':
          $ref: '#/components/responses/ValidationError'

components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
    apiKey:
      type: apiKey
      in: header
      name: X-API-Key

  schemas:
    User:
      type: object
      required: [id, email, name, status, created_at]
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
        status:
          type: string
          enum: [active, inactive, suspended]
        created_at:
          type: string
          format: date-time
        updated_at:
          type: string
          format: date-time

    CreateUserRequest:
      type: object
      required: [email, name]
      properties:
        email:
          type: string
          format: email
        name:
          type: string
          minLength: 1
          maxLength: 100
        role:
          type: string
          enum: [user, admin]
          default: user

    CursorPagination:
      type: object
      properties:
        next_cursor:
          type: string
          nullable: true
        has_more:
          type: boolean

    ProblemDetail:
      type: object
      required: [type, title, status]
      properties:
        type:
          type: string
          format: uri
        title:
          type: string
        status:
          type: integer
        detail:
          type: string
        code:
          type: string
        errors:
          type: array
          items:
            type: object
            properties:
              field:
                type: string
              message:
                type: string
              code:
                type: string

  responses:
    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ProblemDetail'

    ValidationError:
      description: Validation failed
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ProblemDetail'

    RateLimited:
      description: Rate limit exceeded
      headers:
        Retry-After:
          schema:
            type: integer
        X-RateLimit-Limit:
          schema:
            type: integer
        X-RateLimit-Remaining:
          schema:
            type: integer
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ProblemDetail'
```

### Validation Middleware from OpenAPI Spec

```typescript
import { OpenApiValidator } from 'express-openapi-validator';

app.use(
  OpenApiValidator.middleware({
    apiSpec: './openapi.yaml',
    validateRequests: true,
    validateResponses: process.env.NODE_ENV !== 'production',  // Dev only
    validateSecurity: false,  // Handle auth separately
  }),
);
```

---

## GraphQL vs REST: Decision Matrix

| Factor | REST | GraphQL |
|--------|------|---------|
| **Use when** | CRUD-heavy, well-defined resources | Complex relationships, varying client needs |
| **Caching** | HTTP caching works perfectly | Requires custom caching (Apollo, Relay) |
| **Versioning** | URL versioning, straightforward | Schema evolution, deprecation directives |
| **File uploads** | Multipart form, straightforward | Requires separate upload endpoint or multipart spec |
| **Real-time** | SSE, WebSocket (separate) | Subscriptions (built-in) |
| **Tooling** | Mature (Postman, curl) | Specialized (GraphiQL, Apollo DevTools) |
| **N+1 problem** | Solved by design (one endpoint = one response) | Requires DataLoader |
| **Mobile** | Over-fetching without field selection | Precise data fetching |
| **Team size** | Any | Better with dedicated frontend/backend teams |

**Strong REST signals:** Public API, simple CRUD, caching matters, small team.
**Strong GraphQL signals:** Multiple clients (web, mobile, partners) with different data needs, deeply nested relationships, rapid frontend iteration.

**Don't use GraphQL because it's trendy.** Use it when you genuinely have the data-fetching complexity that justifies it.

---

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
// Error:        RFC 7807 (no data wrapper)

// Why? Consistent parsing, easy to add metadata, forward-compatible
```

---

## Checklist: Production-Ready API

- [ ] Consistent URL patterns (plural nouns, max 2 levels nesting)
- [ ] Cursor pagination for list endpoints
- [ ] RFC 7807 error responses with field-level errors
- [ ] Rate limiting with proper headers (X-RateLimit-*)
- [ ] Idempotency keys for POST endpoints
- [ ] Request validation from OpenAPI spec
- [ ] API versioning with deprecation/sunset headers
- [ ] Authentication (JWT for users, API keys for services)
- [ ] CORS configured correctly
- [ ] Request/response logging with correlation IDs
- [ ] Compression (gzip/brotli)
- [ ] Health check endpoint (/healthz)
- [ ] OpenAPI spec as source of truth
- [ ] Generated client SDKs from OpenAPI spec
