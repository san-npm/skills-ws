---
name: api-design
description: "Production HTTP API design — REST conventions, pagination, error models, versioning, rate limiting, auth, and idempotency. Use when designing or reviewing public/internal HTTP APIs, OpenAPI contracts, pagination, error models, rate limits, auth, or idempotent write endpoints."
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
-- Avoids O(offset) scans entirely: one indexed seek to the cursor position,
-- then reads O(limit) rows — cost stays flat no matter how deep you paginate.
-- The trailing id is the tie-breaker: include a unique column in BOTH the
-- WHERE comparison and ORDER BY, or rows sharing a created_at can be skipped
-- or duplicated across pages.
```

---

## Error Handling: RFC 9457 Problem Details

RFC 9457 (2023) obsoletes RFC 7807 — the wire format is unchanged, so the
object is still universally called "Problem Details" and uses the same
`application/problem+json` media type. Set that content type on error
responses so generic clients and gateways can parse them:

```typescript
res.type('application/problem+json');
```

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

`404 Not Found`:

```json
{
  "type": "https://api.example.com/errors/resource_not_found",
  "title": "resource not found",
  "status": 404,
  "detail": "User with id 'abc-123' not found",
  "instance": "/api/v1/users/abc-123",
  "code": "RESOURCE_NOT_FOUND",
  "traceId": "req-xyz-789"
}
```

`422 Unprocessable Entity` with field-level errors:

```json
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
    // RFC 9745: the value is a structured-field Date (@unix-timestamp), not a
    // boolean. Using the sunset date satisfies RFC 9745's rule that Sunset must
    // not be earlier than Deprecation; pass a separate deprecation date if the
    // API was deprecated before the sunset.
    res.setHeader('Deprecation', `@${Math.floor(new Date(sunset).getTime() / 1000)}`);
    res.setHeader('Sunset', sunset);  // RFC 8594
    res.setHeader('Link', `<${alternative}>; rel="successor-version"`);
    next();
  };
}

// Usage: Sunset must be an HTTP-date (RFC 8594 / RFC 9110), in the future
app.get('/api/v1/users',
  deprecationWarning('Wed, 01 Jul 2026 00:00:00 GMT', '/api/v2/users'),
  v1UserHandler,
);
```

### Versioning Timeline

```
v1 released → v2 released → v1 deprecated (6 month warning) → v1 sunset (returns 410 Gone)
```

---

## Rate Limiting

### Sliding Window Log with Redis (Production)

A sorted set stores one member per request, scored by timestamp. Each call
trims entries older than the window, adds the current request, and counts
what remains — giving an exact rolling count with no fixed-window burst
seam. Cost is O(log N) per request and memory is O(requests-in-window) per
key, so for very high-volume limits prefer a token-bucket / GCRA counter
(constant memory) — see the atomic Lua variant below.

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

    // IETF draft headers (draft-ietf-httpapi-ratelimit-headers, still an
    // Internet-Draft, not an RFC). The latest draft consolidates these into
    // RateLimit and RateLimit-Policy structured fields; the Limit/Remaining/Reset
    // trio below matches earlier drafts and stays the most widely deployed form.
    // `RateLimit-Reset` is seconds-until-reset
    // (a delta), not an epoch timestamp — that's the key difference from the
    // legacy `X-RateLimit-Reset` convention below.
    const resetDelta = Math.max(0, result.resetAt - Math.floor(Date.now() / 1000));
    res.setHeader('RateLimit-Limit', maxRequests);
    res.setHeader('RateLimit-Remaining', result.remaining);
    res.setHeader('RateLimit-Reset', resetDelta);

    // Legacy headers — keep for older clients; `X-RateLimit-Reset` is an epoch.
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', result.resetAt);

    if (!result.allowed) {
      res.setHeader('Retry-After', result.retryAfter!);  // seconds (RFC 9110)
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

### Atomic Token Bucket (Lua) — constant memory, allows bursts

The sliding-window pipeline above is two round-trips and stores one key per
request. A token bucket runs as a single atomic Lua script (no race between
read and write under concurrency), uses O(1) memory per key, and naturally
permits short bursts up to `capacity` while enforcing a steady refill rate.

```typescript
// Refills `refillRate` tokens/sec up to `capacity`; each request costs 1 token.
// KEYS[1] = bucket key. ARGV: capacity, refillRate, now (sec, fractional), cost.
const TOKEN_BUCKET = `
local key        = KEYS[1]
local capacity   = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now        = tonumber(ARGV[3])
local cost       = tonumber(ARGV[4])

local state   = redis.call('HMGET', key, 'tokens', 'ts')
local tokens  = tonumber(state[1])
local ts      = tonumber(state[2])
if tokens == nil then tokens = capacity; ts = now end

-- Refill based on elapsed time, cap at capacity
tokens = math.min(capacity, tokens + (now - ts) * refillRate)

local allowed = 0
if tokens >= cost then
  allowed = 1
  tokens = tokens - cost
end

redis.call('HSET', key, 'tokens', tokens, 'ts', now)
-- Expire when the bucket would be full again (idle reclaim)
redis.call('EXPIRE', key, math.ceil(capacity / refillRate) + 1)

-- Seconds until enough tokens for one request (0 if allowed now)
local retry = 0
if allowed == 0 then retry = (cost - tokens) / refillRate end
return { allowed, tostring(tokens), tostring(retry) }
`;

