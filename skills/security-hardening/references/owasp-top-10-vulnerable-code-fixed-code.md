## Contents

- OWASP Top 10: Vulnerable Code → Fixed Code
- A01: Broken Access Control
- A02: Cryptographic Failures
- A03: Injection
- A04: Insecure Design
- A05: Security Misconfiguration
- A06: Vulnerable and Outdated Components
- A07: Identification and Authentication Failures
- A08: Software and Data Integrity Failures
- A09: Security Logging and Monitoring Failures
- A10: Server-Side Request Forgery (SSRF)

## OWASP Top 10: Vulnerable Code → Fixed Code

> Category numbers below follow the 2021 edition. The current edition is
> **OWASP Top 10:2025**, which reorders and renames: A01 Broken Access Control
> (SSRF now folds in here rather than standing alone), A02 Security
> Misconfiguration, A03 Software Supply Chain Failures, A04 Cryptographic
> Failures, A05 Injection, A06 Insecure Design, A07 Authentication Failures,
> A08 Software or Data Integrity Failures, A09 Security Logging and Alerting
> Failures, A10 Mishandling of Exceptional Conditions. Cite the 2025 numbers
> when reporting. The fixes below all still apply.

> For HTTP/JSON APIs, also work the **OWASP API Security Top 10 (2023)** — it
> catches API-specific gaps the web list underweights. The high-impact ones:
> **API1 BOLA** (object-level authz / IDOR — verify the caller owns *this* object
> on every request, see A01 below), **API3 Broken Object Property Level Auth**
> (mass-assignment + over-fetching — allowlist returned/updatable fields),
> **API5 BFLA** (function-level authz — admin routes need an explicit role gate,
> see RBAC), and **API4 Unrestricted Resource Consumption** (rate/size/cost
> limits — see Rate Limiting). For LLM/agent surfaces, see *AI-App Hardening*.

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
# Regular audit (npm 10/11: --production was REMOVED; use --omit=dev)
npm audit --omit=dev --audit-level=high
npx better-npm-audit audit --level moderate

# Check for known vulnerabilities
npx socket npm info  # Socket.dev: detects supply chain attacks

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
  limit: 10, // 10 attempts per IP (`max` was renamed `limit` in v7)
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

  // RS256 signs with a PRIVATE key, not a shared secret.
  // (Passing a symmetric secret string with algorithm:'RS256' throws or
  //  invites key confusion — see the JWT Pitfalls section below.)
  const accessToken = jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_PRIVATE_KEY, // PEM RSA/EdDSA private key from vault
    {
      algorithm: 'RS256',
      expiresIn: '15m',
      issuer: 'https://auth.example.com',
      audience: 'https://api.example.com',
      keyid: process.env.JWT_KID, // lets verifiers pick the right key on rotation
    }
  );

  res.json({ accessToken });
});

// If you genuinely want a symmetric secret, use HS256 with a high-entropy key:
//   jwt.sign(payload, process.env.JWT_SECRET, { algorithm: 'HS256', ... })
//   where JWT_SECRET is >= 32 random bytes (openssl rand -base64 48).
// Never pair an HS* secret string with an RS*/ES*/Ed* `algorithm` value.
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

// Capture the RAW body — HMAC must run over the exact bytes that were signed.
// JSON.stringify(req.body) re-serializes and will NOT match the sender's digest
// (key order, whitespace, and unicode escaping all differ).
import express from 'express';
app.use('/api/webhook', express.raw({ type: '*/*' })); // req.body is now a Buffer

// Length-checked constant-time compare. timingSafeEqual THROWS if the two
// buffers differ in length, so guard it (and never branch on length alone).
function safeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  if (ab.length !== bb.length || ab.length === 0) return false;
  return crypto.timingSafeEqual(ab, bb);
}

