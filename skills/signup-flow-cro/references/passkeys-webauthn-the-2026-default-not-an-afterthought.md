## Contents

- 🔑 Passkeys & WebAuthn (the 2026 default, not an afterthought)
- When passkeys help vs hurt conversion
- Conditional UI (autofill) — the highest-converting pattern
- Creating a passkey at signup (registration ceremony)
- Account recovery & device loss — non-negotiable
- Passkey metrics to track

## 🔑 Passkeys & WebAuthn (the 2026 default, not an afterthought)

By mid-2026 passkeys (FIDO2/WebAuthn discoverable credentials, synced via
iCloud Keychain, Google Password Manager, Windows Hello, and third-party
managers like 1Password/Bitwarden) are the **lowest-friction, phishing-
resistant** way to both create and re-enter an account. For CRO they matter
because the happy path is "Face ID / fingerprint → done": no password to
invent, no email round-trip, no SMS. Offer them — but always with a fallback,
because passkey support and user familiarity are still uneven.

### When passkeys help vs hurt conversion

| Helps | Hurts / needs care |
|-------|--------------------|
| Returning sign-in (autofill makes it one tap) | First-time creation on an unfamiliar device — explain it briefly |
| Mobile, biometric-equipped devices | Shared/kiosk machines (passkey gets saved to the wrong vault) |
| Security-sensitive products (kills phishing + credential stuffing) | Users who don't recognize the OS prompt and cancel — measure cancel rate |
| Reducing password-reset support load | Account recovery if the user loses every synced device — you MUST provide a recovery path |

### Conditional UI (autofill) — the highest-converting pattern

Conditional UI surfaces existing passkeys inside the normal email field's
autofill dropdown, so returning users sign in without choosing a "passkey"
button at all. Gate it on a capability check so unsupported browsers fall
back cleanly.

```javascript
// Feature-detect, then offer passkey autofill on the sign-in form.
async function maybeStartPasskeyAutofill(emailInput) {
  const supported =
    window.PublicKeyCredential &&
    PublicKeyCredential.isConditionalMediationAvailable &&
    (await PublicKeyCredential.isConditionalMediationAvailable());

  if (!supported) return; // graceful fallback: plain email + password/social

  // 1) Mark the field so the browser knows to offer passkeys via autofill.
  emailInput.setAttribute('autocomplete', 'username webauthn');

  // 2) Ask your server for a fresh authentication challenge (per-request,
  //    single-use, short-lived; stored server-side bound to the session).
  const options = await fetch('/api/webauthn/authenticate/options', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }).then((r) => r.json());

  try {
    const assertion = await navigator.credentials.get({
      mediation: 'conditional', // <- the magic: shows in autofill, no modal
      publicKey: {
        challenge: base64urlToBuffer(options.challenge),
        rpId: options.rpId,                 // your registrable domain
        userVerification: 'preferred',
        allowCredentials: [],               // empty => discoverable credentials
      },
    });
    // 3) Verify the assertion on the SERVER (signature, challenge, origin,
    //    rpIdHash, and the credential's signCount). Never trust the client.
    await fetch('/api/webauthn/authenticate/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serializeAssertion(assertion)),
    });
    window.location.href = '/welcome';
  } catch (err) {
    if (err?.name !== 'AbortError') console.debug('passkey autofill skipped', err);
    // Do nothing on cancel — the email/password path is still right there.
  }
}
```

### Creating a passkey at signup (registration ceremony)

```javascript
// Call after the account exists (or alongside email capture). The challenge,
// user.id, rp.id and verification all live on YOUR server.
async function createPasskey() {
  if (!window.PublicKeyCredential) return offerPasswordInstead();

  const opts = await fetch('/api/webauthn/register/options', { method: 'POST' })
    .then((r) => r.json());

  try {
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge: base64urlToBuffer(opts.challenge),
        rp: { id: opts.rpId, name: opts.rpName },
        user: {
          id: base64urlToBuffer(opts.userIdB64), // opaque, NOT the email
          name: opts.email,                       // shown in the OS UI
          displayName: opts.displayName || opts.email,
        },
        pubKeyCredParams: [
          { type: 'public-key', alg: -7 },   // ES256
          { type: 'public-key', alg: -257 }, // RS256 (broader compatibility)
        ],
        authenticatorSelection: {
          residentKey: 'required',          // discoverable => usernameless
          userVerification: 'preferred',
        },
        // excludeCredentials: list the user's existing creds (from server)
        //   to prevent duplicate registrations on the same authenticator.
        timeout: 60000,
      },
    });
    await fetch('/api/webauthn/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(serializeAttestation(cred)),
    });
  } catch (err) {
    // Most failures here are user cancellations — fall back, don't block.
    offerPasswordInstead();
  }
}
```

> Implementation note: use a maintained server library
> (`@simplewebauthn/server` + `@simplewebauthn/browser`, or your IdP's
> SDK such as Auth0/Clerk/WorkOS/Stytch) rather than hand-rolling CBOR/COSE
> parsing. The `base64urlToBuffer`/`serialize*` helpers above are provided by
> those browser libraries.

### Account recovery & device loss — non-negotiable

Passkeys sync within an OS ecosystem, but a user can still lose access (left
the ecosystem, no synced devices, corporate device wiped). Always provide a
recovery path or you will manufacture lockouts that look like churn:

- Let users register **multiple** passkeys (phone + laptop + security key).
- Keep at least one **independent** recovery factor: a verified email magic
  link, recovery codes shown once at setup, or social login as a fallback.
- Offer **cross-device sign-in** (the QR + Bluetooth "hybrid" flow) so a user
  on a new desktop can authenticate with their phone's passkey.
- For enterprise, allow an admin-mediated reset rather than self-service only.

### Passkey metrics to track

- Passkey **offer rate** (eligible sessions where you showed it) and
  **acceptance rate**.
- **Creation success vs cancel** at signup (high cancel ⇒ unclear prompt).
- **Conditional-UI sign-in success** vs password sign-in success.
- Share of returning logins via passkey (target: rising over time).
- Recovery-path usage and support tickets for lockouts.
