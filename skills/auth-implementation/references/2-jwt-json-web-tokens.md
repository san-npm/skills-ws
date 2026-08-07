## Contents

- 2. JWT (JSON Web Tokens)
- Structure
- JWT Validation (Node.js) — pin algorithm, issuer, audience
- Refresh Token Rotation — hashed, atomic, reuse-detecting

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

      const user = await tx.user.findUnique({ where: { id: stored.userId } });
      const accessToken = jwt.sign(
        { sub: stored.userId, role: user.role },
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
