## Contents

- Authentication Deep Dive
- Bcrypt vs Argon2
- JWT Pitfalls
- MFA Implementation (TOTP)
- Prefer WebAuthn / Passkeys (phishing-resistant)

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
// ❌ PITFALL 1: Not pinning the algorithm (alg confusion / key confusion)
// Maintained libs (jsonwebtoken >=9, jose) reject alg:"none" by default, but the
// real risk today is KEY CONFUSION: an RS256 verifier that omits `algorithms`
// can be tricked into treating the RSA *public* key as an HS256 *secret* — the
// attacker signs HS256 with the public key you publish. Always pin algorithms.
jwt.verify(token, publicKey); // ❌ alg taken from attacker-controlled header

// ✅ FIX: pin the exact algorithm(s), plus issuer/audience
jwt.verify(token, publicKey, {
  algorithms: ['RS256'],          // never accept a list that mixes HS* and RS*/ES*
  issuer: 'https://auth.example.com',
  audience: 'https://api.example.com',
});

// ❌ PITFALL 2: Storing sensitive data in JWT payload (it's only base64, not encrypted)
jwt.sign({ id: user.id, email: user.email, ssn: user.ssn }, privateKey);

// ✅ FIX: Minimal payload, look up details server-side
jwt.sign({ sub: user.id, role: user.role }, privateKey, { algorithm: 'RS256' });

// ❌ PITFALL 3: No token revocation
// JWTs are valid until they expire — you can't "log out" a stateless token.

// ✅ FIX: Short expiry (15min) + rotating refresh tokens + a jti denylist
const DENYLIST = new Set(); // Redis with TTL = remaining token lifetime, in prod
function isTokenDenied(jti) { return DENYLIST.has(jti); }

jwt.sign({ sub: user.id, jti: crypto.randomUUID() }, privateKey,
  { algorithm: 'RS256', expiresIn: '15m' });

// EdDSA (Ed25519) is a strong modern default — smaller keys, fast, no padding
// pitfalls. Use `algorithm: 'EdDSA'` with an Ed25519 key pair where supported.
```

> **Key rotation:** publish current + previous public keys via a JWKS endpoint
> keyed by `kid`; verifiers pick the key from the token's `kid` header. Sign only
> with the newest private key. This lets you rotate without invalidating live tokens.

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

  // ⚠️ The TOTP `secret` is the SEED, not a backup code. Returning it once for
  // manual entry is fine, but it is sensitive (anyone with it can mint codes
  // forever) and is NOT a recovery mechanism. Generate SEPARATE recovery codes:
  const recoveryCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(5).toString('hex') // 10-char one-time codes
  );
  // Store only HASHES; each code is single-use (delete the hash when consumed).
  await db.storeRecoveryCodes(
    req.user.id,
    recoveryCodes.map((c) => crypto.createHash('sha256').update(c).digest('hex'))
  );

  // Show the QR (or manual seed) + recovery codes ONCE; never persist plaintext.
  res.json({ qr, otpauthManualEntry: secret, recoveryCodes });
});

// Verify: user proves they set up their authenticator app
// Rate-limit MFA attempts (6-digit codes have only 1M possibilities — brute-forceable
// over a ~90s window of valid steps without throttling).
const mfaLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5 });

app.post('/api/mfa/verify', mfaLimiter, async (req, res) => {
  const secret = decrypt(await db.getMfaSecret(req.user.id));
  // `window: 1` tolerates one step of clock skew (±30s); do not widen further.
  const isValid = authenticator.verify({ token: req.body.code, secret });

  if (!isValid) return res.status(400).json({ error: 'Invalid code' });

  await db.enableMfa(req.user.id);
  res.json({ success: true });
});

// Recovery-code login path (when the user lost their authenticator):
async function consumeRecoveryCode(userId, code) {
  const h = crypto.createHash('sha256').update(code).digest('hex');
  const ok = await db.deleteRecoveryCodeHash(userId, h); // atomic; single-use
  return ok; // false if not found / already used
}

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

### Prefer WebAuthn / Passkeys (phishing-resistant)

TOTP is shared-secret and phishable (a fake login page can relay the 6-digit code in
real time). For the strongest MFA, use **WebAuthn/passkeys** — the credential is bound
to the origin, so a phishing domain cannot use it.

```typescript
import {
  generateRegistrationOptions, verifyRegistrationResponse,
  generateAuthenticationOptions, verifyAuthenticationResponse,
} from '@simplewebauthn/server';

const rpID = 'example.com';           // must match the site origin's domain
const origin = 'https://example.com';

// Registration: server issues a challenge, browser creates a key pair.
app.post('/api/passkey/register/options', async (req, res) => {
  const opts = await generateRegistrationOptions({
    rpName: 'MyApp', rpID, userName: req.user.email,
    attestationType: 'none',
    authenticatorSelection: { residentKey: 'preferred', userVerification: 'preferred' },
  });
  await db.saveChallenge(req.user.id, opts.challenge); // bind challenge to session
  res.json(opts);
});

app.post('/api/passkey/register/verify', async (req, res) => {
  const expectedChallenge = await db.getChallenge(req.user.id);
  const { verified, registrationInfo } = await verifyRegistrationResponse({
    response: req.body, expectedChallenge, expectedOrigin: origin, expectedRPID: rpID,
  });
  if (!verified) return res.status(400).json({ error: 'Verification failed' });
  // Persist credentialID, publicKey, and the signature counter (replay defense).
  await db.saveCredential(req.user.id, registrationInfo!);
  res.json({ verified });
});
// Authentication mirrors this with generate/verifyAuthenticationResponse and
// MUST persist the updated `newCounter` to detect cloned authenticators.
```

---
