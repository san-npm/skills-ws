## Contents

- 8. Express.js Architecture
- Full Production Server Structure
- Critical Express.js Ordering

## 8. Express.js Architecture

### Full Production Server Structure

```
src/
├── index.ts              # Entry point (stdio)
├── http-server.ts        # Streamable HTTP server (/mcp)
├── auth/
│   ├── middleware.ts      # Three-tier auth
│   ├── oauth.ts          # OAuth 2.1 bearer verifier (JWKS)
│   ├── rate-limiter.ts   # Rate limiting logic
│   └── x402.ts           # x402 v2 verify + settle helpers
├── tools/
│   ├── screenshot.ts     # Screenshot tool
│   ├── dns.ts            # DNS lookup tool
│   ├── whois.ts          # WHOIS tool
│   ├── ssl.ts            # SSL check tool
│   ├── ocr.ts            # OCR tool
│   └── blockchain.ts     # EVM tools
├── monitoring/
│   ├── logger.ts         # Structured logging
│   └── metrics.ts        # Usage metrics per tier
└── config.ts             # Environment config
```

### Critical Express.js Ordering

```typescript
// THE ORDER MATTERS. Get this wrong and webhooks break silently.

const app = express();

// 1. Raw body for webhooks — MUST be before express.json()
app.use("/webhooks/stripe", express.raw({ type: "application/json" }));
app.use("/webhooks/github", express.raw({ type: "application/json" }));

// 2. JSON parser for everything else
app.use(express.json({ limit: "1mb" }));

// 3. CORS — fail CLOSED. Never "*", and especially never "*" with credentials:true
//    (the browser rejects that combo, and a wildcard on an auth endpoint is unsafe).
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : false, // no env set ⇒ deny all cross-origin
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Mcp-Session-Id", "Last-Event-ID", "Authorization", "X-API-Key", "PAYMENT-SIGNATURE", "Accept-Payment"],
  exposedHeaders: ["Mcp-Session-Id", "PAYMENT-REQUIRED", "PAYMENT-RESPONSE"],
  credentials: true, // safe now: only echoed for explicitly listed origins, never "*"
}));

// 4. Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path} [${req.ip}]`);
  next();
});

// 5. Health check (no auth)
app.get("/health", (_req, res) => res.json({ status: "ok", version: "1.0.0", uptime: process.uptime() }));

// 6. Admin endpoints (admin auth)
// app.get("/admin/stats", adminAuth, statsHandler);

// 7. Webhook endpoints (signature verification, raw body)
// app.post("/webhooks/stripe", stripeWebhookHandler);

// 8. Pricing / docs (public)
// app.get("/pricing", pricingHandler);

// 9. MCP endpoints (three-tier auth) — Streamable HTTP is the default (see §2a/§6).
// app.post("/mcp", mcpPostHandler);    // JSON-RPC requests (+ initialize)
// app.get("/mcp", sessionRequest);     // server→client SSE stream / resume
// app.delete("/mcp", sessionRequest);  // session teardown
// Legacy HTTP+SSE clients only (backward-compat appendix): app.get("/sse", ...); app.post("/messages", ...);
```

---
