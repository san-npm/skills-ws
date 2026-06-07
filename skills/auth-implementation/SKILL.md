---
name: auth-implementation
description: "Secure authentication & authorization — OAuth 2.1/OIDC with PKCE & state, JWT/JWKS verification, hashed-rotating refresh tokens, sessions/BFF, passkeys/WebAuthn, MFA/TOTP, RBAC/ABAC, password hashing, and CSRF. Use when implementing or reviewing auth, authz, MFA, passkeys, OAuth/OIDC, sessions, tokens, or access control."
---

# Authentication & Authorization

Security-critical patterns for AuthN/AuthZ in 2026. Code here is meant to be copied, so it is written to be correct and safe by default: every secret stored hashed, every token rotation atomic, every redirect-based flow CSRF-protected via `state`/PKCE. Vendor endpoints and library APIs drift — when a value here is dated, the inline note tells you where to re-verify.

**Threat-model defaults**: assume the browser is hostile (XSS can read anything JS can), assume tokens leak, assume requests are replayed and races happen. Prefer short-lived access tokens + server-held session/refresh state. For SPAs, prefer a **BFF (Backend-for-Frontend)** holding tokens server-side over putting access tokens in `localStorage`.

---

## 1. OAuth 2.1 / OIDC Flows

OAuth 2.1 (the consolidation of 2.0 + best-practice RFCs) makes **PKCE mandatory for all clients**, forbids the implicit and password grants, and requires exact redirect-URI matching. Use the **Authorization Code flow + PKCE everywhere** (yes, even confidential server-side clients).

### Discover endpoints (don't hardcode)

Prefer the provider's OIDC discovery document over hardcoded URLs so endpoints and the JWKS URI stay correct:

```javascript
// Fetch once at boot, cache in memory (respect Cache-Control)
const discovery = await fetch(
  'https://accounts.google.com/.well-known/openid-configuration'
).then(r => r.json());
// => { authorization_endpoint, token_endpoint, jwks_uri, issuer, ... }
// Google (as of Jun 2026): authorization_endpoint = https://accounts.google.com/o/oauth2/v2/auth
//                          token_endpoint         = https://oauth2.googleapis.com/token
// Verify: https://accounts.google.com/.well-known/openid-configuration
```

### Authorization Code + PKCE — full server-side flow with `state`

This is the canonical flow. **`state` and the PKCE `code_verifier` are both persisted server-side before redirect and verified on callback** — skipping either reopens CSRF / login-injection / code-injection. Below, secrets live on the server and only `code_challenge` + `state` ever hit the browser.

