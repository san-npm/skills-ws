---
name: mcp-server-builder
description: Build and monetize production MCP servers — tool schemas, transports, auth, Stripe subscriptions, x402 payments, deployment
version: 1.0.0
---

# MCP Server Builder — Production Skill

> Build production-grade Model Context Protocol servers that wrap any REST API into AI-callable tools, with three-tier auth, monetization, and battle-tested deployment.

## When to Use

- User wants to build an MCP server (stdio or SSE transport)
- User wants to wrap a REST API as MCP tools
- User asks about MCP architecture, tool schemas, or transports
- User wants to monetize an MCP server (free tier, API keys, x402 micropayments)
- User mentions `@modelcontextprotocol/sdk`, `mcp` Python package, or MCP in general

---

## 1. MCP Architecture Overview

MCP (Model Context Protocol) defines three primitives that a server exposes to AI clients:

| Primitive    | Purpose                              | Example                          |
|-------------|---------------------------------------|----------------------------------|
| **Tools**    | Actions the model can invoke          | `screenshot`, `dns_lookup`       |
| **Resources**| Read-only data the model can access   | `config://settings`, `db://users`|
| **Prompts**  | Reusable prompt templates             | `summarize`, `code_review`       |

### Transports

**stdio** — Server runs as a child process. Client spawns it, communicates over stdin/stdout.
Best for: local tools, Claude Desktop, CLI integrations.

**SSE (Server-Sent Events)** — Legacy HTTP transport. Client connects via SSE for server→client messages, POST for client→server.
**Note:** SSE transport was deprecated in MCP spec 2025-03-26. New servers should use `StreamableHTTPServerTransport` from `@modelcontextprotocol/sdk/server/streamableHttp.js`. SSE examples below still work but are considered legacy.

**Streamable HTTP** — Modern HTTP transport (MCP spec 2025-03-26+). Replaces SSE with a simpler request/response model.
Best for: remote servers, shared services, monetized APIs.

### Message Flow (SSE)

```
Client                          Server
  |--- GET /sse ------------------>|  (SSE connection opens)
  |<-- event: endpoint            |  (server sends POST endpoint URL)
  |                                |
  |--- POST /messages ------------>|  (JSON-RPC request: tools/call)
  |<-- SSE event: message --------|  (JSON-RPC response)
```

### JSON-RPC Protocol

Every MCP message is JSON-RPC 2.0:

```json
// Request
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"screenshot","arguments":{"url":"https://example.com"}}}

// Response
{"jsonrpc":"2.0","id":1,"result":{"content":[{"type":"text","text":"Screenshot captured successfully"}]}}
```

---

## 2. Server Setup — TypeScript (@modelcontextprotocol/sdk)

### Project Init

```bash
mkdir my-mcp-server && cd my-mcp-server
npm init -y
npm install @modelcontextprotocol/sdk zod express cors
npm install -D typescript @types/node @types/express tsx
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src"]
}
```

```json
// package.json (relevant fields)
{
  "type": "module",
  "bin": { "my-mcp-server": "dist/index.js" },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js"
  }
}
```

### Minimal stdio Server

```typescript
#!/usr/bin/env node
// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer(
  { name: "my-mcp-server", version: "1.0.0" },
);

// --- TOOLS ---

server.tool(
  "screenshot",
  "Capture a screenshot of a webpage",
  {
    url: z.string().url().describe("URL to capture"),
    width: z.number().int().min(320).max(3840).default(1280).describe("Viewport width"),
    height: z.number().int().min(240).max(2160).default(720).describe("Viewport height"),
    fullPage: z.boolean().default(false).describe("Capture full page scroll"),
  },
  async ({ url, width, height, fullPage }) => {
    const apiUrl = `https://api.screenshotone.com/take?url=${encodeURIComponent(url)}&viewport_width=${width}&viewport_height=${height}&full_page=${fullPage}&format=png&access_key=${process.env.SCREENSHOT_API_KEY}`;
    const res = await fetch(apiUrl);
    if (!res.ok) {
      return { content: [{ type: "text", text: `Screenshot failed: ${res.status} ${res.statusText}` }] };
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    return {
      content: [
        { type: "image", data: buffer.toString("base64"), mimeType: "image/png" },
        { type: "text", text: `Screenshot of ${url} (${width}x${height}, fullPage=${fullPage})` },
      ],
    };
  }
);

server.tool(
  "dns_lookup",
  "Resolve DNS records for a domain",
  {
    domain: z.string().min(1).describe("Domain to look up"),
    type: z.enum(["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA"]).default("A").describe("Record type"),
  },
  async ({ domain, type }) => {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`);
    const data = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// --- RESOURCES ---

server.resource(
  "server-info",
  "info://server",
  { description: "Server metadata and capabilities" },
  async () => ({
    contents: [{
      uri: "info://server",
      mimeType: "application/json",
      text: JSON.stringify({ name: "my-mcp-server", version: "1.0.0", tools: 2 }),
    }],
  })
);

// --- PROMPTS ---

server.prompt(
  "analyze-domain",
  "Analyze a domain's DNS, SSL, and WHOIS info",
  { domain: z.string().describe("Domain to analyze") },
  ({ domain }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Analyze the domain "${domain}": 1) Look up DNS records (A, MX, NS, TXT). 2) Check SSL certificate. 3) Get WHOIS info. Summarize findings with any security concerns.`,
      },
    }],
  })
);

