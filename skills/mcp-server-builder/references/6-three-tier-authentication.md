## Contents

- 6. Three-Tier Authentication
- Tier Overview
- Auth Middleware Implementation
- Applying Auth to the Streamable HTTP Server
- 6b. OAuth 2.1 / OIDC Resource-Server Auth (bearer tokens)

## 6. Three-Tier Authentication

The core monetization architecture: free → API key → x402 micropayments.

### Tier Overview

| Tier | Auth | Rate Limit | Cost | Use Case |
|------|------|-----------|------|----------|
| **Free** | IP-based | 10 req/min, 100/day | $0 | Try before you buy |
| **Pro** | API key header | 100 req/min, 10k/day | $9/mo (Stripe) | Regular users |
| **Pay-per-use** | x402 payment | Unlimited | $0.005/call | AI agents, burst usage |

### Auth Middleware Implementation

```typescript
// src/auth/middleware.ts
import crypto from "crypto";
import type express from "express";

// --- Rate limiter (in-memory, use Redis in production) ---
interface RateEntry { count: number; resetAt: number; daily: number; dailyResetAt: number; }
const ipLimits = new Map<string, RateEntry>();
const keyLimits = new Map<string, RateEntry>();

function checkRateLimit(
  store: Map<string, RateEntry>,
  key: string,
  perMinute: number,
  perDay: number
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + 60_000, daily: entry?.daily ?? 0, dailyResetAt: entry?.dailyResetAt ?? now + 86_400_000 };
  }
  if (now > entry.dailyResetAt) {
    entry.daily = 0;
    entry.dailyResetAt = now + 86_400_000;
  }

  if (entry.count >= perMinute) return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  if (entry.daily >= perDay) return { allowed: false, retryAfter: Math.ceil((entry.dailyResetAt - now) / 1000) };

  entry.count++;
  entry.daily++;
  store.set(key, entry);
  return { allowed: true };
}

// --- Constant-time comparison (HMAC-based to avoid length leaks) ---
function secureCompare(a: string, b: string): boolean {
  // HMAC both inputs with a random key — normalizes to fixed-length hashes,
  // so timingSafeEqual works without an early-return length check.
  const key = crypto.randomBytes(32);
  const hmacA = crypto.createHmac("sha256", key).update(a).digest();
  const hmacB = crypto.createHmac("sha256", key).update(b).digest();
  return crypto.timingSafeEqual(hmacA, hmacB);
}

// --- API key store (use DB in production) ---
const API_KEYS = new Map<string, { userId: string; tier: string }>();

export function loadApiKeysFromEnv() {
  const keys = process.env.API_KEYS; // Format: "key1:user1,key2:user2"
  if (keys) {
    for (const pair of keys.split(",")) {
      const [key, userId] = pair.split(":");
      if (key && userId) API_KEYS.set(key, { userId, tier: "pro" });
    }
  }
}

// --- Main auth middleware ---
// x402 v2 lives in §7 (PAYMENT-REQUIRED / PAYMENT-SIGNATURE / PAYMENT-RESPONSE, base64 JSON,
// facilitator verify+settle). For a real deployment prefer the official `x402-express`
// middleware (§7) over hand-rolling header parsing. The hook below shows where the x402
// tier slots into the three-tier flow; `settleX402` is defined in §7.
export interface AuthResult {
  tier: "free" | "pro" | "x402";
  userId?: string;
  // settlement headers to echo on the 200 response (PAYMENT-RESPONSE), set by the x402 path
  responseHeaders?: Record<string, string>;
}

export async function authenticate(req: express.Request): Promise<{ auth: AuthResult } | { error: string; status: number; headers?: Record<string, string> }> {
  // 1. x402 v2: client presents a signed payload in PAYMENT-SIGNATURE (base64 JSON).
  const paymentSig = req.headers["payment-signature"] as string | undefined;
  if (paymentSig) {
    const { settled, paymentResponse, error } = await settleX402(paymentSig, req); // see §7
    if (settled) return { auth: { tier: "x402", responseHeaders: { "PAYMENT-RESPONSE": paymentResponse! } } };
    // Settlement failed → re-challenge with fresh requirements.
    return { error: error || "Payment settlement failed", status: 402, headers: { "PAYMENT-REQUIRED": buildPaymentRequired(req) } };
  }
  // No signature yet → challenge with 402 + PAYMENT-REQUIRED (base64 JSON array of requirements).
  if ((req.headers["accept-payment"] as string) === "x402") {
    return { error: "Payment required", status: 402, headers: { "PAYMENT-REQUIRED": buildPaymentRequired(req) } };
  }

  // 2. Check for API key
  const apiKey = req.headers["x-api-key"] as string || req.headers["authorization"]?.replace("Bearer ", "");
  if (apiKey) {
    let foundUser: { userId: string; tier: string } | undefined;
    for (const [storedKey, user] of API_KEYS) {
      if (secureCompare(apiKey, storedKey)) {
        foundUser = user;
        break;
      }
    }
    if (!foundUser) return { error: "Invalid API key", status: 401 };

    const limit = checkRateLimit(keyLimits, foundUser.userId, 100, 10_000);
    if (!limit.allowed) return { error: "Rate limit exceeded", status: 429, headers: { "Retry-After": String(limit.retryAfter) } };

    return { auth: { tier: "pro", userId: foundUser.userId } };
  }

  // 3. Fall back to free tier (IP rate limit)
  const ip = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
  const limit = checkRateLimit(ipLimits, ip, 10, 100);
  if (!limit.allowed) {
    return {
      error: "Rate limit exceeded. Get an API key at https://your-server.com/pricing or pay per use with x402.",
      status: 429,
      headers: { "Retry-After": String(limit.retryAfter) },
    };
  }

  return { auth: { tier: "free" } };
}
```

