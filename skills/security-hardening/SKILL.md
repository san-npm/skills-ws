---
name: security-hardening
description: "Comprehensive web application security hardening covering OWASP Top 10, secure headers, authentication, and dependency auditing."
---

# Security Hardening

## OWASP Top 10 (2021) — Quick Reference & Fixes

| # | Vulnerability | Primary Defense |
|---|--------------|----------------|
| A01 | Broken Access Control | RBAC, deny-by-default, server-side checks |
| A02 | Cryptographic Failures | TLS everywhere, AES-256, Argon2 for passwords |
| A03 | Injection | Parameterized queries, input validation |
| A04 | Insecure Design | Threat modeling, secure design patterns |
| A05 | Security Misconfiguration | Hardened defaults, no stack traces in prod |
| A06 | Vulnerable Components | `npm audit`, Snyk, Socket, Dependabot |
| A07 | Auth & ID Failures | MFA, bcrypt/argon2, session invalidation |
| A08 | Software & Data Integrity | Subresource integrity, signed deploys, lock files |
| A09 | Logging & Monitoring Failures | Structured logging, alerting on auth failures |
| A10 | SSRF | Allowlist outbound URLs, block metadata IPs |

## SQL Injection Prevention

```javascript
// ❌ NEVER
db.query(`SELECT * FROM users WHERE id = ${req.params.id}`);

// ✅ Parameterized query (pg)
db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);

// ✅ ORM (Prisma)
await prisma.user.findUnique({ where: { id: parseInt(req.params.id) } });
```

## XSS Prevention

```javascript
// Output encoding (server-side)
import escapeHtml from 'escape-html';
res.send(`<p>${escapeHtml(userInput)}</p>`);

// DOMPurify (client-side)
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(untrustedHTML);

// React: avoid dangerouslySetInnerHTML — if unavoidable, sanitize first
```

## Content Security Policy

```
Content-Security-Policy:
  default-src 'none';
  script-src 'self';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
  font-src 'self';
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

Start strict, loosen per-directive as needed. Use `Content-Security-Policy-Report-Only` first.

## CSRF Protection

```javascript
// Express with csurf (or csrf-csrf for double-submit)
import { doubleCsrf } from 'csrf-csrf';
const { doubleCsrfProtection } = doubleCsrf({ getSecret: () => process.env.CSRF_SECRET });
app.use(doubleCsrfProtection);

// Cookie hardening
res.cookie('session', token, {
  httpOnly: true, secure: true, sameSite: 'Strict', maxAge: 3600000
});
```

## Authentication Best Practices

```javascript
// Password hashing — Argon2 preferred, bcrypt acceptable
import argon2 from 'argon2';
const hash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 65536, timeCost: 3 });
const valid = await argon2.verify(hash, password);

// bcrypt fallback
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 12); // cost factor ≥12
```

**MFA**: TOTP via `otpauth` library. Store recovery codes hashed. Enforce MFA for admin roles.

## JWT Security

```javascript
// Short-lived access token + refresh token rotation
const accessToken = jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: '15m' });
const refreshToken = jwt.sign({ sub: user.id, jti: uuid() }, REFRESH_SECRET, { expiresIn: '7d' });

// Store refresh token hash in DB, invalidate on rotation
// ALWAYS set in httpOnly cookie, never localStorage
res.cookie('access_token', accessToken, { httpOnly: true, secure: true, sameSite: 'Strict' });
```

## Security Headers (Express/Helmet)

```javascript
import helmet from 'helmet';
app.use(helmet({
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
  frameguard: { action: 'deny' },
  contentSecurityPolicy: { directives: { /* see CSP above */ } },
}));
// Also set: X-Content-Type-Options: nosniff (helmet default)
```

## Rate Limiting

```javascript
import rateLimit from 'express-rate-limit';
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true }));
```

## CORS Configuration

```javascript
app.use(cors({
  origin: ['https://app.example.com'],  // never '*' with credentials
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
```

## Dependency Auditing

```bash
npm audit --audit-level=high          # built-in
npx snyk test                         # Snyk CLI
npx socket optimize                   # Socket.dev — detects supply chain attacks
```

Automate in CI. Block merges on high/critical findings.

## Secrets Management

- **Never** commit secrets. Use `.env` + `.gitignore`, or Vault/AWS SSM/GCP Secret Manager.
- Rotate secrets on suspected compromise. Use short-lived credentials where possible.
- `git-secrets` or `gitleaks` in pre-commit hooks to prevent leaks.

## HTTPS Enforcement

```nginx
server {
  listen 80;
  return 301 https://$host$request_uri;
}
```

## Security Audit Checklist

- [ ] All queries parameterized / ORM-only
- [ ] CSP header deployed (report-only → enforced)
- [ ] HSTS with preload submitted
- [ ] httpOnly + Secure + SameSite on all cookies
- [ ] Rate limiting on auth and sensitive endpoints
- [ ] Dependency audit clean (high/critical)
- [ ] Secrets not in repo (gitleaks passing)
- [ ] MFA available for all users, enforced for admins
- [ ] CORS allowlist — no wildcards with credentials
- [ ] Logging on auth failures, privilege escalation attempts

See `references/` for OWASP cheat sheets and header configuration examples.

