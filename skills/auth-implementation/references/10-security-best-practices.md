## Contents

- 10. Security Best Practices
- CSRF Protection (do NOT use csurf)
- Secure Cookie Configuration
- Rate Limiting Login Attempts
- Social Login Setup (Google, GitHub, Apple)
- Secure logout / session invalidation

## 10. Security Best Practices

### CSRF Protection (do NOT use `csurf`)

`csurf` has been **deprecated/unmaintained since 2022** — don't add it to new code. Use SameSite cookies as a baseline plus an explicit token defense, and validate `Origin`/`Referer` on state-changing requests.

```javascript
// Option A (recommended for sessions): double-submit signed token via `csrf-csrf`
import { doubleCsrf } from 'csrf-csrf';

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  getSessionIdentifier: (req) => req.session?.id ?? '', // REQUIRED: binds the token to this session
  cookieName: '__Host-csrf',
  cookieOptions: { sameSite: 'strict', secure: true, path: '/', httpOnly: true },
  getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

app.get('/csrf-token', (req, res) => res.json({ csrfToken: generateCsrfToken(req, res) }));
app.use(doubleCsrfProtection); // rejects unsafe methods without a matching token

// Option B (defense in depth): reject state-changing requests from foreign origins
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.get('origin') || req.get('referer') || '';
    const allowed = ['https://app.example.com'];
    if (!allowed.some(a => origin.startsWith(a))) {
      return res.status(403).json({ error: 'Cross-origin request blocked' });
    }
  }
  next();
});
```

For SPAs/mobile using JWT in the `Authorization` header (not cookies), CSRF tokens aren't required — the browser won't auto-attach a header cross-site. **But** if you store any auth state in cookies (including a BFF session), you DO need CSRF defense. `SameSite=Lax/Strict` reduces risk but is not complete: it doesn't cover same-site subdomain attacks, and `Lax` still allows top-level cross-site GETs — so never perform state changes on GET.

### Secure Cookie Configuration

```javascript
res.cookie('__Host-session', token, {
  httpOnly: true,     // JS can't read it (XSS mitigation)
  secure: true,       // HTTPS only
  sameSite: 'strict', // 'lax' only if you need top-level cross-site navigation to stay logged in
  maxAge: 86_400_000, // 24h
  path: '/',
  // __Host- prefix => browser enforces Secure + path=/ + NO Domain (locks cookie to exact host)
});
```

### Rate Limiting Login Attempts

Throttle on **IP and account, normalized**, not just one. The default IP key generator mishandles IPv6 (a whole /64 shares an address) — use `express-rate-limit`'s `ipKeyGenerator` helper. Combine a coarse per-IP limit with a stricter per-account limit, and add account lockout/backoff for repeated failures.

```javascript
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,                  // 10 attempts per key per window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again later.' },
  // Key by account + IP. Normalize email; ipKeyGenerator() handles IPv6 correctly.
  keyGenerator: (req) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    return `${email}|${ipKeyGenerator(req.ip)}`;
  },
});

app.post('/auth/login', loginLimiter, loginHandler);
```

For distributed deployments back the limiter with a shared store (e.g. `rate-limit-redis`) so limits are global, not per-instance. Track consecutive failures per account and apply exponential backoff or temporary lockout, with an audit log entry per failure.

### Social Login Setup (Google, GitHub, Apple)

**Required env vars per provider** (verify scopes/console layout at each link; layouts change):

| Provider | Vars | Console |
|----------|------|---------|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | console.cloud.google.com → APIs & Services → Credentials |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | github.com/settings/developers → OAuth Apps |
| Apple | `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | developer.apple.com → Certificates, IDs & Profiles |

(With Auth.js v5, prefer the auto-inferred `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` form.)

**Callback URLs:** register the exact callback URL(s); no wildcards in production. Keep all client secrets and Apple private keys server-side only — never expose them to the browser bundle.

### Secure logout / session invalidation
- Server sessions: destroy the session record (`req.session.destroy`) and clear the cookie. Don't rely on the client to "forget" the cookie.
- JWTs: keep them short-lived; on logout, delete/revoke the refresh-token family (§2) and, for high-value apps, add the access token's `jti` to a short-TTL blocklist until it expires.
- On password change or detected compromise, revoke **all** of the user's refresh-token families and active sessions.