// --- START ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
```

### SSE Transport (Express)

```typescript
// src/sse-server.ts
import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

const app = express();

// CRITICAL: raw body for webhook signature verification BEFORE json parser
app.use("/webhooks", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(",") || "*" }));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// MCP server factory — one per connection
function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: "my-mcp-server", version: "1.0.0" },
  );

  server.tool(
    "screenshot",
    "Capture a screenshot of a webpage",
    { url: z.string().url(), width: z.number().int().default(1280), height: z.number().int().default(720) },
    async ({ url, width, height }) => {
      const apiRes = await fetch(
        `https://api.screenshotone.com/take?url=${encodeURIComponent(url)}&viewport_width=${width}&viewport_height=${height}&format=png&access_key=${process.env.SCREENSHOT_API_KEY}`
      );
      if (!apiRes.ok) return { content: [{ type: "text" as const, text: `Error: ${apiRes.status}` }] };
      const buf = Buffer.from(await apiRes.arrayBuffer());
      return { content: [{ type: "image" as const, data: buf.toString("base64"), mimeType: "image/png" }] };
    }
  );

  return server;
}

// Track active transports for cleanup
const transports = new Map<string, SSEServerTransport>();

app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  const server = createMcpServer();
  transports.set(transport.sessionId, transport);

  res.on("close", () => {
    transports.delete(transport.sessionId);
  });

  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  await transport.handlePostMessage(req, res);
});

const PORT = parseInt(process.env.PORT || "3100");
app.listen(PORT, () => console.log(`MCP SSE server on http://localhost:${PORT}`));
```

---

## 3. Server Setup — Python (mcp package)

### Project Init

```bash
mkdir my-mcp-server-py && cd my-mcp-server-py
python -m venv .venv && source .venv/bin/activate
pip install mcp httpx pydantic uvicorn
```

### Minimal stdio Server

```python
# server.py
import json
import httpx
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent, ImageContent

server = Server("my-mcp-server")

@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="dns_lookup",
            description="Resolve DNS records for a domain",
            inputSchema={
                "type": "object",
                "properties": {
                    "domain": {"type": "string", "description": "Domain to look up"},
                    "type": {"type": "string", "enum": ["A","AAAA","CNAME","MX","NS","TXT","SOA"], "default": "A"},
                },
                "required": ["domain"],
            },
        ),
        Tool(
            name="whois_lookup",
            description="Get WHOIS registration info for a domain",
            inputSchema={
                "type": "object",
                "properties": {
                    "domain": {"type": "string", "description": "Domain to query"},
                },
                "required": ["domain"],
            },
        ),
        Tool(
            name="ssl_check",
            description="Check SSL certificate details for a domain",
            inputSchema={
                "type": "object",
                "properties": {
                    "domain": {"type": "string", "description": "Domain to check"},
                },
                "required": ["domain"],
            },
        ),
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent | ImageContent]:
    async with httpx.AsyncClient(timeout=30) as client:
        if name == "dns_lookup":
            domain = arguments["domain"]
            record_type = arguments.get("type", "A")
            from urllib.parse import quote
            resp = await client.get(f"https://dns.google/resolve?name={quote(domain)}&type={record_type}")
            return [TextContent(type="text", text=json.dumps(resp.json(), indent=2))]

        elif name == "whois_lookup":
            domain = arguments["domain"]
            from urllib.parse import quote
            resp = await client.get(f"https://whois.freeaitools.casa/api/{quote(domain)}")
            return [TextContent(type="text", text=json.dumps(resp.json(), indent=2))]

        elif name == "ssl_check":
            domain = arguments["domain"]
            resp = await client.get(f"https://ssl-checker.io/api/v1/check/{domain}")
            return [TextContent(type="text", text=json.dumps(resp.json(), indent=2))]

        else:
            return [TextContent(type="text", text=f"Unknown tool: {name}")]

async def main():
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
```

### SSE Transport (Python)

```python
# sse_server.py
import uvicorn
from mcp.server import Server
from mcp.server.sse import SseServerTransport
from starlette.applications import Starlette
from starlette.routing import Route, Mount

server = Server("my-mcp-server")
sse = SseServerTransport("/messages/")

# ... register tools with @server.list_tools() and @server.call_tool() as above ...

async def handle_sse(request):
    async with sse.connect_sse(request.scope, request.receive, request._send) as streams:
        await server.run(streams[0], streams[1], server.create_initialization_options())

routes = [
    Route("/sse", endpoint=handle_sse),
    Mount("/messages/", app=sse.handle_post_message),
]