### Applying Auth to the Streamable HTTP Server

```typescript
// src/http-server-authed.ts
import express from "express";
import cors from "cors";
import crypto from "crypto";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { authenticate, loadApiKeysFromEnv, secureCompare, type AuthResult } from "./auth/middleware.js";

const app = express();

// MUST come before express.json() for webhook signature verification (see §8).
app.use("/webhooks/stripe", express.raw({ type: "application/json" }));
app.use(express.json());

// CORS: explicit origins, fail closed (never "*" — esp. with credentials). Expose the session header.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : false,
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type", "Mcp-Session-Id", "Last-Event-ID", "Authorization", "X-API-Key", "PAYMENT-SIGNATURE", "Accept-Payment"],
  exposedHeaders: ["Mcp-Session-Id", "PAYMENT-REQUIRED", "PAYMENT-RESPONSE"],
}));

loadApiKeysFromEnv();

// Health + admin endpoints
app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

app.get("/admin/stats", (req, res) => {
  const adminKey = req.headers["x-admin-key"] as string | undefined;
  // Constant-time compare — never use !== on a secret (timing leak). Mirror the secureCompare in §9.
  if (!adminKey || !process.env.ADMIN_KEY || !secureCompare(adminKey, process.env.ADMIN_KEY)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({
    activeSessions: Object.keys(transports).length,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

// --- Stripe Webhook for subscription management ---
// Use stripe.webhooks.constructEvent instead of manual HMAC verification.
// It handles timestamp tolerance (rejects events older than 5 minutes) and
// proper signature comparison.
app.post("/webhooks/stripe", async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(400).send("Missing signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return res.status(400).send(`Webhook error: ${err.message}`);
  }
  switch (event.type) {
    case "checkout.session.completed":
      console.log("New subscription:", event.data.object.customer_email);
      // Provision API key for customer
      break;
    case "customer.subscription.deleted":
      console.log("Subscription cancelled:", event.data.object.id);
      // Revoke API key
      break;
  }

  res.json({ received: true });
});

// --- Pricing endpoint ---
app.get("/pricing", (_req, res) => {
  res.json({
    tiers: [
      { name: "Free", price: "$0", limits: "10 req/min, 100/day", features: ["All tools", "IP rate limited"] },
      { name: "Pro", price: "$9/mo", limits: "100 req/min, 10k/day", features: ["All tools", "API key", "Priority support"], stripeLink: process.env.STRIPE_CHECKOUT_LINK },
      { name: "Pay-per-use", price: "$0.005/call", limits: "Unlimited", features: ["All tools", "x402 micropayments", "No subscription needed"] },
    ],
  });
});

// --- MCP Streamable HTTP with three-tier auth ---
// Authenticate on the `initialize` POST (the start of a session); the tier is then bound
// to that session's McpServer. GET/DELETE just resume/terminate an already-authed session.
const transports: Record<string, StreamableHTTPServerTransport> = {};

app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  // Existing session → trust the prior auth, reuse the transport.
  if (sessionId && transports[sessionId]) {
    return transports[sessionId].handleRequest(req, res, req.body);
  }
  if (sessionId || !isInitializeRequest(req.body)) {
    return res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Bad Request: no valid session id" }, id: null });
  }

  // New session: run the tiered auth gate.
  const authResult = await authenticate(req);
  if ("error" in authResult) {
    if (authResult.headers) for (const [k, v] of Object.entries(authResult.headers)) res.setHeader(k, v);
    return res.status(authResult.status).json({ error: authResult.error });
  }
  const { auth } = authResult;
  // x402 settlement receipt (PAYMENT-RESPONSE) rides back on the 200.
  if (auth.responseHeaders) for (const [k, v] of Object.entries(auth.responseHeaders)) res.setHeader(k, v);
  console.log(`New session: tier=${auth.tier}, userId=${auth.userId || "anonymous"}`);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sid) => { transports[sid] = transport; },
  });
  transport.onclose = () => { const sid = transport.sessionId; if (sid) delete transports[sid]; };
  await createMcpServer(auth).connect(transport);
  await transport.handleRequest(req, res, req.body);
});

const sessionRequest = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) return res.status(400).send("Invalid or missing session id");
  await transports[sessionId].handleRequest(req, res);
};
app.get("/mcp", sessionRequest);
app.delete("/mcp", sessionRequest);

function createMcpServer(_auth: AuthResult): McpServer {
  const server = new McpServer({ name: "my-mcp-server", version: "1.0.0" });
  // Register tools here — all tiers get all tools; rate limiting / payment gate access.
  return server;
}

const PORT = parseInt(process.env.PORT || "3100");
app.listen(PORT, () => console.log(`MCP server running on http://localhost:${PORT}/mcp`));
```

### 6b. OAuth 2.1 / OIDC Resource-Server Auth (bearer tokens)

For enterprise / hosted MCP servers, validate **OAuth 2.1 bearer tokens** instead of (or alongside) API keys. The MCP server is an OAuth **resource server**: it verifies the access token a client got from your IdP (Auth0, Okta, Entra ID, Keycloak, Cognito…), checks the **audience** and **scopes**, and advertises its metadata so clients can discover where to authorize.

The SDK ships `requireBearerAuth({ verifier, requiredScopes, resourceMetadataUrl })`, which returns `401` with a proper `WWW-Authenticate` header (including `resource_metadata` for MCP's authorization flow) when a token is missing/invalid/under-scoped. You supply an `OAuthTokenVerifier` — typically a JWT validator backed by your IdP's JWKS:

```typescript
// src/auth/oauth.ts
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { OAuthTokenVerifier } from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

