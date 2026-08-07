## Contents

- 1. OAuth 2.1 / OIDC Flows
- Discover endpoints (don't hardcode)
- Authorization Code + PKCE — full server-side flow with state
- Authorization Code + PKCE — public client (SPA/mobile) caveat
- Client Credentials Flow (Machine-to-Machine)

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
