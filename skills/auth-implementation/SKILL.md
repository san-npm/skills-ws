---
name: auth-implementation
description: "Authentication & authorization — OAuth 2.0, JWT, session management, passkeys, RBAC, and security best practices."
---

# Authentication & Authorization

## 1. OAuth 2.0 Flows

### Authorization Code Flow (Server-Side Apps)

The most secure flow for server-rendered apps. The client secret never leaves the server.

```
1. User clicks "Login with Google"
2. App redirects to: https://accounts.google.com/o/oauth2/auth?
     client_id=YOUR_CLIENT_ID&
     redirect_uri=https://app.com/callback&
     response_type=code&
     scope=openid email profile&
     state=random_csrf_token
3. User authenticates and consents
4. Google redirects to: https://app.com/callback?code=AUTH_CODE&state=random_csrf_token
5. Server exchanges code for tokens (server-to-server, secret included):
     POST https://oauth2.googleapis.com/token
     { code, client_id, client_secret, redirect_uri, grant_type: "authorization_code" }
6. Server receives: { access_token, refresh_token, id_token, expires_in }
```

### Authorization Code + PKCE (SPAs & Mobile)

For public clients that can't store a client secret securely.

```javascript
// 1. Generate PKCE verifier and challenge
function generatePKCE() {
  const verifier = crypto.randomUUID() + crypto.randomUUID();
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return { verifier, challenge };
}

// 2. Store verifier in sessionStorage, redirect with challenge
const { verifier, challenge } = await generatePKCE();
sessionStorage.setItem('pkce_verifier', verifier);

const authUrl = new URL('https://accounts.google.com/o/oauth2/auth');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('scope', 'openid email profile');
authUrl.searchParams.set('code_challenge', challenge);
authUrl.searchParams.set('code_challenge_method', 'S256');
authUrl.searchParams.set('state', crypto.randomUUID());
window.location.href = authUrl.toString();

// 3. On callback, exchange code with verifier (no client_secret needed)
const code = new URLSearchParams(window.location.search).get('code');
const verifier = sessionStorage.getItem('pkce_verifier');
const response = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    code, client_id: CLIENT_ID, redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code', code_verifier: verifier,
  }),
});
const tokens = await response.json();
```

### Client Credentials Flow (Machine-to-Machine)

For backend services, cron jobs, and API-to-API communication. No user involved.

```javascript
const response = await fetch('https://auth.example.com/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    audience: 'https://api.example.com',
    grant_type: 'client_credentials',
  }),
});
const { access_token } = await response.json();
```

---

## 2. JWT (JSON Web Tokens)

### Structure

```
header.payload.signature

Header:  { "alg": "RS256", "typ": "JWT", "kid": "key-id-1" }
Payload: { "sub": "user123", "email": "user@example.com", "role": "admin", "iat": 1706000000, "exp": 1706003600 }
Signature: RS256(base64url(header) + "." + base64url(payload), privateKey)
```

### JWT Validation (Node.js)

```javascript
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const client = jwksClient({ jwksUri: 'https://auth.example.com/.well-known/jwks.json' });

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    callback(err, key?.getPublicKey());
  });
}

function verifyToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, getKey, {
      algorithms: ['RS256'],
      issuer: 'https://auth.example.com',
      audience: 'https://api.example.com',
    }, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
}

// Express middleware
async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = await verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}
```

### Refresh Token Rotation

```javascript
// Server-side token refresh endpoint
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  // 1. Verify refresh token exists in DB and hasn't been used
  const stored = await db.refreshToken.findUnique({ where: { token: refreshToken } });
  if (!stored || stored.used || stored.expiresAt < new Date()) {
    // If token was already used, revoke entire family (potential theft)
    if (stored?.used) {
      await db.refreshToken.updateMany({
        where: { family: stored.family },
        data: { revoked: true },
      });
    }
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  // 2. Mark current token as used
  await db.refreshToken.update({ where: { id: stored.id }, data: { used: true } });

  // 3. Issue new token pair
  const accessToken = jwt.sign(
    { sub: stored.userId, role: stored.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  const newRefreshToken = crypto.randomUUID();
  await db.refreshToken.create({
    data: {
      token: newRefreshToken,
      userId: stored.userId,
      family: stored.family,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  });

  res.json({ accessToken, refreshToken: newRefreshToken });
});
```

**Token lifetimes:**
- Access token: 15 minutes (short-lived, stateless)
- Refresh token: 7-30 days (stored in DB, rotated on use)
- ID token: 1 hour (for client-side user info)

---

## 3. Session Management

### Cookie-Based Sessions (Traditional)