app = Starlette(routes=routes)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3100)
```

---

## 4. Tool Schema Design (JSON Schema)

Every MCP tool declares its input via JSON Schema. The Zod-based approach in TS auto-generates this, but understand the underlying schema:

```json
{
  "name": "screenshot",
  "description": "Capture a screenshot of a webpage. Returns a PNG image.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "url": {
        "type": "string",
        "format": "uri",
        "description": "Full URL to capture (must include https://)"
      },
      "width": {
        "type": "integer",
        "minimum": 320,
        "maximum": 3840,
        "default": 1280,
        "description": "Viewport width in pixels"
      },
      "height": {
        "type": "integer",
        "minimum": 240,
        "maximum": 2160,
        "default": 720,
        "description": "Viewport height in pixels"
      },
      "fullPage": {
        "type": "boolean",
        "default": false,
        "description": "Whether to capture the full scrollable page"
      },
      "format": {
        "type": "string",
        "enum": ["png", "jpeg", "webp"],
        "default": "png",
        "description": "Output image format"
      }
    },
    "required": ["url"],
    "additionalProperties": false
  }
}
```

### Schema Best Practices

1. **Always include `description`** on every property — LLMs use these to decide parameter values
2. **Use `enum` for constrained choices** — prevents hallucinated values
3. **Set sensible `default` values** — reduces required params, better UX
4. **Use `format` hints** — `"uri"`, `"email"`, `"date-time"` help validation
5. **Mark `additionalProperties: false`** — strict schema prevents junk input
6. **Keep tool count < 20** — too many tools confuse model selection; split into multiple servers if needed

---

## 5. REST API to MCP Pattern

The universal pattern for wrapping any REST API as an MCP tool:

```typescript
// Pattern: REST API → MCP Tool
server.tool(
  "tool_name",                          // snake_case, descriptive
  "One-line description for the LLM",   // The LLM reads this to decide when to use it
  {
    // Zod schema → JSON Schema
    param1: z.string().describe("What this param does"),
    param2: z.number().optional().describe("Optional param with context"),
  },
  async (args) => {
    // 1. Validate / transform input
    const sanitized = sanitizeInput(args.param1);

    // 2. Call upstream API
    const response = await fetch(`https://api.example.com/endpoint?q=${encodeURIComponent(sanitized)}`, {
      headers: { Authorization: `Bearer ${process.env.UPSTREAM_API_KEY}` },
    });

    // 3. Handle errors
    if (!response.ok) {
      return {
        content: [{ type: "text", text: `API error: ${response.status} — ${await response.text()}` }],
        isError: true,
      };
    }

    // 4. Transform response for LLM consumption
    const data = await response.json();
    const summary = formatForLLM(data); // Trim noise, keep signal

    // 5. Return structured content
    return {
      content: [{ type: "text", text: summary }],
    };
  }
);
```

### Complete API Wrapper Examples

```typescript
// --- OCR Tool (wrapping OCR.space API) ---
server.tool(
  "ocr_extract",
  "Extract text from an image using OCR",
  {
    imageUrl: z.string().url().describe("URL of the image to process"),
    language: z.enum(["eng", "fra", "deu", "spa", "por", "jpn", "kor", "chi_sim"]).default("eng"),
  },
  async ({ imageUrl, language }) => {
    const form = new URLSearchParams({
      url: imageUrl,
      language,
      isOverlayRequired: "false",
      OCREngine: "2",
    });
    const res = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { apikey: process.env.OCR_API_KEY! },
      body: form,
    });
    const data = await res.json();
    if (data.IsErroredOnProcessing) {
      return { content: [{ type: "text", text: `OCR error: ${data.ErrorMessage?.join(", ")}` }], isError: true };
    }
    const text = data.ParsedResults?.map((r: any) => r.ParsedText).join("\n") || "No text found";
    return { content: [{ type: "text", text }] };
  }
);

// --- Blockchain: EVM Balance Check ---
server.tool(
  "evm_balance",
  "Get native token balance for an address on any EVM chain",
  {
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe("EVM wallet address"),
    chain: z.enum(["ethereum", "celo", "base", "polygon", "arbitrum", "optimism"]).default("celo"),
  },
  async ({ address, chain }) => {
    const rpcUrls: Record<string, string> = {
      ethereum: "https://eth.llamarpc.com",
      celo: "https://forno.celo.org",
      base: "https://mainnet.base.org",
      polygon: "https://polygon-rpc.com",
      arbitrum: "https://arb1.arbitrum.io/rpc",
      optimism: "https://mainnet.optimism.io",
    };
    const res = await fetch(rpcUrls[chain], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] }),
    });
    const data = await res.json();
    const wei = BigInt(data.result);
    // Safe conversion: divide in BigInt domain first to avoid Number precision loss
    const ether = (Number(wei / 10n ** 12n) / 1_000_000).toFixed(6);
    return { content: [{ type: "text", text: `${address} on ${chain}: ${ether} native tokens (${wei} wei)` }] };
  }
);

