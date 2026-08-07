## Contents

- Rate Limiting
- Sliding Window Log with Redis (Production)
- Atomic Token Bucket (Lua) — constant memory, allows bursts

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
