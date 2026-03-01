---
name: security-hardening
description: "Application security hardening — OWASP Top 10 with real code fixes, authentication, authorization, CORS, CSP, rate limiting, dependency security, and incident response."
---

# Security Hardening

## OWASP Top 10 (2021): Vulnerable Code → Fixed Code

### A01: Broken Access Control

```javascript
// ❌ VULNERABLE: Checking ownership client-side only
app.get('/api/invoices/:id', async (req, res) => {
  const invoice = await db.findInvoice(req.params.id);
  res.json(invoice); // Any authenticated user can view any invoice
});

// ✅ FIXED: Server-side ownership check
app.get('/api/invoices/:id', async (req, res) => {
  const invoice = await db.findInvoice(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Not found' });
  if (invoice.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(invoice);
});
```

### A02: Cryptographic Failures

```javascript
// ❌ VULNERABLE: Weak hashing, secrets in code
const hash = crypto.createHash('md5').update(password).digest('hex');
const JWT_SECRET = 'supersecret123';

// ✅ FIXED: Argon2 + env-based secrets
import argon2 from 'argon2';

const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64 MB
  timeCost: 3,
  parallelism: 4,
});
const isValid = await argon2.verify(hash, password);

const JWT_SECRET = process.env.JWT_SECRET; // 256+ bit, from vault
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}
```

### A03: Injection

```javascript
// ❌ VULNERABLE: SQL injection
app.get('/api/users', async (req, res) => {
  const users = await db.query(`SELECT * FROM users WHERE name = '${req.query.name}'`);
  res.json(users);
});

// ✅ FIXED: Parameterized queries
app.get('/api/users', async (req, res) => {
  const users = await db.query('SELECT * FROM users WHERE name = $1', [req.query.name]);
  res.json(users);
});

// ❌ VULNERABLE: NoSQL injection (MongoDB)
const user = await User.findOne({ email: req.body.email, password: req.body.password });

// ✅ FIXED: Validate types
const email = String(req.body.email);
const password = String(req.body.password);
const user = await User.findOne({ email });
if (!user || !await argon2.verify(user.passwordHash, password)) {
  throw new Error('Invalid credentials');
}
```

### A04: Insecure Design

```javascript
// ❌ VULNERABLE: Password reset with predictable token
const resetToken = String(Math.random()).slice(2);

// ✅ FIXED: Cryptographically secure token, hashed storage
import crypto from 'crypto';

const resetToken = crypto.randomBytes(32).toString('hex');
const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

await db.storeResetToken({
  userId: user.id,
  tokenHash: resetTokenHash,
  expiresAt: new Date(Date.now() + 3600000), // 1 hour
});

// Send resetToken to user via email (never store raw)
// On reset: hash the provided token and compare with stored hash
```

### A05: Security Misconfiguration

```javascript
// ❌ VULNERABLE: Stack traces in production, default headers
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, stack: err.stack });
});

// ✅ FIXED: Helmet + production error handling
import helmet from 'helmet';

app.use(helmet());
app.disable('x-powered-by');

app.use((err, req, res, next) => {
  req.log.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal Server Error'
      : err.message,
  });
});
```

### A06: Vulnerable and Outdated Components

```bash
# Regular audit
npm audit --production
npx better-npm-audit audit --level moderate

# Check for known vulnerabilities
npx socket:npm info  # Socket.dev — detects supply chain attacks

# Lock file integrity
npm ci  # Always use ci, not install, in CI

# Automated PRs for updates
# Use Dependabot or Renovate (Renovate is better for monorepos)
```

### A07: Identification and Authentication Failures