// --- WHOIS Lookup ---
server.tool(
  "whois_lookup",
  "Get WHOIS registration information for a domain",
  {
    domain: z.string().min(1).describe("Domain name (e.g., example.com)"),
  },
  async ({ domain }) => {
    const res = await fetch(`https://whois.freeaitools.casa/api/${encodeURIComponent(domain)}`);
    if (!res.ok) return { content: [{ type: "text", text: `WHOIS lookup failed: ${res.status}` }], isError: true };
    const data = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// --- SSL Certificate Check ---
server.tool(
  "ssl_check",
  "Check SSL/TLS certificate details for a domain",
  {
    domain: z.string().min(1).describe("Domain to check (without https://)"),
  },
  async ({ domain }) => {
    const tls = await import("tls");
    return new Promise((resolve) => {
      const socket = tls.connect(443, domain, { servername: domain }, () => {
        const cert = socket.getPeerCertificate();
        socket.destroy();
        const info = {
          subject: cert.subject,
          issuer: cert.issuer,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          serialNumber: cert.serialNumber,
          fingerprint256: cert.fingerprint256,
          daysRemaining: Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86400000),
        };
        resolve({ content: [{ type: "text" as const, text: JSON.stringify(info, null, 2) }] });
      });
      socket.on("error", (err) => {
        resolve({ content: [{ type: "text" as const, text: `SSL check failed: ${err.message}` }], isError: true });
      });
      socket.setTimeout(10000, () => {
        socket.destroy();
        resolve({ content: [{ type: "text" as const, text: "SSL check timed out" }], isError: true });
      });
    });
  }
);
```

---

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
    entry = { count: 0, resetAt: now + 60_000, daily: 0, dailyResetAt: entry?.dailyResetAt ?? now + 86_400_000 };
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

// --- x402 Payment Verification ---
async function verifyX402Payment(paymentHeader: string, price: string): Promise<boolean> {
  try {
    const res = await fetch(process.env.X402_FACILITATOR_URL || "https://x402.org/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payment: paymentHeader,
        expectedAmount: price,
        expectedToken: process.env.X402_TOKEN || "USDC",
        expectedChain: process.env.X402_CHAIN || "base",
        expectedRecipient: process.env.X402_RECIPIENT_ADDRESS,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// --- Main auth middleware ---
export interface AuthResult {
  tier: "free" | "pro" | "x402";
  userId?: string;
}

export async function authenticate(req: express.Request): Promise<{ auth: AuthResult } | { error: string; status: number; headers?: Record<string, string> }> {
  // 1. Check for x402 payment header
  const paymentHeader = req.headers["x-payment"] as string;
  if (paymentHeader) {
    const valid = await verifyX402Payment(paymentHeader, "0.005");
    if (valid) return { auth: { tier: "x402" } };
    return { error: "Invalid payment", status: 402, headers: {
      // x402 spec header is PAYMENT-REQUIRED (not X-Payment-Required)
      "PAYMENT-REQUIRED": JSON.stringify({
        amount: "0.005",
        token: process.env.X402_TOKEN || "USDC",
        chain: process.env.X402_CHAIN || "base",
        recipient: process.env.X402_RECIPIENT_ADDRESS,
        facilitator: process.env.X402_FACILITATOR_URL || "https://x402.org",
      }),
    }};
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

### Applying Auth to SSE Server

```typescript
// src/sse-server-authed.ts
import express from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { authenticate, loadApiKeysFromEnv, type AuthResult } from "./auth/middleware.js";

const app = express();

// MUST come before express.json() for webhook signature verification
app.use("/webhooks/stripe", express.raw({ type: "application/json" }));
app.use(express.json());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "X-API-Key", "Authorization", "X-Payment"],
}));

loadApiKeysFromEnv();

// Health + admin endpoints
app.get("/health", (_req, res) => res.json({ status: "ok", uptime: process.uptime() }));

