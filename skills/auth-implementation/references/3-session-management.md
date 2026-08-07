## Contents

- 3. Session Management
- Cookie-Based Sessions (Traditional / BFF)
- Cookie vs Token Comparison

## 3. Session Management

### Cookie-Based Sessions (Traditional / BFF)

```javascript
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect();

app.set('trust proxy', 1); // required behind a TLS-terminating proxy so secure cookies work
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,   // rotate via an array: [newSecret, oldSecret]
  resave: false,
  saveUninitialized: false,
  name: '__Host-session',               // __Host- prefix: requires Secure, path=/, no Domain
  cookie: {
    secure: true,       // HTTPS only
    httpOnly: true,     // no JS access (XSS can't read it)
    sameSite: 'lax',    // mitigates cross-site POST CSRF (not a complete defense — see §10)
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
    // NOTE: __Host- forbids `domain`. Drop the prefix if you need a shared parent domain.
  },
}));

// Regenerate the session ID on privilege change to prevent session fixation:
app.post('/auth/login', loginLimiter, async (req, res) => {
  // ... verify credentials ...
  req.session.regenerate((err) => {
    if (err) return res.status(500).end();
    req.session.userId = user.id;
    res.json({ ok: true });
  });
});
```

### Cookie vs Token Comparison

| Aspect | Cookie Sessions | JWT Access Tokens |
|--------|----------------|-------------------|
| Storage | Server (Redis/DB) | Client — see XSS row |
| Stateless | No (server lookup) | Yes (self-contained) |
| Revocation | Easy (delete from store) | Hard (need blocklist or short TTL) |
| Scalability | Need shared store | No shared state needed |
| XSS exposure | `httpOnly` cookie is unreadable by JS | **Avoid `localStorage`** (JS-readable → XSS steals it). Keep in memory, or use a BFF that holds the token server-side. |
| CSRF exposure | Needs CSRF defense (§10) | Safe **only** if sent in `Authorization` header, not a cookie |
| Mobile | Needs cookie support | Works everywhere |
| Best for | Server-rendered apps, **BFF for SPAs** | Native/mobile, service-to-service |

**2026 browser recommendation:** do not store access tokens in `localStorage`/`sessionStorage`. Either (a) use a **BFF** where the browser holds only an `httpOnly` session cookie and the server attaches tokens to upstream calls, or (b) keep the access token in a JS variable in memory and refresh via an `httpOnly` cookie hitting `/auth/refresh`.

---