// JWKS is fetched once and cached/rotated by jose — do NOT re-create per request.
const ISSUER = process.env.OAUTH_ISSUER!;                 // e.g. https://tenant.us.auth0.com/
const AUDIENCE = process.env.OAUTH_AUDIENCE!;             // this MCP server's resource id / API identifier
const jwks = createRemoteJWKSet(new URL(`${ISSUER}.well-known/jwks.json`));

export const verifier: OAuthTokenVerifier = {
  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: ISSUER,
      audience: AUDIENCE,                                  // reject tokens minted for a different resource
    });
    const scopes = typeof payload.scope === "string" ? payload.scope.split(" ") : [];
    // `expiresAt` lets the SDK reject expired tokens; clientId aids logging/rate-limiting.
    return { token, clientId: String(payload.azp ?? payload.client_id ?? ""), scopes, expiresAt: payload.exp };
  },
};
```

```typescript
// src/http-server-oauth.ts — wire it onto /mcp
import { requireBearerAuth } from "@modelcontextprotocol/sdk/server/auth/middleware/bearerAuth.js";
import { mcpAuthMetadataRouter, getOAuthProtectedResourceMetadataUrl } from "@modelcontextprotocol/sdk/server/auth/router.js";
import { verifier } from "./auth/oauth.js";

const mcpServerUrl = new URL(process.env.MCP_PUBLIC_URL || "https://mcp.yourdomain.com/mcp");
const resourceMetadataUrl = getOAuthProtectedResourceMetadataUrl(mcpServerUrl);

// Publishes /.well-known/oauth-protected-resource so MCP clients can discover the IdP + scopes.
app.use(mcpAuthMetadataRouter({
  oauthMetadata: { issuer: process.env.OAUTH_ISSUER!, authorization_endpoint: `${process.env.OAUTH_ISSUER}authorize`, token_endpoint: `${process.env.OAUTH_ISSUER}oauth/token`, response_types_supported: ["code"] },
  resourceServerUrl: mcpServerUrl,
  scopesSupported: ["mcp:tools:read", "mcp:tools:write"],
  resourceName: "my-mcp-server",
}));

// Require a valid bearer token (and a scope) on the MCP endpoint. On failure the SDK emits
// 401 + WWW-Authenticate: Bearer ..., resource_metadata="<resourceMetadataUrl>".
const bearer = requireBearerAuth({ verifier, requiredScopes: ["mcp:tools:read"], resourceMetadataUrl });
app.post("/mcp", bearer, /* mcpPostHandler from §6 — req.auth now holds the AuthInfo */);
app.get("/mcp", bearer, sessionRequest);
app.delete("/mcp", bearer, sessionRequest);
```

> **Per-tool scopes.** Coarse gate at the middleware (`mcp:tools:read`); enforce write scopes inside the handler: read `req.auth.scopes` (or `extra.authInfo` in newer SDKs) and reject a mutating tool if the caller lacks `mcp:tools:write`. **Always check `aud`** — a token minted for another service must not be replayable against your MCP server.

---