app.get("/admin/stats", (req, res) => {
  const adminKey = req.headers["x-admin-key"];
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) return res.status(401).json({ error: "Unauthorized" });
  res.json({
    activeSessions: transports.size,
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

// --- MCP SSE with auth ---
const transports = new Map<string, SSEServerTransport>();

app.get("/sse", async (req, res) => {
  const authResult = await authenticate(req);
  if ("error" in authResult) {
    if (authResult.headers) {
      for (const [k, v] of Object.entries(authResult.headers)) res.setHeader(k, v);
    }
    return res.status(authResult.status).json({ error: authResult.error });
  }

  const { auth } = authResult;
  console.log(`New SSE connection: tier=${auth.tier}, userId=${auth.userId || "anonymous"}`);

  const transport = new SSEServerTransport("/messages", res);
  const server = createMcpServer(auth);
  transports.set(transport.sessionId, transport);
  res.on("close", () => transports.delete(transport.sessionId));
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const transport = transports.get(sessionId);
  if (!transport) return res.status(404).json({ error: "Session not found" });
  await transport.handlePostMessage(req, res);
});

function createMcpServer(_auth: AuthResult): McpServer {
  const server = new McpServer({ name: "my-mcp-server", version: "1.0.0" });
  // Register tools here — all tiers get all tools, rate limiting handles access
  return server;
}

const PORT = parseInt(process.env.PORT || "3100");
app.listen(PORT, () => console.log(`MCP server running on :${PORT}`));
```

---

## 7. Monetization Strategy

### Revenue Model

```
┌─────────────────────────────────────────────────────────┐
│                  Monetization Funnel                     │
├───────────┬──────────────┬──────────────────────────────┤
│ Free Tier │ $9/mo Pro    │ x402 Pay-per-use             │
│ Hook      │ Retain       │ Scale                         │
│           │              │                               │
│ 100/day   │ 10k/day      │ Unlimited                    │
│ IP limit  │ API key      │ USDC/USDT on Base or Celo    │
│ $0        │ Stripe sub   │ $0.005 per tool call          │
└───────────┴──────────────┴──────────────────────────────┘
```

### x402 Payment Flow

x402 is an HTTP-native payment protocol. When a client can't authenticate via API key:

```
1. Client calls tool → server returns 402 Payment Required
2. Response headers include payment details:
   X-Payment-Required: {"amount":"0.005","token":"USDC","chain":"base","recipient":"0x..."}
3. Client constructs on-chain payment (or uses x402 SDK)
4. Client retries with X-Payment header containing payment proof
5. Server verifies payment via facilitator → processes request
```

### Environment Config for x402

```bash
# .env
X402_RECIPIENT_ADDRESS=0xYourWalletAddress
X402_TOKEN=USDC
X402_CHAIN=base  # or "celo"
X402_FACILITATOR_URL=https://x402.org/verify

# For Celo: use cUSD (0x765DE816845861e75A25fCA122bb6898B8B1282a)
# For Base: use USDC (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
```

### Stripe Subscription Setup

```typescript
// scripts/create-stripe-product.ts — run once to set up billing
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
});

async function createProduct() {
  const product = await stripe.products.create({
    name: "MCP Server Pro",
    description: "100 req/min, 10k/day API access to all MCP tools",
  });

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 900, // $9.00
    currency: "usd",
    recurring: { interval: "month" },
  });

  const link = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
    after_completion: {
      type: "redirect",
      redirect: { url: "https://your-server.com/welcome?session_id={CHECKOUT_SESSION_ID}" },
    },
  });

  console.log("Checkout link:", link.url);
  console.log("Price ID:", price.id);
}

createProduct();
```

---

## 8. Express.js Architecture

### Full Production Server Structure

```
src/
├── index.ts              # Entry point (stdio)
├── sse-server.ts         # SSE HTTP server
├── auth/
│   ├── middleware.ts      # Three-tier auth
│   ├── rate-limiter.ts   # Rate limiting logic
│   └── x402.ts           # x402 payment verification
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

// 3. CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") || "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "X-API-Key", "Authorization", "X-Payment"],
  credentials: true,
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

// 9. MCP endpoints (three-tier auth)
// app.get("/sse", sseHandler);
// app.post("/messages", messagesHandler);
```

---

## 9. Security

### Input Validation

```typescript
import { z } from "zod";

// Validate ALL tool inputs strictly
const urlSchema = z.string().url().refine(
  (url) => {
    const parsed = new URL(url);
    // Block internal/private IPs (SSRF prevention)
    const hostname = parsed.hostname;
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0") return false;
    if (hostname.startsWith("10.") || hostname.startsWith("192.168.")) return false;
    // 172.16.0.0/12 = 172.16.x.x–172.31.x.x (not all of 172.x.x.x)
    const m172 = hostname.match(/^172\.(\d+)\./);
    if (m172 && +m172[1] >= 16 && +m172[1] <= 31) return false;
    if (hostname.endsWith(".internal") || hostname.endsWith(".local")) return false;
    if (parsed.protocol !== "https:") return false;
    return true;
  },
  { message: "URL must be a public HTTPS URL" }
);

const domainSchema = z.string()
  .min(1).max(253)
  .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/, "Invalid domain");

const evmAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address");
```

### Constant-Time Comparison

```typescript
import crypto from "crypto";

// ALWAYS use this for secret comparison — never use === for API keys/tokens
function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
```

### Webhook Signature Verification

```typescript
// Generic HMAC webhook verification
function verifyWebhookSignature(
  payload: Buffer | string,
  signature: string,
  secret: string,
  algorithm: "sha256" | "sha1" = "sha256",
  prefix: string = ""
): boolean {
  const expected = prefix + crypto.createHmac(algorithm, secret).update(payload).digest("hex");
  return secureCompare(signature, expected);
}