```javascript
// ❌ VULNERABLE: No brute force protection, weak session
app.post('/api/login', async (req, res) => {
  const user = await db.findByEmail(req.body.email);
  if (user && user.password === req.body.password) {
    res.json({ token: jwt.sign({ id: user.id }, SECRET) });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

// ✅ FIXED: Rate limiting, constant-time comparison, proper JWT
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP
  skipSuccessfulRequests: true,
  standardHeaders: true,
});

app.post('/api/login', loginLimiter, async (req, res) => {
  const user = await db.findByEmail(req.body.email);

  // Always hash-compare even if user not found (timing attack prevention)
  const dummyHash = '$argon2id$v=19$m=65536,t=3,p=4$...'; // Pre-computed dummy
  const hash = user?.passwordHash || dummyHash;
  const isValid = await argon2.verify(hash, req.body.password);

  if (!user || !isValid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const accessToken = jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m', algorithm: 'RS256' }
  );

  res.json({ accessToken });
});
```

### A08: Software and Data Integrity Failures

```javascript
// ❌ VULNERABLE: Deserializing untrusted data
const data = JSON.parse(Buffer.from(req.body.payload, 'base64').toString());
await processData(data);

// ✅ FIXED: Validate with schema
import { z } from 'zod';

const PayloadSchema = z.object({
  action: z.enum(['create', 'update', 'delete']),
  resourceId: z.string().uuid(),
  data: z.record(z.unknown()).optional(),
});

app.post('/api/webhook', async (req, res) => {
  // Verify webhook signature
  const signature = req.headers['x-webhook-signature'];
  const expectedSig = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const payload = PayloadSchema.parse(req.body);
  await processData(payload);
  res.status(200).json({ ok: true });
});
```

### A09: Security Logging and Monitoring Failures

```javascript
// ✅ Log security-relevant events
const securityLogger = logger.child({ category: 'security' });

// Failed login attempts
securityLogger.warn({ email, ip: req.ip, userAgent: req.headers['user-agent'] },
  'Failed login attempt');

// Privilege escalation attempts
securityLogger.error({ userId: req.user.id, attempted: 'admin', ip: req.ip },
  'Unauthorized privilege escalation attempt');

// Unusual patterns
securityLogger.warn({ userId: req.user.id, count: requestCount, window: '1m' },
  'Unusual request rate from user');
```

### A10: Server-Side Request Forgery (SSRF)

```javascript
// ❌ VULNERABLE: Fetching arbitrary URLs
app.post('/api/fetch-url', async (req, res) => {
  const response = await fetch(req.body.url);
  res.json(await response.json());
});

// ✅ FIXED: URL validation, block internal networks
import { URL } from 'url';
import ipaddr from 'ipaddr.js';
import dns from 'dns/promises';

async function isUrlSafe(urlString: string): Promise<boolean> {
  try {
    const url = new URL(urlString);

    // Only allow http/https
    if (!['http:', 'https:'].includes(url.protocol)) return false;

    // Resolve hostname
    const addresses = await dns.resolve4(url.hostname);
    for (const addr of addresses) {
      const parsed = ipaddr.parse(addr);
      // Block private, loopback, link-local ranges
      if (parsed.range() !== 'unicast') return false;
    }

    // Block known internal hostnames
    const blocked = ['metadata.google.internal', '169.254.169.254', 'localhost'];
    if (blocked.includes(url.hostname)) return false;

    return true;
  } catch {
    return false;
  }
}

app.post('/api/fetch-url', async (req, res) => {
  if (!await isUrlSafe(req.body.url)) {
    return res.status(400).json({ error: 'URL not allowed' });
  }
  const response = await fetch(req.body.url, {
    redirect: 'error',  // Don't follow redirects (SSRF bypass)
    signal: AbortSignal.timeout(5000),
  });
  res.json(await response.json());
});
```

---

## Authentication Deep Dive

### Bcrypt vs Argon2

| Factor | bcrypt | Argon2id |
|--------|--------|----------|
| Recommended | Legacy systems | New projects |
| Memory-hard | No | Yes (resistant to GPU/ASIC attacks) |
| Configurable | Cost factor only | Memory, time, parallelism |
| OWASP recommendation | Acceptable | Preferred |
| Max password length | 72 bytes | Unlimited |

```javascript
// Argon2id — recommended for new projects
import argon2 from 'argon2';

const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64 MB
  timeCost: 3,        // 3 iterations
  parallelism: 4,     // 4 threads
});

// bcrypt — still acceptable
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 12); // cost factor 12
```

### JWT Pitfalls