```javascript
import crypto from 'node:crypto';

const b64url = (buf) => buf.toString('base64url'); // Node >=16 supports 'base64url'

function pkcePair() {
  const verifier = b64url(crypto.randomBytes(32));               // 43-128 chars, high entropy
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

// --- Step 1: begin login (server route) ---
app.get('/auth/login', async (req, res) => {
  const state = b64url(crypto.randomBytes(32));
  const nonce = b64url(crypto.randomBytes(32));   // OIDC: binds id_token to this session
  const { verifier, challenge } = pkcePair();

  // PERSIST state + verifier + nonce server-side, keyed to THIS session, BEFORE redirecting.
  // Short TTL; single use. (Express-session shown; a signed httpOnly cookie also works.)
  req.session.oauth = { state, nonce, verifier, createdAt: Date.now() };

  const url = new URL(discovery.authorization_endpoint);
  url.searchParams.set('client_id', process.env.OAUTH_CLIENT_ID);
  url.searchParams.set('redirect_uri', process.env.OAUTH_REDIRECT_URI); // must EXACTLY match registered URI
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  res.redirect(url.toString());
});

// --- Step 2: callback (server route) — VALIDATE everything ---
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;
  const saved = req.session.oauth;
  delete req.session.oauth; // consume immediately so it can't be replayed

  // (a) provider returned an error?
  if (req.query.error) return res.status(400).send(`OAuth error: ${req.query.error}`);
  // (b) we actually started a flow, and it hasn't expired
  if (!saved || Date.now() - saved.createdAt > 10 * 60 * 1000) {
    return res.status(400).send('No pending OAuth flow / expired');
  }
  // (c) STATE MUST MATCH — constant-time compare to avoid timing oracles
  const ok = typeof state === 'string'
    && state.length === saved.state.length
    && crypto.timingSafeEqual(Buffer.from(state), Buffer.from(saved.state));
  if (!ok) return res.status(403).send('Invalid OAuth state'); // CSRF / login-injection blocked here
  // (d) need a code
  if (typeof code !== 'string' || !code) return res.status(400).send('Missing authorization code');

  // (e) exchange code — token request is form-encoded; include the PKCE verifier we persisted
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: process.env.OAUTH_REDIRECT_URI,
    client_id: process.env.OAUTH_CLIENT_ID,
    code_verifier: saved.verifier,            // proves we started this exact flow
  });
  // Confidential clients add their secret (Basic auth header preferred over body params):
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
  if (process.env.OAUTH_CLIENT_SECRET) {
    const basic = Buffer.from(
      `${process.env.OAUTH_CLIENT_ID}:${process.env.OAUTH_CLIENT_SECRET}`
    ).toString('base64');
    headers.Authorization = `Basic ${basic}`;
  }

  const tokenRes = await fetch(discovery.token_endpoint, { method: 'POST', headers, body });
  if (!tokenRes.ok) return res.status(401).send('Token exchange failed');
  const tokens = await tokenRes.json(); // { access_token, refresh_token, id_token, expires_in }

  // (f) Validate the OIDC id_token signature/iss/aud/exp AND that nonce matches saved.nonce
  //     (see §2 verifyToken; pass audience = OAUTH_CLIENT_ID and check decoded.nonce === saved.nonce)
  // (g) Establish your OWN session here (don't hand provider tokens to the browser).
  res.redirect('/');
});
```

### Authorization Code + PKCE — public client (SPA/mobile) caveat

A SPA cannot keep `state`/`verifier` truly secret from XSS. `sessionStorage` survives a redirect but is JS-readable. **Preferred 2026 pattern: run the code exchange in a BFF** so the browser never holds tokens. If you must do it browser-side, still generate and check `state`, and still send the `code_verifier`:

```javascript
// Browser: begin
const { verifier, challenge } = await pkcePairWebCrypto(); // Web Crypto version below
const state = crypto.randomUUID();
sessionStorage.setItem('pkce_verifier', verifier);
sessionStorage.setItem('oauth_state', state);
const url = new URL(discovery.authorization_endpoint);
url.searchParams.set('client_id', CLIENT_ID);
url.searchParams.set('redirect_uri', REDIRECT_URI);
url.searchParams.set('response_type', 'code');
url.searchParams.set('scope', 'openid email profile');
url.searchParams.set('code_challenge', challenge);
url.searchParams.set('code_challenge_method', 'S256');
url.searchParams.set('state', state);
location.href = url.toString();

// Browser: callback — VALIDATE state before exchanging
const params = new URLSearchParams(location.search);
const code = params.get('code');
const returnedState = params.get('state');
const savedState = sessionStorage.getItem('oauth_state');
const verifier = sessionStorage.getItem('pkce_verifier');
sessionStorage.removeItem('oauth_state');
sessionStorage.removeItem('pkce_verifier');
if (!code || !returnedState || returnedState !== savedState) {
  throw new Error('Invalid OAuth state or missing code'); // stop — do not exchange
}
const res = await fetch(discovery.token_endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'authorization_code', code,
    client_id: CLIENT_ID, redirect_uri: REDIRECT_URI, code_verifier: verifier,
  }),
});
const tokens = await res.json();

// Web Crypto PKCE (browser)
async function pkcePairWebCrypto() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { verifier, challenge };
}
```

### Client Credentials Flow (Machine-to-Machine)

For backend services and API-to-API calls. No user. Token requests are **form-encoded** per RFC 6749, the secret stays server-side, and you should **cache the token** until shortly before `expires_in` rather than minting one per call.