// Stripe: compound timestamp signature
// For Stripe: use stripe.webhooks.constructEvent() instead of manual HMAC.
// It handles timestamp tolerance and proper signature verification.
// Manual example kept for non-Stripe webhooks only:
function verifyStripeSignature(payload: Buffer, sigHeader: string, secret: string): boolean {
  const parts: Record<string, string> = {};
  sigHeader.split(",").forEach(p => { const [k, v] = p.split("="); parts[k] = v; });
  if (!parts.t || !parts.v1) return false;
  const timestamp = parseInt(parts.t, 10);
  if (isNaN(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  // Feed payload as Buffer directly — template literal would coerce Buffer to string
  const expected = crypto.createHmac("sha256", secret)
    .update(`${parts.t}.`)
    .update(payload)
    .digest("hex");
  return secureCompare(parts.v1, expected);
}

// GitHub: sha256 HMAC
function verifyGitHubSignature(payload: Buffer, sigHeader: string, secret: string): boolean {
  return verifyWebhookSignature(payload, sigHeader, secret, "sha256", "sha256=");
}
```

### Security Headers

```typescript
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-Request-Id", crypto.randomUUID());
  next();
});
```

---

## 10. Monitoring & Logging

```typescript
// src/monitoring/logger.ts

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  tier: "free" | "pro" | "x402";
  tool: string;
  durationMs: number;
  userId?: string;
  ip?: string;
  error?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private tierCounts = { free: 0, pro: 0, x402: 0 };
  private toolCounts = new Map<string, number>();

  log(entry: Omit<LogEntry, "timestamp">) {
    const full: LogEntry = { ...entry, timestamp: new Date().toISOString() };
    this.logs.push(full);
    this.tierCounts[entry.tier]++;
    this.toolCounts.set(entry.tool, (this.toolCounts.get(entry.tool) || 0) + 1);

    // Structured JSON logging for log aggregation (CloudWatch, Datadog, etc.)
    console.log(JSON.stringify(full));

    // Keep last 10k entries in memory
    if (this.logs.length > 10_000) this.logs = this.logs.slice(-5_000);
  }

  getStats() {
    return {
      totalRequests: this.logs.length,
      byTier: { ...this.tierCounts },
      byTool: Object.fromEntries(this.toolCounts),
      recentErrors: this.logs.filter(l => l.level === "error").slice(-10),
      avgDurationMs: this.logs.length
        ? Math.round(this.logs.reduce((sum, l) => sum + l.durationMs, 0) / this.logs.length)
        : 0,
    };
  }
}

export const logger = new Logger();

// Usage wrapper for instrumented tool calls
export async function instrumentedToolCall(
  toolName: string,
  tier: "free" | "pro" | "x402",
  userId: string | undefined,
  fn: () => Promise<any>
) {
  const start = Date.now();
  try {
    const result = await fn();
    logger.log({ level: "info", tier, tool: toolName, durationMs: Date.now() - start, userId });
    return result;
  } catch (err: any) {
    logger.log({ level: "error", tier, tool: toolName, durationMs: Date.now() - start, userId, error: err.message });
    throw err;
  }
}
```

---

## 11. Deployment

### systemd + cloudflared Tunnel

```bash
# 1. Build
cd /opt/my-mcp-server
npm ci && npm run build

# 2. systemd service
sudo tee /etc/systemd/system/mcp-server.service << 'EOF'
[Unit]
Description=MCP Server
After=network.target

[Service]
Type=simple
User=mcp
WorkingDirectory=/opt/my-mcp-server
ExecStart=/usr/bin/node dist/sse-server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3100
EnvironmentFile=/opt/my-mcp-server/.env

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/my-mcp-server/logs
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now mcp-server

# 3. cloudflared tunnel
cloudflared tunnel create mcp-server
cloudflared tunnel route dns mcp-server mcp.yourdomain.com

# cloudflared config
sudo tee /etc/cloudflared/config.yml << 'EOF'
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: mcp.yourdomain.com
    service: http://localhost:3100
  - service: http_status:404
EOF

sudo tee /etc/systemd/system/cloudflared-tunnel.service << 'EOF'
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/cloudflared tunnel --config /etc/cloudflared/config.yml run
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now cloudflared-tunnel
```

### Docker

```dockerfile
# Dockerfile
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ src/
RUN npm run build

FROM node:22-slim
WORKDIR /app
RUN addgroup --system mcp && adduser --system --ingroup mcp mcp
COPY --from=builder /app/dist dist/
COPY --from=builder /app/node_modules node_modules/
COPY package.json ./
USER mcp
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3100/health || exit 1
CMD ["node", "dist/sse-server.js"]
```

```yaml
# docker-compose.yml
services:
  mcp-server:
    build: .
    ports:
      - "3100:3100"
    env_file: .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3100/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.0"
```

### Vercel Edge Proxy Pattern

For SSE servers, Vercel can act as an edge auth proxy:

```typescript
// vercel-proxy/api/sse.ts
// NOTE: Vercel doesn't support long-lived SSE natively.
// Use Vercel as an auth proxy that redirects to your actual SSE server.

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = req.headers["x-api-key"] as string;
  if (!apiKey) {
    return res.status(401).json({ error: "API key required" });
  }

  // Verify key against your DB (Vercel KV, Upstash Redis, etc.)
  const valid = await verifyKeyAtEdge(apiKey);
  if (!valid) return res.status(401).json({ error: "Invalid API key" });

  // Redirect to actual SSE server with a short-lived token
  const token = generateShortLivedToken(apiKey);
  res.redirect(307, `https://mcp.yourdomain.com/sse?token=${token}`);
}
```

---

## 12. Testing with Claude Desktop & Claude Code

### Claude Desktop Configuration

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)
// %APPDATA%\Claude\claude_desktop_config.json (Windows)
{
  "mcpServers": {
    "my-mcp-server-local": {
      "command": "node",
      "args": ["/path/to/my-mcp-server/dist/index.js"],
      "env": {
        "SCREENSHOT_API_KEY": "your-key",
        "OCR_API_KEY": "your-key"
      }
    },
    "my-mcp-server-remote": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.yourdomain.com/sse"],
      "env": {}
    }
  }
}
```

