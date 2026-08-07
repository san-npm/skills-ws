## Contents

- Idempotency
- Idempotency Keys for Safe Retries

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