const sha = await redis.script('LOAD', TOKEN_BUCKET);

async function checkTokenBucket(
  key: string, capacity: number, refillRate: number, cost = 1,
): Promise<RateLimitResult> {
  const now = Date.now() / 1000;
  const [allowed, tokensStr, retryStr] = (await redis.evalsha(
    sha, 1, key, capacity, refillRate, now, cost,
  )) as [number, string, string];
  const remaining = Math.floor(parseFloat(tokensStr));
  const retryAfter = Math.ceil(parseFloat(retryStr));
  return {
    allowed: allowed === 1,
    remaining,
    resetAt: Math.floor(now) + Math.ceil((capacity - remaining) / refillRate),
    ...(allowed === 1 ? {} : { retryAfter }),
  };
}
// e.g. checkTokenBucket('ratelimit:user:42', 100, 100 / 60) → 100 burst, refills to 100/min
```

---

## Authentication Patterns

### JWT Access + Refresh Token (Fastify)

```typescript
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import jwt from '@fastify/jwt';

const app = Fastify();

await app.register(jwt, {
  secret: process.env.JWT_SECRET!,
  sign: { expiresIn: '15m' },  // Short-lived access tokens
});

// Decorate the `authenticate` preHandler used by protected routes below.
// Without this decorator the `preHandler: [app.authenticate]` example throws.
app.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();  // populates request.user from the Bearer token
  } catch {
    throw new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid access token');
  }
});

// TypeScript: augment Fastify so `app.authenticate` and `request.user` type-check.
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: string };  // sign() input
    user: { sub: string; role: string };     // request.user shape
  }
}

// Refresh tokens use a SELECTOR.SECRET design so lookup is a single indexed
// query, never a scan over every active hash:
//   - selector: random id, stored in plaintext, UNIQUE-indexed — used to find the row
//   - secret:   random, stored only as an argon2 hash — verified in constant time
//   - familyId: groups every token descended from one login, so reuse of a
//               rotated token can revoke the whole family (theft detection)
// Wire format handed to the client is `${selector}.${secret}`.
function issueRefreshToken(userId: string, familyId: string) {
  const selector = crypto.randomBytes(16).toString('base64url');
  const secret = crypto.randomBytes(32).toString('base64url');
  return { token: `${selector}.${secret}`, selector, secret, familyId, userId };
}

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Login
app.post('/api/v1/auth/login', async (req, reply) => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await db.findUserByEmail(email);
  if (!user || !await argon2.verify(user.passwordHash, password)) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const accessToken = app.jwt.sign({ sub: user.id, role: user.role });
  const familyId = crypto.randomUUID();
  const rt = issueRefreshToken(user.id, familyId);

  await db.storeRefreshToken({
    selector: rt.selector,
    secretHash: await argon2.hash(rt.secret),  // never store the raw secret
    userId: rt.userId,
    familyId: rt.familyId,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });

  reply.send({ accessToken, refreshToken: rt.token, expiresIn: 900 });
});

