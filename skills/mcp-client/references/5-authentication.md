## Contents

- 5. Authentication
- 5.1 OAuth 2.1 discovery flow (spec)
- 5.2 OAuth in the TypeScript SDK
- 5.3 Provider-specific header auth
- 5.4 Token hygiene

## 5. Authentication

There are two worlds:

1. **OAuth 2.1** — the MCP spec's standard for remote HTTP servers. The server is an OAuth *resource server*; you obtain a token from its authorization server and send `Authorization: Bearer <token>`.
2. **Provider-specific headers** — many real servers just want a static API-key header (`Authorization: Bearer ...`, `X-Api-Key: ...`). Simpler, but the key is long-lived — store and scope it carefully.

### 5.1 OAuth 2.1 discovery flow (spec)

1. Client hits the MCP endpoint with no token → server returns **`401 Unauthorized`** with a `WWW-Authenticate: Bearer ... resource_metadata="https://server/.well-known/oauth-protected-resource"` header. If the header is absent, fall back to the well-known PRM URIs (endpoint path first, then root).
2. Client fetches that **Protected Resource Metadata (PRM)** doc to learn the authorization server(s).
3. Client fetches the authorization server's metadata (try RFC 8414 `/.well-known/oauth-authorization-server`, then OpenID Connect Discovery `/.well-known/openid-configuration`; clients must support both), then runs an **Authorization Code + PKCE** flow using the `S256` challenge method (refuse to proceed if the metadata lacks `code_challenge_methods_supported`). For client registration, prefer **Client ID Metadata Documents** (an HTTPS URL as `client_id`, advertised via `client_id_metadata_document_supported`); Dynamic Client Registration is an optional fallback kept for backwards compatibility. Include the `resource` parameter (RFC 8707, the MCP server's canonical URL) in **both** the authorization request and the token request so the token is audience-bound to this server, and get an access token (+ refresh token).
4. Client retries with `Authorization: Bearer <access_token>`.
5. On `401`/expiry, refresh; on `403` you lack scope.

### 5.2 OAuth in the TypeScript SDK

For a token minted out-of-band, don't reach for `authProvider`; just send it as a static header (same pattern as §5.3):

```typescript
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const transport = new StreamableHTTPClientTransport(new URL('https://api.example.com/mcp'), {
  requestInit: { headers: new Headers({ Authorization: `Bearer ${process.env.MCP_TOKEN}` }) },
});
```

Reserve `authProvider` for full interactive OAuth (PKCE, redirect, token persistence): it must implement the complete `OAuthClientProvider` interface (redirect URL, client metadata, `clientInformation()`, `tokens()`/`saveTokens()`, `redirectToAuthorization()`, code-verifier storage), and you call `transport.finishAuth(authorizationCode)` after the redirect returns. Check the current interface at https://ts.sdk.modelcontextprotocol.io/ (v1 SDK docs; v2 docs under `/v2/`), the auth API evolves.

### 5.3 Provider-specific header auth

```typescript
const transport = new StreamableHTTPClientTransport(new URL('https://api.example.com/mcp'), {
  requestInit: { headers: new Headers({ 'X-Api-Key': process.env.SERVICE_API_KEY! }) },
});
```

### 5.4 Token hygiene

- **Never** hardcode tokens in source or commit them in config; read from env / a secret manager.
- **Never** put secrets in URLs or stdio `args` (they leak to logs / `ps`); use headers or `env`.
- Prefer **short-lived** access tokens + refresh; rotate long-lived API keys on a schedule.
- Request **least privilege** scopes; use a distinct key per app/environment so one leak is contained.
- Validate every authorization URL a server hands you before opening it: allow only `http`/`https` (`http` solely for loopback during development), reject `javascript:`, `data:`, `file:`, `vbscript:`, and never open the URL through a shell command (use a platform URL-opening API instead). A malicious server can otherwise turn the OAuth redirect into XSS or code execution.
- Treat a server as untrusted: it can return prompt-injection-laden tool output. Don't auto-execute server-suggested shell/SQL; gate sampling/elicitation behind user approval.

---