### Claude Code Configuration

```json
// .mcp.json in project root
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "node",
      "args": ["./dist/index.js"],
      "env": {
        "SCREENSHOT_API_KEY": "your-key"
      }
    }
  }
}
```

### Testing Checklist

```bash
# 1. Test stdio server directly
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node dist/index.js

# 2. Test SSE server
# Terminal 1: start server
node dist/sse-server.js

# Terminal 2: connect SSE
curl -N http://localhost:3100/sse
# Note the sessionId from the endpoint event

# Terminal 3: send request
curl -X POST "http://localhost:3100/messages?sessionId=SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# 3. Test rate limiting
for i in $(seq 1 15); do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/sse
done
# Should see 429 after 10 requests

# 4. Test with API key
curl -N -H "X-API-Key: your-test-key" http://localhost:3100/sse

# 5. Test health endpoint
curl http://localhost:3100/health

# 6. Use MCP Inspector for interactive testing
npx @modelcontextprotocol/inspector node dist/index.js
```

---

## 13. Listing on mcpservers.org

### Submission Requirements

1. **Working server** — must be installable and functional
2. **README.md** with clear setup instructions
3. **Tool documentation** — describe every tool, its inputs, and expected outputs
4. **npm package** (for stdio servers) or **public endpoint** (for SSE servers)

### README Template

````markdown
# My MCP Server

One-line description of what this server does.

## Tools

| Tool | Description | Input |
|------|-------------|-------|
| `screenshot` | Capture webpage screenshot | `url`, `width?`, `height?` |
| `dns_lookup` | Resolve DNS records | `domain`, `type?` |
| `whois_lookup` | WHOIS registration info | `domain` |
| `ssl_check` | SSL certificate details | `domain` |

## Quick Start

### Claude Desktop
```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "my-mcp-server"],
      "env": { "API_KEY": "your-key" }
    }
  }
}
```

### Remote (SSE)
Endpoint: `https://mcp.yourdomain.com/sse`

### Pricing
- Free: 10 req/min, 100/day
- Pro ($9/mo): 100 req/min, 10k/day
- Pay-per-use: $0.005/call via x402
````

### Publishing to npm

```json
// package.json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for screenshots, DNS, WHOIS, SSL, and more",
  "bin": { "my-mcp-server": "dist/index.js" },
  "files": ["dist"],
  "keywords": ["mcp", "model-context-protocol", "ai-tools"],
  "license": "MIT"
}
```

```bash
npm run build
npm publish
```

Submit to https://mcpservers.org with your npm package name, category, and tool list.

---

## 14. Environment Variables Reference

```bash
# .env.example

# Server
PORT=3100
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com

# Auth
API_KEYS=key1:user1,key2:user2
ADMIN_KEY=your-admin-secret

# x402 Payments
X402_RECIPIENT_ADDRESS=0xYourWalletAddress
X402_TOKEN=USDC
X402_CHAIN=base
X402_FACILITATOR_URL=https://x402.org/verify

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CHECKOUT_LINK=https://buy.stripe.com/...

# Upstream API Keys
SCREENSHOT_API_KEY=...
OCR_API_KEY=...
```

---

## 15. Common Patterns & Gotchas

### Pattern: Tool That Returns Multiple Content Types

```typescript
server.tool("analyze_page", "Analyze a webpage — screenshot + extracted text", {
  url: z.string().url(),
}, async ({ url }) => {
  const [screenshot, text] = await Promise.all([
    captureScreenshot(url),
    extractPageText(url),
  ]);
  return {
    content: [
      { type: "image", data: screenshot, mimeType: "image/png" },
      { type: "text", text: `## Page Analysis\n\n${text}` },
    ],
  };
});
```

### Pattern: Long-Running Tool with Progress

```typescript
server.tool("bulk_dns", "Look up DNS for multiple domains", {
  domains: z.array(z.string()).max(50),
}, async ({ domains }) => {
  const results: string[] = [];
  for (let i = 0; i < domains.length; i++) {
    const data = await dnsLookup(domains[i]);
    results.push(`${domains[i]}: ${JSON.stringify(data)}`);
  }
  return { content: [{ type: "text", text: results.join("\n\n") }] };
});
```

### Gotcha: SSE Connection Lifecycle

```typescript
// SSE connections can die silently. Always handle cleanup:
app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  const server = createMcpServer();
  transports.set(transport.sessionId, transport);

  // Heartbeat to detect dead connections
  const heartbeat = setInterval(() => {
    try { res.write(":ping\n\n"); } catch { clearInterval(heartbeat); }
  }, 30_000);

  res.on("close", () => {
    clearInterval(heartbeat);
    transports.delete(transport.sessionId);
    console.log(`Session ${transport.sessionId} disconnected`);
  });

  await server.connect(transport);
});
```

### Gotcha: Don't Leak Upstream API Keys in Error Messages

```typescript
// BAD
return { content: [{ type: "text", text: `Error calling https://api.example.com?key=SECRET123` }] };