```javascript
let cached = { token: null, exp: 0 };

async function getServiceToken() {
  if (cached.token && Date.now() < cached.exp - 60_000) return cached.token; // 60s safety margin
  const res = await fetch(process.env.OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET, // server-only; never ship to a browser
      audience: 'https://api.example.com',       // provider-specific (Auth0 uses `audience`)
      scope: 'read:things write:things',
    }),
  });
  if (!res.ok) throw new Error(`Token request failed: ${res.status}`);
  const { access_token, expires_in } = await res.json();
  cached = { token: access_token, exp: Date.now() + expires_in * 1000 };
  return access_token;
}
```

---

## 2. JWT (JSON Web Tokens)

### Structure

```
header.payload.signature

Header:  { "alg": "RS256", "typ": "JWT", "kid": "key-id-1" }
Payload: { "iss": "https://auth.example.com", "aud": "https://api.example.com",
           "sub": "user123", "role": "admin", "iat": 1706000000, "exp": 1706003600 }
Signature: RS256(base64url(header) + "." + base64url(payload), privateKey)
```

### JWT Validation (Node.js) — pin algorithm, issuer, audience

The most common JWT bugs: accepting `alg: none`, accepting whatever `alg` the token claims (HS256/RS256 confusion), or not checking `iss`/`aud`. **Always pin `algorithms` explicitly, and always validate `issuer` and `audience`.** Cache JWKS keys (jwks-rsa caches + rate-limits by default).

```javascript
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({
  jwksUri: 'https://auth.example.com/.well-known/jwks.json',
  cache: true, cacheMaxEntries: 5, cacheMaxAge: 10 * 60 * 1000, // 10 min
  rateLimit: true, jwksRequestsPerMinute: 10,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => callback(err, key?.getPublicKey()));
}

function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      algorithms: ['RS256'],                  // pin; never allow 'none' or HS*/RS* mixing
      issuer: 'https://auth.example.com',     // must match token iss
      audience: 'https://api.example.com',    // must match token aud (your API/client id)
      clockTolerance: 5,                      // seconds, for minor clock skew
    }, (err, decoded) => (err ? reject(err) : resolve(decoded)));
  });
}

// Express middleware
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = await verifyToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

`jsonwebtoken` is the workhorse; for ESM/edge runtimes consider **`jose`** (`jwtVerify` + `createRemoteJWKSet`), which is promise-native and runs on Web Crypto.

### Refresh Token Rotation — hashed, atomic, reuse-detecting

Refresh tokens are long-lived bearer credentials, so treat them like passwords:

1. **Store only a hash** (SHA-256 is fine for a high-entropy random token; you don't need bcrypt/argon2 for 256-bit randomness). The raw token exists only in the client's secure cookie.
2. **Look up by hash**, never by raw value.
3. **Rotate atomically** in a DB transaction with a compare-and-set so two concurrent refreshes can't both succeed.
4. **Detect reuse**: a refresh token is single-use. If a *used/rotated* token is presented again, treat it as theft and **revoke the whole token family**.

```javascript
import crypto from 'node:crypto';

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
const newOpaqueToken = () => crypto.randomBytes(32).toString('base64url'); // 256-bit, unguessable

// Issue at login: create a family, store HASH, return RAW token to client (httpOnly cookie)
async function issueRefreshToken(userId, meta) {
  const raw = newOpaqueToken();
  const familyId = crypto.randomUUID();
  await db.refreshToken.create({ data: {
    tokenHash: sha256(raw), userId, familyId,
    used: false, revoked: false,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    userAgent: meta?.userAgent, ip: meta?.ip,                   // device/session metadata
  }});
  return raw; // caller sets it as a Secure; HttpOnly; SameSite cookie (path=/auth/refresh)
}