// Refresh — rotate, and detect reuse of an already-rotated token
app.post('/api/v1/auth/refresh', async (req, reply) => {
  const { refreshToken } = req.body as { refreshToken: string };
  const [selector, secret] = (refreshToken ?? '').split('.');
  if (!selector || !secret) {
    throw new AppError(401, 'INVALID_TOKEN', 'Malformed refresh token');
  }

  // Single indexed lookup by selector — O(1), no hash scan.
  const row = await db.findRefreshTokenBySelector(selector);
  if (!row || !await argon2.verify(row.secretHash, secret)) {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid refresh token');
  }

  // Reuse detection: a token that's already been consumed/revoked but is
  // presented again means it was likely stolen → kill the whole family.
  if (row.consumedAt || row.revokedAt || row.expiresAt < new Date()) {
    await db.revokeRefreshTokenFamily(row.familyId);
    throw new AppError(401, 'TOKEN_REUSE_DETECTED', 'Refresh token reuse detected; session revoked');
  }

  // Rotate atomically: mark this token consumed and insert its successor in
  // one transaction so a crash can't leave the user with zero valid tokens.
  const rt = issueRefreshToken(row.userId, row.familyId);
  await db.rotateRefreshToken({
    consumeSelector: selector,
    next: {
      selector: rt.selector,
      secretHash: await argon2.hash(rt.secret),
      userId: rt.userId,
      familyId: rt.familyId,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });

  const user = await db.findUser(row.userId);
  const accessToken = app.jwt.sign({ sub: user.id, role: user.role });

  reply.send({ accessToken, refreshToken: rt.token, expiresIn: 900 });
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
  // Pick a prefix unique to your product; do not imitate another vendor's
  // format (sk_live_ is Stripe's), it confuses secret scanners.
  const key = `myapp_live_${crypto.randomBytes(32).toString('base64url')}`;
  const prefix = key.slice(0, 15);  // For identification without exposing key
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

Design rules this middleware enforces:

- **Bind the cache to the full request, not just the key.** Cache under a
  hash of `method + route + authenticated principal + request-body`. Reusing
  one key across two different POSTs (or with a changed body) must NOT replay
  the first response — return `422` on a key/body mismatch instead.
- **Release the lock on every exit path** (`finish`, `close`, and errors),
  not only inside a `res.json` patch — otherwise thrown errors, non-JSON or
  streaming responses, and crashes strand the lock until its short TTL.
- **Cache outcomes intentionally.** Persist deterministic results — `2xx`
  and client errors (`4xx`, e.g. validation) — so retries are stable. Do NOT
  cache `5xx`/timeouts: those are transient and the client should be able to
  retry into a fresh attempt.
- **Two TTLs.** A short *lock* TTL (seconds, in case the process dies mid-flight)
  and a longer *result* TTL (hours/days) for the cached response.

```typescript
// middleware/idempotency.ts
import { createHash } from 'crypto';

const LOCK_TTL = 60;          // seconds — bounds a crash that strands the lock
const RESULT_TTL = 24 * 3600; // seconds — replay window for a completed request

// Endpoints where a missing key is a hard error (money-moving / side-effectful).
const REQUIRE_KEY = [/^\/api\/v1\/payments/, /^\/api\/v1\/transfers/];

function fingerprint(req: Request, key: string): string {
  const principal = (req as any).user?.id ?? (req as any).apiKey?.id ?? 'anon';
  const body = createHash('sha256').update(JSON.stringify(req.body ?? {})).digest('hex');
  // route (not originalUrl) so query strings don't fragment the key
  const route = (req as any).route?.path ?? req.path;
  return createHash('sha256')
    .update([req.method, route, principal, key, body].join('\n'))
    .digest('hex');
}

async function idempotency(req: Request, res: Response, next: NextFunction) {
  if (req.method !== 'POST') return next();

  const idempotencyKey = req.headers['idempotency-key'] as string | undefined;
  if (!idempotencyKey) {
    if (REQUIRE_KEY.some((re) => re.test(req.path))) {
      throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED',
        'Idempotency-Key header is required for this endpoint');
    }
    return next();  // optional elsewhere
  }

  const fp = fingerprint(req, idempotencyKey);
  const resultKey = `idem:res:${fp}`;
  const lockKey = `idem:lock:${fp}`;
  // Detects "same key, different request" → reject rather than replay.
  const keyGuard = `idem:key:${idempotencyKey}`;

  const cached = await redis.get(resultKey);
  if (cached) {
    const { statusCode, body } = JSON.parse(cached);
    res.setHeader('Idempotent-Replayed', 'true');
    return res.status(statusCode).json(body);
  }

  // Reject reuse of the same key with a different method/route/body.
  const priorFp = await redis.set(keyGuard, fp, 'EX', RESULT_TTL, 'NX', 'GET') as string | null;
  if (priorFp && priorFp !== fp) {
    throw new AppError(422, 'IDEMPOTENCY_KEY_REUSED',
      'This Idempotency-Key was already used with a different request');
  }

  const locked = await redis.set(lockKey, '1', 'EX', LOCK_TTL, 'NX');
  if (!locked) {
    throw new AppError(409, 'REQUEST_IN_PROGRESS',
      'A request with this idempotency key is already being processed');
  }

  // Capture the final payload, then persist + unlock on ANY terminal event.
  let captured: { statusCode: number; body: unknown } | undefined;
  const originalJson = res.json.bind(res);
  res.json = (body: unknown) => {
    captured = { statusCode: res.statusCode, body };
    return originalJson(body);
  };

  let settled = false;
  const settle = async () => {
    if (settled) return;
    settled = true;
    // Cache deterministic outcomes (2xx + client errors); never cache 5xx.
    if (captured && captured.statusCode < 500) {
      await redis.set(resultKey, JSON.stringify(captured), 'EX', RESULT_TTL);
    } else {
      await redis.del(keyGuard);  // let the client retry a failed attempt cleanly
    }
    await redis.del(lockKey);     // always release, even on error/stream/abort
  };
  res.on('finish', settle);  // response fully sent
  res.on('close', settle);   // client aborted before finish

  next();
}

app.use('/api/v1', idempotency);
```

> Note: the `SET ... GET` option requires Redis ≥ 7.0. On older servers,
> replace the `keyGuard` step with a `GET` then a `SET ... NX`.

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
          type: [string, "null"]
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
        RateLimit-Limit:        # IETF draft rate-limit headers (draft-ietf-httpapi-ratelimit-headers)
          schema:
            type: integer
        RateLimit-Remaining:
          schema:
            type: integer
        RateLimit-Reset:        # seconds until reset (delta), not epoch
          schema:
            type: integer
        X-RateLimit-Limit:      # legacy, optional
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
// Error:        RFC 9457 Problem Details (no data wrapper)

// Why? Consistent parsing, easy to add metadata, forward-compatible
```

---

## Checklist: Production-Ready API

- [ ] Consistent URL patterns (plural nouns, max 2 levels nesting)
- [ ] Cursor pagination for list endpoints
- [ ] RFC 9457 Problem Details error responses (`application/problem+json`) with field-level errors
- [ ] Rate limiting with `RateLimit-*` headers (IETF draft, draft-ietf-httpapi-ratelimit-headers), optionally legacy `X-RateLimit-*`
- [ ] Idempotency keys for POST endpoints (required for money-moving writes; bound to method+route+body+principal)
- [ ] Request validation from OpenAPI spec
- [ ] API versioning with deprecation/sunset headers
- [ ] Authentication (JWT for users, API keys for services)
- [ ] CORS configured correctly
- [ ] Request/response logging with correlation IDs
- [ ] Compression (gzip/brotli)
- [ ] Health check endpoint (/healthz)
- [ ] OpenAPI spec as source of truth
- [ ] Generated client SDKs from OpenAPI spec
