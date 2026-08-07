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