app.post('/auth/refresh', async (req, res) => {
  const raw = req.cookies?.refresh_token;            // delivered via httpOnly cookie, not body
  if (!raw) return res.status(401).json({ error: 'No refresh token' });
  const tokenHash = sha256(raw);

  try {
    const result = await db.$transaction(async (tx) => {
      // Lock the row (Postgres) so concurrent refreshes serialize on it.
      const [stored] = await tx.$queryRaw`
        SELECT * FROM "RefreshToken" WHERE "tokenHash" = ${tokenHash} FOR UPDATE`;

      if (!stored) throw { code: 'INVALID' };

      // REUSE DETECTION: a used or revoked token presented again => credential theft.
      if (stored.used || stored.revoked) {
        await tx.refreshToken.updateMany({
          where: { familyId: stored.familyId },
          data: { revoked: true },                  // nuke the entire family
        });
        throw { code: 'REUSE' };
      }
      if (stored.expiresAt < new Date()) throw { code: 'EXPIRED' };

      // Atomic compare-and-set: only the first concurrent caller flips used:false -> true.
      const claim = await tx.refreshToken.updateMany({
        where: { id: stored.id, used: false },
        data: { used: true },
      });
      if (claim.count !== 1) throw { code: 'RACE' };  // someone else won; reject this one

      // Mint the next token in the SAME family and store its hash.
      const nextRaw = newOpaqueToken();
      await tx.refreshToken.create({ data: {
        tokenHash: sha256(nextRaw), userId: stored.userId, familyId: stored.familyId,
        used: false, revoked: false,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        userAgent: req.get('user-agent'), ip: req.ip,
      }});

      const accessToken = jwt.sign(
        { sub: stored.userId, role: stored.role },
        process.env.JWT_PRIVATE_KEY,
        { algorithm: 'RS256', issuer: 'https://auth.example.com',
          audience: 'https://api.example.com', expiresIn: '15m' }
      );
      return { accessToken, nextRaw };
    });

    res.cookie('refresh_token', result.nextRaw, {
      httpOnly: true, secure: true, sameSite: 'strict', path: '/auth/refresh',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.json({ accessToken: result.accessToken });
  } catch (e) {
    if (e?.code === 'REUSE') {
      // Optional: log/audit + force user re-auth on all devices.
      return res.status(401).json({ error: 'Token reuse detected; family revoked' });
    }
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});
```

> The `FOR UPDATE` row lock + `updateMany(where: { used: false })` compare-and-set is what makes this safe under concurrency. On databases without `SELECT ... FOR UPDATE`, rely solely on the conditional update's affected-row count (`claim.count === 1`) as the gate — never on a read-then-write without it.

**Token lifetimes:**
- Access token: 15 minutes (short-lived, stateless, RS256)
- Refresh token: 30 days max, rotated on every use, hashed at rest
- ID token: ~1 hour (OIDC user info; validate `nonce` on login)

---

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

## 4. Auth.js v5 (NextAuth) Setup — App Router

Auth.js v5 splits config into a root `auth.ts` (exports `handlers`, `auth`, `signIn`, `signOut`) and a thin route handler. Provider imports are now `next-auth/providers/*` named like `Google`, `GitHub`, `Credentials` (the old `GoogleProvider` names are v4). Env vars are auto-inferred from `AUTH_<PROVIDER>_ID/SECRET`; set `AUTH_SECRET` (generate with `npx auth secret`) and `AUTH_TRUST_HOST=true` when self-hosting behind a proxy.

```typescript
// auth.ts (project root)
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import argon2 from 'argon2';
import { z } from 'zod';

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },           // 'jwt' for Credentials; 'database' for OAuth-only is also fine
  providers: [
    Google,                               // reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
    GitHub,                               // reads AUTH_GITHUB_ID / AUTH_GITHUB_SECRET
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        // Same generic outcome whether the user is missing or the password is wrong (no enumeration):
        if (!user?.hashedPassword) return null;
        const ok = await argon2.verify(user.hashedPassword, parsed.data.password);
        return ok ? user : null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.role = user.role; token.id = user.id; }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role as string;
      session.user.id = token.id as string;
      return session;
    },
  },
  pages: { signIn: '/login', error: '/auth/error' },
});
```

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/auth';
export const { GET, POST } = handlers;
```

```typescript
// types: augment the session/JWT so token.role/id type-check
// types/next-auth.d.ts
import 'next-auth';
declare module 'next-auth' {
  interface User { role?: string }
  interface Session { user: { id: string; role?: string } & DefaultSession['user'] }
}
```

Read the session in a Server Component/route via `const session = await auth();`. Protect routes in `middleware.ts` by exporting `auth` as the middleware.

---

## 5. Passport.js Strategies

`Invalid email` vs `Invalid password` are different responses, which lets an attacker enumerate accounts. **Return one generic message** and run the password compare even when the user is missing (constant-ish work) so timing doesn't leak existence either.

```javascript
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import argon2 from 'argon2';

// A precomputed dummy argon2 hash so we do equivalent work when the user doesn't exist.
const DUMMY_HASH = process.env.DUMMY_ARGON2_HASH; // generate once: argon2.hash('not-a-real-password')

passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    const user = await db.findUserByEmail(String(email).trim().toLowerCase());
    const hash = user?.hashedPassword ?? DUMMY_HASH;
    const valid = await argon2.verify(hash, password).catch(() => false);
    if (!user || !valid) {
      return done(null, false, { message: 'Invalid credentials' }); // generic; no enumeration
    }
    return done(null, user);
  }
));

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  const email = profile.emails?.[0]?.value;
  let user = await db.findUserByGoogleId(profile.id);
  if (!user) {
    user = await db.createUser({ googleId: profile.id, email, name: profile.displayName });
  }
  return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => done(null, await db.findUserById(id)));
```

Also add **account lockout / progressive delay** after repeated failures (see §10 rate limiting) and **audit-log** auth events (login success/failure, password change, MFA enrollment) with user id, IP, and timestamp.

---

## 6. Passkeys / WebAuthn (`@simplewebauthn/server` v13)

The v13 API differs from older snippets you'll find online:
- `generateRegistrationOptions` takes **`userName`/`userDisplayName`** — there is no `userID` option you pass a string to anymore.
- After registration, persist **`registrationInfo.credential`** = `{ id, publicKey, counter, transports }` (plus `credentialDeviceType`/`credentialBackedUp`). `id` is a Base64URL string; `publicKey` is a `Uint8Array` (store as bytes/`bytea`).
- `verifyAuthenticationResponse` takes a single **`credential`** object (the old `authenticator:` key is gone) and a **`requireUserVerification`** boolean.
- Always store and re-send `transports`, and **write back `newCounter`** to detect cloned authenticators.

```javascript
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const rpName = 'My App';
const rpID = 'example.com';                 // domain only, no scheme/port
const origin = 'https://example.com';       // full origin the browser sends

// --- Registration: options ---
app.post('/auth/passkey/register/options', async (req, res) => {
  const user = req.user;
  const existing = await db.getCredentialsByUserId(user.id);
  const options = await generateRegistrationOptions({
    rpName, rpID,
    userName: user.email,
    userDisplayName: user.name ?? user.email,
    attestationType: 'none',
    excludeCredentials: existing.map(c => ({ id: c.credentialId, transports: c.transports })),
    authenticatorSelection: {
      residentKey: 'preferred',       // 'required' for usernameless/discoverable login
      userVerification: 'preferred',  // 'required' to force biometric/PIN
    },
    supportedAlgorithmIDs: [-7, -257], // ES256, RS256
  });
  await db.saveChallenge(user.id, options.challenge); // store server-side, short TTL
  res.json(options);
});

// --- Registration: verify ---
app.post('/auth/passkey/register/verify', async (req, res) => {
  const user = req.user;
  const expectedChallenge = await db.getChallenge(user.id);
  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  if (verification.verified && verification.registrationInfo) {
    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
    await db.saveCredential(user.id, {
      credentialId: credential.id,        // Base64URLString
      publicKey: credential.publicKey,    // Uint8Array -> store as bytes
      counter: credential.counter,
      transports: credential.transports,  // e.g. ['internal','hybrid']
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
    });
  }
  await db.clearChallenge(user.id);
  res.json({ verified: verification.verified });
});

// --- Authentication: options ---
app.post('/auth/passkey/login/options', async (req, res) => {
  // Optionally scope to a known user's credentials; omit allowCredentials for usernameless flow.
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
    // allowCredentials: creds.map(c => ({ id: c.credentialId, transports: c.transports })),
  });
  await db.saveSessionChallenge(req.sessionID, options.challenge);
  res.json(options);
});

// --- Authentication: verify ---
app.post('/auth/passkey/login/verify', async (req, res) => {
  const expectedChallenge = await db.getSessionChallenge(req.sessionID);
  const stored = await db.getCredentialById(req.body.id); // req.body.id is Base64URLString
  if (!stored) return res.status(400).json({ error: 'Unknown credential' });

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {                       // v13 shape (was `authenticator`)
        id: stored.credentialId,
        publicKey: stored.publicKey,      // Uint8Array
        counter: stored.counter,
        transports: stored.transports,
      },
      requireUserVerification: true,
    });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  if (verification.verified) {
    // CRITICAL: persist newCounter to detect cloned authenticators / replay.
    await db.updateCounter(stored.id, verification.authenticationInfo.newCounter);
    await db.clearSessionChallenge(req.sessionID);
    req.login(stored.user, () => res.json({ verified: true }));
  } else {
    res.status(401).json({ verified: false });
  }
});
```

Pair with `@simplewebauthn/browser` (`startRegistration`/`startAuthentication`) on the client. Verify the current API at https://simplewebauthn.dev (this skill targets v13).

---

## 7. RBAC & ABAC

### Role-Based Access Control (RBAC)

```typescript
const PERMISSIONS = {
  admin: ['read', 'write', 'delete', 'manage_users', 'manage_billing'],
  editor: ['read', 'write'],
  viewer: ['read'],
} as const;

type Role = keyof typeof PERMISSIONS;
type Permission = (typeof PERMISSIONS)[Role][number];

function requirePermission(permission: Permission) {
  return (req, res, next) => {
    const userRole = req.user?.role as Role | undefined;
    const perms = (userRole && PERMISSIONS[userRole]) || [];
    if (!perms.includes(permission)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

app.delete('/api/posts/:id', requirePermission('delete'), deletePost);
app.get('/api/posts', requirePermission('read'), listPosts);
```

### Attribute-Based Access Control (ABAC)

```typescript
interface PolicyContext {
  user: { id: string; role: string; department: string };
  resource: { ownerId: string; type: string; status: string; department?: string };
  action: string;
}

function evaluatePolicy(ctx: PolicyContext): boolean {
  if (ctx.user.role === 'admin') return true;
  // Owners can edit their own resources
  if (ctx.action === 'edit' && ctx.resource.ownerId === ctx.user.id) return true;
  // Editors can edit published resources in their own department
  if (ctx.action === 'edit' && ctx.user.role === 'editor'
      && ctx.resource.status === 'published'
      && ctx.resource.department === ctx.user.department) return true;
  return false; // default-deny
}
```

**Default-deny** is the rule: if no policy explicitly allows the action, reject. Always enforce authorization **server-side per request** — never trust a client-sent role/permission, and re-check ownership on every mutating route (most IDOR bugs are a missing per-object check).

---

## 8. Password Hashing

Use a memory-hard algorithm. **`argon2id` is the OWASP first choice**; `bcrypt` is an acceptable, widely-supported fallback (note bcrypt silently truncates inputs beyond 72 bytes — pre-hash with SHA-256 if you must allow long passphrases). Never roll your own.

```javascript
import argon2 from 'argon2';
import bcrypt from 'bcryptjs';

// argon2id (recommended) — OWASP 2026 baseline params
const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 19456,   // 19 MiB (OWASP min); raise to 46–64 MiB on capable servers
  timeCost: 2,         // iterations
  parallelism: 1,
});
const valid = await argon2.verify(hash, password);

// bcrypt fallback (cost >=12 in 2026)
const bhash = await bcrypt.hash(password, 12);
const bvalid = await bcrypt.compare(password, bhash);
```

**Never:** MD5, SHA-1, plain SHA-256/512 (fast → brute-forceable), or any unsalted/un-stretched hash for passwords. Check new passwords against a breached-password list (e.g., HIBP k-anonymity range API) and enforce a sane minimum length over arbitrary complexity rules (NIST SP 800-63B).

---

## 9. MFA / 2FA with TOTP

Three correctness rules this implements:
1. **Never return the TOTP secret to the client as a "backup code."** The secret is the authenticator seed; if it's also a "backup code" then anyone who saw setup can mint valid TOTP codes forever. Backup codes are **separate, random, single-use, stored hashed**.
2. **Verify enrollment before activating**, and tolerate one time-step of clock drift (`window: 1`).
3. **Bind the login MFA step to a pending first-factor session** — never trust a `userId` from the request body, or anyone can complete MFA "as" any user id.

```javascript
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'node:crypto';

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// --- Setup: generate secret + QR. Do NOT return the secret as a backup code. ---
app.post('/auth/mfa/setup', requireAuth, async (req, res) => {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(req.user.email, 'MyApp', secret);
  const qrCode = await QRCode.toDataURL(otpauth);
  await db.saveTempMfaSecret(req.user.id, secret); // pending; not yet active
  // Return ONLY the QR/otpauth so the user can scan it. The raw secret is shown once for
  // manual entry only if you choose to; it is NOT a backup code.
  res.json({ qrCode, otpauth });
});

// --- Verify enrollment + issue SEPARATE single-use backup codes (stored hashed) ---
app.post('/auth/mfa/verify', requireAuth, async (req, res) => {
  const { token } = req.body;
  const secret = await db.getTempMfaSecret(req.user.id);
  if (!secret || !authenticator.verify({ token, secret, window: 1 })) {
    return res.status(400).json({ error: 'Invalid code' });
  }
  await db.activateMfa(req.user.id, secret);

  // Backup codes: random, single-use, displayed ONCE, stored only as hashes.
  const plain = Array.from({ length: 10 }, () => crypto.randomBytes(5).toString('hex')); // 10×10-hex
  await db.replaceBackupCodes(req.user.id, plain.map(c => sha256(c))); // store HASHES only
  res.json({ success: true, backupCodes: plain }); // show once; never retrievable again
});

// --- Login MFA challenge: bind to a pending first-factor session, NOT a body userId ---
app.post('/auth/mfa/challenge', async (req, res) => {
  const { token } = req.body;
  // mfaPending was set by the password/first-factor step after it verified credentials.
  const userId = req.session?.mfaPending?.userId;
  if (!userId) return res.status(401).json({ error: 'No pending login' });

  const user = await db.findUserById(userId);
  let ok = authenticator.verify({ token, secret: user.mfaSecret, window: 1 });
  if (!ok) {
    // Backup code path: look up by HASH and consume single-use.
    ok = await db.consumeBackupCode(userId, sha256(String(token)));
  }
  if (!ok) return res.status(401).json({ error: 'Invalid MFA code' });

  // First + second factor both satisfied → now establish the authenticated session.
  delete req.session.mfaPending;
  req.session.regenerate((err) => {
    if (err) return res.status(500).end();
    req.session.userId = userId;
    res.json({ accessToken: issueAccessToken(user) });
  });
});

// The first-factor handler that sets mfaPending (sketch):
// after verifying email+password, if user.mfaEnabled:
//   req.session.mfaPending = { userId: user.id, at: Date.now() };  // short TTL
//   return res.json({ mfaRequired: true });
```

Rate-limit `/auth/mfa/challenge` per pending session (e.g., 5 attempts) and expire `mfaPending` after a few minutes. For recovery, require re-verification (email link + cooldown) before disabling MFA, and re-issue fresh backup codes when the user regenerates them.

---

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