app.post('/api/webhook', (req, res) => {
  const raw: Buffer = req.body; // exact bytes
  // Header format here: "t=<unix>,v1=<hex hmac>" (Stripe-style). Parse defensively.
  const header = String(req.headers['x-webhook-signature'] ?? '');
  const parts = Object.fromEntries(
    header.split(',').map((kv) => kv.split('=') as [string, string])
  );
  const ts = Number(parts.t);
  const sig = parts.v1;
  if (!Number.isFinite(ts) || !sig) {
    return res.status(400).json({ error: 'Malformed signature header' });
  }

  // Replay window: reject anything older/newer than 5 minutes.
  if (Math.abs(Date.now() / 1000 - ts) > 300) {
    return res.status(401).json({ error: 'Timestamp outside tolerance' });
  }

  // Sign timestamp + "." + raw body, matching the sender's signing scheme.
  const expected = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET!)
    .update(`${ts}.`)
    .update(raw)
    .digest('hex');

  if (!safeEqualHex(sig, expected)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Idempotency / replay: store the event id (or sig) and reject duplicates.
  // await redis.set(`wh:${sig}`, '1', 'EX', 600, 'NX') === null → already seen.

  const payload = PayloadSchema.parse(JSON.parse(raw.toString('utf8')));
  void processData(payload);
  res.status(200).json({ ok: true });
});
```

**Framework notes for raw bodies:**

| Framework | How to get the raw body |
|-----------|-------------------------|
| Express | `express.raw({ type: '*/*' })` scoped to the webhook route (mount BEFORE `express.json()` or it consumes the stream first) |
| Fastify | `fastify.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => done(null, body))` then verify, then `JSON.parse` |
| Next.js (App Router) | In the route handler use `const raw = await req.text();` — body parsing is not automatic, so `raw` is already the signed payload |
| Stripe SDK | Prefer `stripe.webhooks.constructEvent(raw, sigHeader, secret)` — it does the timestamp + HMAC + replay checks for you |

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

// ✅ FIXED: validate scheme, resolve A *and* AAAA, block private/cloud-metadata
// ranges, then PIN the resolved IP for the outbound connection. Validating the
// hostname and then calling fetch(url) separately is a TOCTOU/DNS-rebinding hole:
// DNS can return a public IP at check time and 169.254.169.254 at fetch time.
import { URL } from 'url';
import ipaddr from 'ipaddr.js';
import dns from 'dns/promises';
import { Agent } from 'undici';

// Reserved/dangerous ranges. ipaddr.range() covers most; add cloud metadata
// and IPv4-mapped-IPv6 explicitly because attackers reach metadata via both.
const BLOCKED_RANGES = new Set([
  'unspecified', 'broadcast', 'multicast', 'linkLocal', 'loopback',
  'private', 'reserved', 'uniqueLocal', 'ipv4Mapped', 'rfc6145', 'rfc6052',
  'carrierGradeNat', // 100.64.0.0/10
]);

function isPublicIp(addr: string): boolean {
  let ip = ipaddr.parse(addr);
  // Normalize ::ffff:a.b.c.d so an IPv4 range check applies.
  if (ip.kind() === 'ipv6' && (ip as ipaddr.IPv6).isIPv4MappedAddress()) {
    ip = (ip as ipaddr.IPv6).toIPv4Address();
  }
  if (BLOCKED_RANGES.has(ip.range())) return false;
  // Cloud metadata endpoints (AWS/GCP/Azure 169.254.169.254, GCP fd00:ec2::254,
  // Alibaba 100.100.100.200) — defense in depth on top of range checks.
  const s = ip.toNormalizedString();
  if (s === '169.254.169.254' || s === '100.100.100.200' || s === 'fd00:ec2::254') {
    return false;
  }
  return true;
}

async function resolveSafe(hostname: string): Promise<string> {
  // Resolve BOTH families; reject if ANY answer is non-public.
  const results = await Promise.allSettled([
    dns.resolve4(hostname),
    dns.resolve6(hostname),
  ]);
  const ips = results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  if (ips.length === 0) throw new Error('No DNS records');
  for (const ip of ips) if (!isPublicIp(ip)) throw new Error(`Blocked IP: ${ip}`);
  return ips[0]; // pin this one for the connection
}

// Custom undici dispatcher that connects to the pre-validated IP. Node's global
// fetch is undici-based and silently IGNORES an `agent` option (http/https Agents
// are not undici dispatchers), so pinning MUST go through a dispatcher. The URL
// keeps the original hostname, so the Host header and TLS SNI stay correct; only
// resolution is overridden. This closes the rebinding gap.
// (If you use node-fetch instead of global fetch, pass an http/https Agent with a
//  custom `lookup` via its `agent` option to get the same effect.)
function pinnedDispatcher(ip: string) {
  const family = ipaddr.parse(ip).kind() === 'ipv6' ? 6 : 4;
  return new Agent({
    connect: {
      // net/tls connect option: force resolution to the pre-validated IP
      lookup: (_host, opts, cb) =>
        (opts as any).all ? cb(null, [{ address: ip, family }]) : (cb as any)(null, ip, family),
    },
  });
}

app.post('/api/fetch-url', async (req, res) => {
  let url: URL;
  try {
    url = new URL(String(req.body.url));
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  // Block non-HTTP schemes: file:, gopher:, ftp:, data:, dict:, etc.
  if (!['http:', 'https:'].includes(url.protocol)) {
    return res.status(400).json({ error: 'Only http/https allowed' });
  }
  if (url.username || url.password) {
    return res.status(400).json({ error: 'Credentials in URL not allowed' });
  }

  let ip: string;
  try {
    ip = await resolveSafe(url.hostname);
  } catch {
    return res.status(400).json({ error: 'URL not allowed' });
  }

  const response = await fetch(url, {
    dispatcher: pinnedDispatcher(ip),
    redirect: 'error', // re-validate manually if you must follow redirects:
    //   for each 3xx Location, parse → resolveSafe() again → re-pin → refetch.
    signal: AbortSignal.timeout(5000),
  } as RequestInit & { dispatcher: Agent });
  res.json(await response.json());
});
```

> Simpler, more robust in production: route all user-driven outbound traffic
> through a **dedicated egress proxy** (e.g. Smokescreen) on a network with no
> route to internal/metadata subnets, so the app never resolves untrusted hosts
> itself. Pair with `redirect: 'error'` and a request timeout regardless.

---