```javascript
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: '__session',  // Don't use default "connect.sid"
  cookie: {
    secure: true,       // HTTPS only
    httpOnly: true,     // No JavaScript access
    sameSite: 'lax',    // CSRF protection
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: '.example.com',
  },
}));
```

### Cookie vs Token Comparison

| Aspect | Cookie Sessions | JWT Tokens |
|--------|----------------|------------|
| Storage | Server (Redis/DB) | Client (localStorage/cookie) |
| Stateless | No (server lookup) | Yes (self-contained) |
| Revocation | Easy (delete from store) | Hard (need blocklist or short TTL) |
| Scalability | Need shared store | No shared state needed |
| XSS risk | httpOnly cookies safe | localStorage vulnerable |
| CSRF risk | Need CSRF token | Not vulnerable (if in header) |
| Mobile | Needs cookie support | Works everywhere |
| Best for | Server-rendered apps | SPAs, mobile, microservices |

---

## 4. NextAuth.js / Auth.js Setup

```typescript
// app/api/auth/[...nextauth]/route.ts (Next.js App Router)
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import GitHubProvider from 'next-auth/providers/github';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });
        if (!user || !user.hashedPassword) return null;
        const valid = await bcrypt.compare(
          credentials.password as string, user.hashedPassword
        );
        return valid ? user : null;
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.role = user.role; token.id = user.id; }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role;
      session.user.id = token.id;
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
});

export const { GET, POST } = handlers;
```

---

## 5. Passport.js Strategies

```javascript
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';

// Local strategy (email/password)
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    const user = await db.findUserByEmail(email);
    if (!user) return done(null, false, { message: 'Invalid email' });
    const valid = await bcrypt.compare(password, user.hashedPassword);
    if (!valid) return done(null, false, { message: 'Invalid password' });
    return done(null, user);
  }
));

// Google OAuth strategy
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  let user = await db.findUserByGoogleId(profile.id);
  if (!user) {
    user = await db.createUser({
      googleId: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
    });
  }
  return done(null, user);
}));

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await db.findUserById(id);
  done(null, user);
});
```

---

## 6. Passkeys / WebAuthn

```javascript
// Server-side (using @simplewebauthn/server)
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const rpName = 'My App';
const rpID = 'example.com';
const origin = 'https://example.com';

// Registration
app.post('/auth/passkey/register/options', async (req, res) => {
  const user = req.user;
  const existingKeys = await db.getCredentialsByUserId(user.id);
  const options = await generateRegistrationOptions({
    rpName, rpID,
    userID: user.id,
    userName: user.email,
    attestationType: 'none',
    excludeCredentials: existingKeys.map(k => ({
      id: k.credentialId, type: 'public-key',
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });
  await db.saveChallenge(user.id, options.challenge);
  res.json(options);
});

app.post('/auth/passkey/register/verify', async (req, res) => {
  const user = req.user;
  const challenge = await db.getChallenge(user.id);
  const verification = await verifyRegistrationResponse({
    response: req.body,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  });
  if (verification.verified) {
    await db.saveCredential(user.id, {
      credentialId: verification.registrationInfo.credentialID,
      publicKey: verification.registrationInfo.credentialPublicKey,
      counter: verification.registrationInfo.counter,
    });
  }
  res.json({ verified: verification.verified });
});

// Authentication
app.post('/auth/passkey/login/options', async (req, res) => {
  const options = await generateAuthenticationOptions({
    rpID,
    userVerification: 'preferred',
  });
  await db.saveSessionChallenge(req.sessionID, options.challenge);
  res.json(options);
});

app.post('/auth/passkey/login/verify', async (req, res) => {
  const challenge = await db.getSessionChallenge(req.sessionID);
  const credential = await db.getCredentialById(req.body.id);
  const verification = await verifyAuthenticationResponse({
    response: req.body,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    authenticator: {
      credentialPublicKey: credential.publicKey,
      credentialID: credential.credentialId,
      counter: credential.counter,
    },
  });
  if (verification.verified) {
    await db.updateCounter(credential.id, verification.authenticationInfo.newCounter);
    // Create session for user
    req.login(credential.user, () => res.json({ verified: true }));
  }
});
```

---

## 7. RBAC & ABAC

### Role-Based Access Control (RBAC)

```typescript
// Define roles and permissions
const PERMISSIONS = {
  admin: ['read', 'write', 'delete', 'manage_users', 'manage_billing'],
  editor: ['read', 'write'],
  viewer: ['read'],
} as const;

type Role = keyof typeof PERMISSIONS;
type Permission = typeof PERMISSIONS[Role][number];

// Middleware
function requirePermission(permission: Permission) {
  return (req, res, next) => {
    const userRole = req.user.role as Role;
    const permissions = PERMISSIONS[userRole] || [];
    if (!permissions.includes(permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}

// Usage
app.delete('/api/posts/:id', requirePermission('delete'), deletePost);
app.get('/api/posts', requirePermission('read'), listPosts);
```