```javascript
// ❌ PITFALL 1: Using "none" algorithm
// Attacker can forge tokens by setting alg: "none"
jwt.verify(token, secret); // Some libraries accept alg:none!

// ✅ FIX: Always specify allowed algorithms
jwt.verify(token, publicKey, { algorithms: ['RS256'] });

// ❌ PITFALL 2: Storing sensitive data in JWT payload
jwt.sign({ id: user.id, email: user.email, ssn: user.ssn }, secret);

// ✅ FIX: Minimal payload, look up details server-side
jwt.sign({ sub: user.id, role: user.role }, secret);

// ❌ PITFALL 3: No token revocation
// JWTs are valid until they expire — you can't "log out"

// ✅ FIX: Short expiry (15min) + refresh tokens + token blocklist
const BLOCKLIST = new Set(); // Redis in production
function isTokenBlocked(jti) { return BLOCKLIST.has(jti); }

jwt.sign({ sub: user.id, jti: crypto.randomUUID() }, secret, { expiresIn: '15m' });
```

### MFA Implementation (TOTP)

```javascript
import { authenticator } from 'otplib';
import qrcode from 'qrcode';

// Setup: generate secret and QR code
app.post('/api/mfa/setup', async (req, res) => {
  const secret = authenticator.generateSecret();

  // Store encrypted secret (not enabled yet until verified)
  await db.storeMfaSecret(req.user.id, encrypt(secret));

  const otpauth = authenticator.keyuri(req.user.email, 'MyApp', secret);
  const qr = await qrcode.toDataURL(otpauth);

  res.json({ qr, secret }); // Show secret as backup code too
});

// Verify: user proves they set up their authenticator app
app.post('/api/mfa/verify', async (req, res) => {
  const secret = decrypt(await db.getMfaSecret(req.user.id));
  const isValid = authenticator.verify({ token: req.body.code, secret });

  if (!isValid) return res.status(400).json({ error: 'Invalid code' });

  await db.enableMfa(req.user.id);
  res.json({ success: true });
});

// Login with MFA
app.post('/api/login', async (req, res) => {
  // ... validate password first ...

  if (user.mfaEnabled) {
    if (!req.body.mfaCode) {
      return res.status(200).json({ requiresMfa: true });
    }
    const secret = decrypt(user.mfaSecret);
    if (!authenticator.verify({ token: req.body.mfaCode, secret })) {
      return res.status(401).json({ error: 'Invalid MFA code' });
    }
  }

  // Issue tokens...
});
```

---

## Authorization: RBAC and ABAC

### Role-Based Access Control

```typescript
// Simple RBAC middleware
type Role = 'user' | 'editor' | 'admin' | 'superadmin';

const ROLE_HIERARCHY: Record<Role, number> = {
  user: 0,
  editor: 1,
  admin: 2,
  superadmin: 3,
};

function requireRole(minRole: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.user.role as Role;
    if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[minRole]) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Permission-based (more granular)
type Permission = 'users:read' | 'users:write' | 'users:delete' | 'posts:read' | 'posts:write';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  user: ['posts:read'],
  editor: ['posts:read', 'posts:write'],
  admin: ['users:read', 'users:write', 'posts:read', 'posts:write'],
  superadmin: ['users:read', 'users:write', 'users:delete', 'posts:read', 'posts:write'],
};

function requirePermission(...permissions: Permission[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const userPermissions = ROLE_PERMISSIONS[req.user.role as Role] || [];
    const hasAll = permissions.every(p => userPermissions.includes(p));
    if (!hasAll) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

app.delete('/api/users/:id', requirePermission('users:delete'), deleteUserHandler);
```

### Attribute-Based Access Control with Casbin

