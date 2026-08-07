## Contents

- Security
- Webhook Signature Verification (Mandatory)
- Timing-Safe Comparison for API Keys
- Rate Limiting
- Secure Key Storage

## Security

### Webhook Signature Verification (Mandatory)

Already covered above. **Never skip this.** Without it, anyone can POST fake events to your webhook endpoint.

### Timing-Safe Comparison for API Keys

```js
const crypto = require('crypto');

// WRONG — vulnerable to timing attacks
// if (providedKey === storedKey) { ... }

// RIGHT — constant-time comparison
function secureCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// For hashed keys (what you should actually do):
// Hash the incoming key, then compare hashes. SHA-256 is fixed-length,
// so timingSafeEqual works perfectly.
function validateKeyHash(providedKey, storedHash) {
  const providedHash = crypto.createHash('sha256').update(providedKey).digest('hex');
  return secureCompare(providedHash, storedHash);
}
```

### Rate Limiting

```js
const rateLimit = require('express-rate-limit');

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

// Per-plan rate limit — pre-create one limiter per plan to avoid
// creating a new rateLimit instance on every request (which resets
// the window each time, making it nonfunctional).
const planLimiters = Object.fromEntries(
  Object.entries(PLAN_LIMITS).map(([plan, limits]) => [
    plan,
    rateLimit({
      windowMs: 60 * 1000,
      max: limits.rpm,
      keyGenerator: (req) => req.userId,
      standardHeaders: true,
      message: {
        error: 'rate_limit_exceeded',
        limit: limits.rpm,
        window: '1m',
      },
    }),
  ])
);

function planRateLimiter(req, res, next) {
  const limiter = planLimiters[req.plan];
  if (!limiter) return res.status(403).json({ error: 'No plan' });
  return limiter(req, res, next);
}

// ⚠️  Do NOT rate-limit the Stripe webhook endpoint by request volume before
// verifying the signature. Stripe legitimately bursts events (backfills,
// migrations, incident recovery) and a 429 just triggers retries, growing a
// backlog and risking dropped events past Stripe's retry window.
//
// Instead: (1) verify the signature first — that IS your authentication and
// rejects forged/replayed payloads; (2) keep the handler cheap by enqueuing
// work and returning 200 fast; (3) protect the box with a generous infra-level
// connection/QPS cap (LB/WAF), not an app-level per-window cap that drops valid
// events. If you must cap in-app, cap AFTER verification and only on bodies that
// fail signature checks (i.e. throttle attackers, never Stripe).
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);
```

### Secure Key Storage

- **Never log full API keys.** Log only the prefix (`myapp_live_a1b2...`).
- **Never store plaintext keys.** Always hash with SHA-256.
- **Rotate webhook secrets** periodically via Stripe Dashboard.
- **Use separate restricted API keys** for different services (read-only for analytics, write for billing).

---
