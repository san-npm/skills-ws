## Rate Limiting: Distributed with Redis

```typescript
import { rateLimit, ipKeyGenerator } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Tiered rate limiting
const publicLimit = rateLimit({
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  // Per-IP keying is the default and handles IPv6 correctly; do NOT set
  // keyGenerator: (req) => req.ip, which v8 flags (ERR_ERL_KEY_GEN_IPV6):
  // IPv6 clients can rotate through their address block to bypass the limit.
  handler: (req, res) => {
    res.status(429).json({
      type: 'https://api.example.com/errors/rate_limited',
      title: 'Rate limit exceeded',
      status: 429,
      detail: 'Too many requests. Please retry later.',
    });
  },
});

const authenticatedLimit = rateLimit({
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  windowMs: 60 * 1000,
  limit: 100,
  // ipKeyGenerator applies IPv6 subnet masking so the fallback stays bypass-proof.
  keyGenerator: (req) => req.user?.id ?? ipKeyGenerator(req.ip),
});

app.use('/api/', publicLimit);
app.use('/api/', authenticate, authenticatedLimit);
```

---