```typescript
import { newEnforcer } from 'casbin';

// model.conf
// [request_definition]
// r = sub, obj, act
// [policy_definition]
// p = sub, obj, act
// [role_definition]
// g = _, _
// [policy_effect]
// e = some(where (p.eft == allow))
// [matchers]
// m = g(r.sub, p.sub) && r.obj == p.obj && r.act == p.act

const enforcer = await newEnforcer('model.conf', 'policy.csv');

// policy.csv:
// p, admin, /api/users, GET
// p, admin, /api/users, POST
// p, admin, /api/users, DELETE
// p, editor, /api/posts, GET
// p, editor, /api/posts, POST
// g, alice, admin
// g, bob, editor

async function casbinAuth(req: Request, res: Response, next: NextFunction) {
  const allowed = await enforcer.enforce(req.user.id, req.path, req.method);
  if (!allowed) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
}
```

---

## CORS Configuration

```typescript
import cors from 'cors';

// Development
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));

// Production — specific origins
app.use(cors({
  origin: ['https://app.example.com', 'https://admin.example.com'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400, // Cache preflight for 24h
}));

// Dynamic origin (multi-tenant)
app.use(cors({
  origin: (origin, callback) => {
    const allowedPattern = /^https:\/\/.*\.example\.com$/;
    if (!origin || allowedPattern.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
```

---

## Content Security Policy

### Next.js

```typescript
// next.config.js
const cspHeader = `
  default-src 'self';
  script-src 'self' 'nonce-{nonce}' https://cdn.example.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://images.example.com;
  font-src 'self' https://fonts.gstatic.com;
  connect-src 'self' https://api.example.com wss://ws.example.com;
  frame-ancestors 'none';
  form-action 'self';
  base-uri 'self';
  upgrade-insecure-requests;
`;

module.exports = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'Content-Security-Policy', value: cspHeader.replace(/\n/g, ' ').trim() },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
};
```

### SPA (React/Vue)

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' https://cdn.example.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  base-uri 'self';
```

---

## Rate Limiting: Distributed with Redis

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

// Tiered rate limiting
const publicLimit = rateLimit({
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip,
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
  max: 100,
  keyGenerator: (req) => req.user?.id || req.ip,
});

app.use('/api/', publicLimit);
app.use('/api/', authenticate, authenticatedLimit);
```

---

## Dependency Security

### Supply Chain Attack Prevention

```bash
# 1. Lock file integrity — always commit package-lock.json
npm ci  # Never npm install in CI

# 2. Audit regularly
npm audit --production --audit-level=moderate

# 3. Pin exact versions for critical deps
# package.json: "express": "4.18.2" (not "^4.18.2")

# 4. Use Socket.dev for supply chain analysis
npx socket:npm info express  # Check for suspicious patterns

# 5. Enable npm provenance (verify package comes from expected source)
npm publish --provenance  # For package authors
```

### Renovate Configuration

```json
// renovate.json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:recommended"],
  "packageRules": [
    {
      "matchUpdateTypes": ["patch"],
      "automerge": true,
      "automergeType": "pr"
    },
    {
      "matchUpdateTypes": ["minor"],
      "automerge": true,
      "automergeType": "pr",
      "schedule": ["after 10am on Monday"]
    },
    {
      "matchUpdateTypes": ["major"],
      "automerge": false,
      "labels": ["major-update"]
    }
  ],
  "vulnerabilityAlerts": {
    "enabled": true,
    "labels": ["security"]
  }
}
```

---

## Secrets Management

### Why Not Environment Variables?

```bash
# Environment variables leak:
# 1. Process listing: ps aux | grep -i secret
# 2. Error logs: unhandled exception dumps process.env
# 3. Docker inspect: docker inspect container_id
# 4. /proc filesystem: cat /proc/<pid>/environ
# 5. Child processes inherit all env vars
```

### Vault Pattern

```typescript
// Use a secrets manager, inject at runtime
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

async function getSecret(secretId: string): Promise<string> {
  const command = new GetSecretValueCommand({ SecretId: secretId });
  const response = await client.send(command);
  return response.SecretString!;
}

// At app startup
const dbPassword = await getSecret('prod/database/password');
const jwtSecret = await getSecret('prod/jwt-secret');

// Rotation: AWS Secrets Manager supports automatic rotation
// Set rotation schedule in AWS Console or via CloudFormation
```

---

## Incident Response

### Breach Notification Checklist