// GOOD
return { content: [{ type: "text", text: `Screenshot API returned error: ${response.status} ${response.statusText}` }], isError: true };
```

### Gotcha: stdio Servers Must Not Write to stdout

```typescript
// BAD — breaks JSON-RPC framing
console.log("Debug info");

// GOOD — use stderr for debug output
console.error("Debug info");
```

---

## 16. Complete Production Checklist

Before shipping your MCP server:

- [ ] **All tool inputs validated** with Zod schemas (SSRF protection on URLs)
- [ ] **Error handling** — every tool returns graceful errors, never throws unhandled
- [ ] **Rate limiting** — free tier IP limits, pro tier key limits
- [ ] **Auth** — constant-time key comparison, x402 payment verification
- [ ] **Webhook signature verification** — Stripe, GitHub, etc.
- [ ] **Raw body middleware** before `express.json()` for webhook routes
- [ ] **CORS configured** — specific origins in production, not `*`
- [ ] **Health endpoint** at `/health` for monitoring
- [ ] **Structured logging** — JSON logs with tier, tool, duration, errors
- [ ] **No secrets in error messages** — upstream API keys never exposed
- [ ] **stdio server uses stderr** for debug output, not stdout
- [ ] **SSE heartbeat** — detect dead connections
- [ ] **Graceful shutdown** — clean up SSE connections on SIGTERM
- [ ] **Docker image** — non-root user, health check, resource limits
- [ ] **systemd service** — auto-restart, security hardening directives
- [ ] **cloudflared tunnel** — HTTPS without port forwarding
- [ ] **Tested with Claude Desktop** — stdio transport works
- [ ] **Tested with MCP Inspector** — all tools respond correctly
- [ ] **Published to npm** — `npx my-server` works
- [ ] **Listed on mcpservers.org** — discoverable by the community
- [ ] **README** — clear setup, tool docs, pricing info

---

## Appendix A: Graceful Shutdown

```typescript
function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  for (const [id, transport] of transports) {
    try { (transport as any).close?.(); } catch {}
    transports.delete(id);
  }

  setTimeout(() => {
    console.log("Shutdown complete");
    process.exit(0);
  }, 5000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
```

## Appendix B: Redis Rate Limiter (Production)

```typescript
import { Redis } from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

async function checkRateLimitRedis(
  key: string,
  perMinute: number,
  perDay: number
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const minuteKey = `rate:min:${key}`;
  const dayKey = `rate:day:${key}`;

  // Use multi/exec to atomically INCR + set TTL on first creation
  const minutePipeline = redis.multi().incr(minuteKey).ttl(minuteKey);
  const dayPipeline = redis.multi().incr(dayKey).ttl(dayKey);
  const [[minuteCount, minuteTtl], [dayCount, dayTtl]] = await Promise.all([
    minutePipeline.exec().then(r => [r![0][1] as number, r![1][1] as number]),
    dayPipeline.exec().then(r => [r![0][1] as number, r![1][1] as number]),
  ]);

  // Set TTL only if missing (-1 means no expiry, -2 means key gone — guard both)
  if (minuteTtl < 0) await redis.expire(minuteKey, 60);
  if (dayTtl < 0) await redis.expire(dayKey, 86400);

  if (minuteCount >= perMinute) {
    const ttl = await redis.ttl(minuteKey);
    return { allowed: false, retryAfter: ttl };
  }
  if (dayCount >= perDay) {
    const ttl = await redis.ttl(dayKey);
    return { allowed: false, retryAfter: ttl };
  }

  return { allowed: true };
}
```

## Appendix C: Tool Registration Helper

```typescript
// DRY helper for registering tools with consistent error handling and logging
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z, ZodRawShape } from "zod";
import { logger } from "./monitoring/logger.js";
import { AuthResult } from "./auth/middleware.js";

type ToolHandler<T> = (args: T) => Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }>;

export function registerTool<T extends ZodRawShape>(
  server: McpServer,
  name: string,
  description: string,
  schema: T,
  handler: ToolHandler<z.objectOutputType<z.ZodObject<T>, z.ZodTypeAny>>,
  auth?: AuthResult
) {
  server.tool(name, description, schema, async (args) => {
    const start = Date.now();
    try {
      const result = await handler(args as any);
      logger.log({
        level: "info",
        tier: auth?.tier || "free",
        tool: name,
        durationMs: Date.now() - start,
        userId: auth?.userId,
      });
      return result;
    } catch (err: any) {
      logger.log({
        level: "error",
        tier: auth?.tier || "free",
        tool: name,
        durationMs: Date.now() - start,
        userId: auth?.userId,
        error: err.message,
      });
      return {
        content: [{ type: "text" as const, text: `Error in ${name}: ${err.message}` }],
        isError: true,
      };
    }
  });
}
```