### Attribute-Based Access Control (ABAC)

```typescript
// More granular: decisions based on user attributes, resource attributes, and context
interface PolicyContext {
  user: { id: string; role: string; department: string; };
  resource: { ownerId: string; type: string; status: string; };
  action: string;
}

function evaluatePolicy(ctx: PolicyContext): boolean {
  // Admins can do anything
  if (ctx.user.role === 'admin') return true;
  // Users can edit their own resources
  if (ctx.action === 'edit' && ctx.resource.ownerId === ctx.user.id) return true;
  // Editors can edit any published resource in their department
  if (ctx.action === 'edit' && ctx.user.role === 'editor' && ctx.resource.status === 'published') return true;
  return false;
}
```

---

## 8. Password Hashing

```javascript
import bcrypt from 'bcryptjs';
import argon2 from 'argon2';

// bcrypt (widely supported, good default)
const hash = await bcrypt.hash(password, 12);  // cost factor 12
const valid = await bcrypt.compare(password, hash);

// argon2id (recommended by OWASP, stronger but needs native module)
const hash = await argon2.hash(password, {
  type: argon2.argon2id,
  memoryCost: 65536,  // 64 MB
  timeCost: 3,
  parallelism: 4,
});
const valid = await argon2.verify(hash, password);
```

**Never:** MD5, SHA-1, SHA-256 (without salt/stretching), plain text.

---

## 9. MFA / 2FA with TOTP

```javascript
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

// Setup: generate secret and QR code
app.post('/auth/mfa/setup', async (req, res) => {
  const secret = authenticator.generateSecret();
  const otpauth = authenticator.keyuri(req.user.email, 'MyApp', secret);
  const qrCode = await QRCode.toDataURL(otpauth);
  await db.saveTempMfaSecret(req.user.id, secret);  // Don't activate yet
  res.json({ qrCode, secret });  // secret as backup code
});

// Verify and activate
app.post('/auth/mfa/verify', async (req, res) => {
  const { token } = req.body;
  const secret = await db.getTempMfaSecret(req.user.id);
  const valid = authenticator.verify({ token, secret });
  if (valid) {
    await db.activateMfa(req.user.id, secret);
    const backupCodes = Array.from({ length: 10 }, () =>
      crypto.randomBytes(4).toString('hex')
    );
    await db.saveBackupCodes(req.user.id, backupCodes);
    res.json({ success: true, backupCodes });
  } else {
    res.status(400).json({ error: 'Invalid code' });
  }
});

// Login with MFA
app.post('/auth/mfa/challenge', async (req, res) => {
  const { token, userId } = req.body;
  const user = await db.findUserById(userId);
  const valid = authenticator.verify({ token, secret: user.mfaSecret });
  if (!valid) {
    // Check backup codes
    const backupValid = await db.useBackupCode(userId, token);
    if (!backupValid) return res.status(401).json({ error: 'Invalid MFA code' });
  }
  // Issue session/token
  const accessToken = issueAccessToken(user);
  res.json({ accessToken });
});
```

---

## 10. Security Best Practices

### CSRF Protection

```javascript
import csrf from 'csurf';
// For cookie-based sessions
app.use(csrf({ cookie: { httpOnly: true, sameSite: 'strict', secure: true } }));
// Include token in forms: <input type="hidden" name="_csrf" value="<%= csrfToken() %>">
```

For SPAs with JWT: CSRF tokens aren't needed if tokens are sent in `Authorization` header (not cookies).

### Secure Cookie Configuration

```javascript
res.cookie('session', token, {
  httpOnly: true,     // JS can't read it
  secure: true,       // HTTPS only
  sameSite: 'lax',    // Blocks cross-origin POST
  maxAge: 86400000,   // 24h
  path: '/',
  domain: '.example.com',
});
```

### Rate Limiting Login Attempts

```javascript
import rateLimit from 'express-rate-limit';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 5,                      // 5 attempts per window
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  keyGenerator: (req) => req.body.email || req.ip,  // Rate limit by email
});

app.post('/auth/login', loginLimiter, loginHandler);
```

### Social Login Setup (Google, GitHub, Apple)

**Required env vars per provider:**

| Provider | Vars | Console URL |
|----------|------|-------------|
| Google | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | console.cloud.google.com |
| GitHub | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | github.com/settings/developers |
| Apple | `APPLE_CLIENT_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | developer.apple.com |

**Callback URLs:** Always register exact callback URLs. No wildcards in production.
