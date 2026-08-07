## Appendix B: Redis Rate Limiter (Production)

```typescript
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

async function checkRateLimitRedis(
  key: string,
  perMinute: number,
  perDay: number
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const minuteKey = `rate:min:${key}`;
  const dayKey = `rate:day:${key}`;

  // Use multi/exec to atomically INCR + set TTL on first creation
  const minutePipeline = redis.multi().incr(minuteKey).ttl(minuteKey);
  const dayPipeline = redis.multi().incr(dayKey).ttl(dayKey);
  const [[minuteCount, minuteTtl], [dayCount, dayTtl]] = await Promise.all([
    minutePipeline.exec().then(r => [r![0][1] as number, r![1][1] as number]),
    dayPipeline.exec().then(r => [r![0][1] as number, r![1][1] as number]),
  ]);

  // Set TTL only if missing (-1 means no expiry, -2 means key gone — guard both)
  if (minuteTtl < 0) await redis.expire(minuteKey, 60);
  if (dayTtl < 0) await redis.expire(dayKey, 86400);

  // Strict > against the post-increment count: allows exactly perMinute/perDay
  // requests, matching the check-then-increment semantics of the §6 limiter.
  if (minuteCount > perMinute) {
    const ttl = await redis.ttl(minuteKey);
    return { allowed: false, retryAfter: ttl };
  }
  if (dayCount > perDay) {
    const ttl = await redis.ttl(dayKey);
    return { allowed: false, retryAfter: ttl };
  }

  return { allowed: true };
}
```