1. **Contain** — Revoke compromised credentials, isolate affected systems
2. **Assess** — What data was accessed? How many users affected?
3. **Notify** — Legal team → affected users → regulators (GDPR: 72 hours)
4. **Remediate** — Fix the vulnerability, rotate all secrets
5. **Document** — Timeline, root cause, remediation steps

### Post-Mortem Template

```markdown
# Security Incident Post-Mortem

**Date:** YYYY-MM-DD
**Severity:** P1 (data breach) / P2 (vulnerability exploited) / P3 (vulnerability found)
**Status:** Resolved / Monitoring

## Summary
One paragraph describing what happened.

## Timeline
- HH:MM — Incident detected (how?)
- HH:MM — Response initiated
- HH:MM — Containment achieved
- HH:MM — Root cause identified
- HH:MM — Remediation complete

## Impact
- Users affected: N
- Data exposed: [types]
- Financial impact: $X

## Root Cause
[Technical description]

## Remediation
- [What was done to fix it]
- [What prevents recurrence]

## Action Items
- [ ] Rotate all affected credentials — Owner — Due Date
- [ ] Notify affected users — Owner — Due Date
- [ ] Update security monitoring — Owner — Due Date
- [ ] Add regression test — Owner — Due Date
```

---

## Security Audit Checklist (50+ Items)

### Authentication (10)
- [ ] Passwords hashed with Argon2id or bcrypt (cost ≥ 12)
- [ ] Brute force protection (rate limiting on login)
- [ ] Account lockout after N failed attempts
- [ ] MFA available for all users, required for admins
- [ ] JWT: short expiry (≤ 15min), RS256 algorithm, minimal payload
- [ ] Refresh token rotation on use
- [ ] Session invalidation on password change
- [ ] Password complexity requirements enforced
- [ ] No credentials in URL parameters
- [ ] Timing-safe password comparison

### Authorization (8)
- [ ] Server-side authorization on every endpoint
- [ ] Resource ownership verified (not just role)
- [ ] IDOR protection (can't access other users' data by changing IDs)
- [ ] Admin endpoints on separate subdomain/path with extra auth
- [ ] API keys hashed before storage
- [ ] Principle of least privilege for service accounts
- [ ] RBAC/ABAC consistently applied
- [ ] Authorization checked after authentication

### Input Validation (8)
- [ ] All inputs validated server-side (never trust client)
- [ ] Parameterized queries (no string concatenation in SQL)
- [ ] Input length limits on all fields
- [ ] File upload: type validation, size limits, separate storage
- [ ] JSON schema validation on API requests
- [ ] HTML sanitization for user-generated content
- [ ] URL validation for any user-provided URLs
- [ ] No eval() or equivalent with user input

### Transport & Headers (8)
- [ ] HTTPS everywhere (HSTS enabled)
- [ ] TLS 1.2+ only
- [ ] Secure, HttpOnly, SameSite cookies
- [ ] CORS configured correctly (not wildcard with credentials)
- [ ] CSP header set
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Referrer-Policy set

### Data Protection (6)
- [ ] PII encrypted at rest
- [ ] Database connections use TLS
- [ ] Sensitive data not logged
- [ ] No secrets in source code or env files
- [ ] Secrets rotated on schedule
- [ ] Backups encrypted and access-controlled

### Dependencies (5)
- [ ] npm audit clean (no high/critical)
- [ ] Lock file committed and used (npm ci)
- [ ] Automated dependency updates (Renovate/Dependabot)
- [ ] No unnecessary dependencies
- [ ] Supply chain monitoring (Socket.dev or similar)

### Monitoring & Response (6)
- [ ] Failed auth attempts logged and alerted
- [ ] Privilege escalation attempts detected
- [ ] Error responses don't leak stack traces
- [ ] Security events in structured logs
- [ ] Incident response plan documented
- [ ] Security contacts defined

### Infrastructure (5)
- [ ] Least privilege IAM roles
- [ ] No root/admin credentials in application
- [ ] Network segmentation (DB not public)
- [ ] Container images scanned for vulnerabilities
- [ ] Secrets in vault, not environment variables
