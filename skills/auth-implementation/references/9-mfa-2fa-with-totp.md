## 9. MFA / 2FA with TOTP

Three correctness rules this implements:
1. **Never return the TOTP secret to the client as a "backup code."** The secret is the authenticator seed; if it's also a "backup code" then anyone who saw setup can mint valid TOTP codes forever. Backup codes are **separate, random, single-use, stored hashed**.
2. **Verify enrollment before activating**, and tolerate one time-step of clock drift (`epochTolerance: 30`, one 30-second step; otplib v12 called this `window: 1`).
3. **Bind the login MFA step to a pending first-factor session** — never trust a `userId` from the request body, or anyone can complete MFA "as" any user id.

```javascript
import { generateSecret, generateURI, verify } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'node:crypto';

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// --- Setup: generate secret + QR. Do NOT return the secret as a backup code. ---
app.post('/auth/mfa/setup', requireAuth, async (req, res) => {
  const secret = generateSecret();
  const otpauth = generateURI({ issuer: 'MyApp', label: req.user.email, secret });
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
  if (!secret || !(await verify({ token, secret, epochTolerance: 30 })).valid) {
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
  let ok = (await verify({ token, secret: user.mfaSecret, epochTolerance: 30 })).valid;
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

This targets otplib v13 (async, returns `{ valid }`); code written for the v12 `authenticator` API should pin `otplib@^12`.

Rate-limit `/auth/mfa/challenge` per pending session (e.g., 5 attempts) and expire `mfaPending` after a few minutes. For recovery, require re-verification (email link + cooldown) before disabling MFA, and re-issue fresh backup codes when the user regenerates them.

---
