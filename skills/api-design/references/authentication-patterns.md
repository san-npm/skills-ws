## Contents

- Authentication Patterns
- JWT Access + Refresh Token (Fastify)
- API Keys (Service-to-Service)

## Authentication Patterns

### JWT Access + Refresh Token (Fastify)

```typescript
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import jwt from '@fastify/jwt';

const app = Fastify();

await app.register(jwt, {
  secret: process.env.JWT_SECRET!,
  sign: { expiresIn: '15m' },  // Short-lived access tokens
});

// Decorate the `authenticate` preHandler used by protected routes below.
// Without this decorator the `preHandler: [app.authenticate]` example throws.
app.decorate('authenticate', async (request, reply) => {
  try {
    await request.jwtVerify();  // populates request.user from the Bearer token
  } catch {
    throw new AppError(401, 'UNAUTHENTICATED', 'Missing or invalid access token');
  }
});

// TypeScript: augment Fastify so `app.authenticate` and `request.user` type-check.
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: string };  // sign() input
    user: { sub: string; role: string };     // request.user shape
  }
}

// Refresh tokens use a SELECTOR.SECRET design so lookup is a single indexed
// query, never a scan over every active hash:
//   - selector: random id, stored in plaintext, UNIQUE-indexed — used to find the row
//   - secret:   random, stored only as an argon2 hash — verified in constant time
//   - familyId: groups every token descended from one login, so reuse of a
//               rotated token can revoke the whole family (theft detection)
// Wire format handed to the client is `${selector}.${secret}`.
function issueRefreshToken(userId: string, familyId: string) {
  const selector = crypto.randomBytes(16).toString('base64url');
  const secret = crypto.randomBytes(32).toString('base64url');
  return { token: `${selector}.${secret}`, selector, secret, familyId, userId };
}

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Login
app.post('/api/v1/auth/login', async (req, reply) => {
  const { email, password } = req.body as { email: string; password: string };

  const user = await db.findUserByEmail(email);
  if (!user || !await argon2.verify(user.passwordHash, password)) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const accessToken = app.jwt.sign({ sub: user.id, role: user.role });
  const familyId = crypto.randomUUID();
  const rt = issueRefreshToken(user.id, familyId);

  await db.storeRefreshToken({
    selector: rt.selector,
    secretHash: await argon2.hash(rt.secret),  // never store the raw secret
    userId: rt.userId,
    familyId: rt.familyId,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  });

  reply.send({ accessToken, refreshToken: rt.token, expiresIn: 900 });
});

// Refresh — rotate, and detect reuse of an already-rotated token
app.post('/api/v1/auth/refresh', async (req, reply) => {
  const { refreshToken } = req.body as { refreshToken: string };
  const [selector, secret] = (refreshToken ?? '').split('.');
  if (!selector || !secret) {
    throw new AppError(401, 'INVALID_TOKEN', 'Malformed refresh token');
  }

  // Single indexed lookup by selector — O(1), no hash scan.
  const row = await db.findRefreshTokenBySelector(selector);
  if (!row || !await argon2.verify(row.secretHash, secret)) {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid refresh token');
  }

  // Reuse detection: a token that's already been consumed/revoked but is
  // presented again means it was likely stolen → kill the whole family.
  if (row.consumedAt || row.revokedAt || row.expiresAt < new Date()) {
    await db.revokeRefreshTokenFamily(row.familyId);
    throw new AppError(401, 'TOKEN_REUSE_DETECTED', 'Refresh token reuse detected; session revoked');
  }

  // Rotate atomically: mark this token consumed and insert its successor in
  // one transaction so a crash can't leave the user with zero valid tokens.
  const rt = issueRefreshToken(row.userId, row.familyId);
  await db.rotateRefreshToken({
    consumeSelector: selector,
    next: {
      selector: rt.selector,
      secretHash: await argon2.hash(rt.secret),
      userId: rt.userId,
      familyId: rt.familyId,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });

  const user = await db.findUser(row.userId);
  const accessToken = app.jwt.sign({ sub: user.id, role: user.role });

  reply.send({ accessToken, refreshToken: rt.token, expiresIn: 900 });
});

// Protected route
app.get('/api/v1/me', {
  preHandler: [app.authenticate],
}, async (req, reply) => {
  const user = await db.findUser(req.user.sub);
  reply.send({ data: user });
});
```

### API Keys (Service-to-Service)

```typescript
// Generate API keys
function generateApiKey(): { key: string; hash: string; prefix: string } {
  // Pick a prefix unique to your product; do not imitate another vendor's
  // format (sk_live_ is Stripe's), it confuses secret scanners.
  const key = `myapp_live_${crypto.randomBytes(32).toString('base64url')}`;
  const prefix = key.slice(0, 15);  // For identification without exposing key
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return { key, hash, prefix };
}

// Validate — always compare hashes, never raw keys
async function validateApiKey(key: string): Promise<ApiKeyRecord | null> {
  const hash = crypto.createHash('sha256').update(key).digest('hex');
  return db.findApiKeyByHash(hash);
}

// Middleware
async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['x-api-key'] as string
    || req.headers.authorization?.replace('Bearer ', '');

  if (!key) throw new AppError(401, 'MISSING_API_KEY', 'API key required');

  const record = await validateApiKey(key);
  if (!record) throw new AppError(401, 'INVALID_API_KEY', 'Invalid API key');
  if (record.revokedAt) throw new AppError(401, 'REVOKED_API_KEY', 'API key has been revoked');

  req.apiKey = record;
  next();
}
```

---
