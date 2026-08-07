---
name: auth-implementation
description: "Secure authentication & authorization — OAuth 2.1/OIDC with PKCE & state, JWT/JWKS verification, hashed-rotating refresh tokens, sessions/BFF, passkeys/WebAuthn, MFA/TOTP, RBAC/ABAC, password hashing, and CSRF. Use when implementing or reviewing auth, authz, MFA, passkeys, OAuth/OIDC, sessions, tokens, or access control."
---
# Authentication & Authorization

Security-critical patterns for AuthN/AuthZ in 2026. Code here is meant to be copied, so it is written to be correct and safe by default: every secret stored hashed, every token rotation atomic, every redirect-based flow CSRF-protected via `state`/PKCE. Vendor endpoints and library APIs drift — when a value here is dated, the inline note tells you where to re-verify.

**Threat-model defaults**: assume the browser is hostile (XSS can read anything JS can), assume tokens leak, assume requests are replayed and races happen. Prefer short-lived access tokens + server-held session/refresh state. For SPAs, prefer a **BFF (Backend-for-Frontend)** holding tokens server-side over putting access tokens in `localStorage`.

---

## Safety gate

Before executing commands or changing external systems, confirm scope, credentials, target environment, rollback, and required approval. Pin and verify third-party artifacts; never expose secrets to client code or logs.

## Reference guide

Read only the references needed for the current request:

- **1. OAuth 2.1 / OIDC Flows**: [references/1-oauth-2-1-oidc-flows.md](references/1-oauth-2-1-oidc-flows.md)
- **2. JWT (JSON Web Tokens)**: [references/2-jwt-json-web-tokens.md](references/2-jwt-json-web-tokens.md)
- **3. Session Management**: [references/3-session-management.md](references/3-session-management.md)
- **4. Auth.js v5 (NextAuth) Setup — App Router**: [references/4-auth-js-v5-nextauth-setup-app-router.md](references/4-auth-js-v5-nextauth-setup-app-router.md)
- **5. Passport.js Strategies**: [references/5-passport-js-strategies.md](references/5-passport-js-strategies.md)
- **6. Passkeys / WebAuthn (`@simplewebauthn/server` v13)**: [references/6-passkeys-webauthn-simplewebauthn-server-v13.md](references/6-passkeys-webauthn-simplewebauthn-server-v13.md)
- **7. RBAC & ABAC**: [references/7-rbac-abac.md](references/7-rbac-abac.md)
- **8. Password Hashing**: [references/8-password-hashing.md](references/8-password-hashing.md)
- **9. MFA / 2FA with TOTP**: [references/9-mfa-2fa-with-totp.md](references/9-mfa-2fa-with-totp.md)
- **10. Security Best Practices**: [references/10-security-best-practices.md](references/10-security-best-practices.md)
