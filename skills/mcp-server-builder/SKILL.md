---
name: mcp-server-builder
description: "Build production MCP servers: tool/resource/prompt schemas (Zod/Pydantic), Streamable HTTP + stdio (spec 2025-11-25, SSE legacy), OAuth 2.1 bearer auth, FastMCP (Python) and @modelcontextprotocol/sdk (TS), Stripe + x402 v2 monetization, deploy. Use when shipping, monetizing, or deploying an MCP server or wrapping a REST API as tools."
---

# MCP Server Builder — Production Skill

> **Pick the transport first.** **stdio** for local-process servers (Claude Desktop, CLI). **Streamable HTTP** for everything remote/shared/monetized — `StreamableHTTPServerTransport` in TS (`@modelcontextprotocol/sdk` v1.x), `FastMCP` in Python. The two standard transports are stdio and Streamable HTTP. The old **HTTP+SSE** transport (`/sse` + `/messages`) is **legacy/deprecated** (replaced in spec 2025-03-26, current spec **2025-11-25**); ship it only as a backward-compat appendix for old clients (see §2c).

> Build production-grade Model Context Protocol servers that wrap any REST API into AI-callable tools, with three-tier auth, monetization, and battle-tested deployment.

> **Related skills:** for the consuming side (connecting to / calling MCP servers) see `mcp-client`; for general agent architecture see `ai-agent-building`; for REST contract/versioning design see `api-design`; for the Stripe billing details behind §7 see `stripe-billing`; for the SSRF/secret-handling depth in §9 see `security-hardening`.

## When to Use

- User wants to build an MCP server (stdio or Streamable HTTP)
- User wants to wrap a REST API as MCP tools
- User asks about MCP architecture, tool/resource/prompt schemas, or transports
- User wants to monetize an MCP server (free tier, API keys, x402 micropayments, Stripe subscriptions)
- User wants OAuth/bearer auth on a remote MCP server, or to deploy/list one
- User mentions `@modelcontextprotocol/sdk`, `mcp` Python package, FastMCP, or MCP in general

---

## 1. MCP Architecture Overview

MCP (Model Context Protocol) defines three primitives that a server exposes to AI clients:

| Primitive    | Purpose                              | Example                          |
|-------------|---------------------------------------|----------------------------------|
| **Tools**    | Actions the model can invoke          | `screenshot`, `dns_lookup`       |
| **Resources**| Read-only data the model can access   | `config://settings`, `db://users`|
| **Prompts**  | Reusable prompt templates             | `summarize`, `code_review`       |

### Transports

**stdio** — Server runs as a child process. Client spawns it, communicates over stdin/stdout. One client per process; no auth layer (trust is the local OS).
Best for: local tools, Claude Desktop, Claude Code, CLI integrations.

**Streamable HTTP** *(recommended for all remote servers; MCP spec 2025-03-26, refined 2025-11-25)* — A **single endpoint** (conventionally `/mcp`) that serves **POST** (client→server JSON-RPC), **GET** (open a server→client SSE stream for notifications/resumability), and **DELETE** (terminate a session). It is *not* "just request/response": per request the server replies either `application/json` (one-shot) **or** `text/event-stream` (streamed result + server notifications); responses/notifications that aren't requests get `202 Accepted` with no body. Supports optional **sessions** (`Mcp-Session-Id` header), **resumability** (`Last-Event-ID` + an event store), and a **JSON-only mode** (`enableJsonResponse` / `json_response=True`) for stateless API-style scaling.
Best for: remote servers, shared services, monetized APIs, multi-node deployments.

**HTTP+SSE** *(legacy — backward compat only)* — Two endpoints: `GET /sse` to open the stream, `POST /messages?sessionId=…` to send. Deprecated in spec 2025-03-26 and superseded by Streamable HTTP; the SDK still ships `SSEServerTransport` so you can host `/sse` alongside `/mcp` for clients that predate Streamable HTTP. Do not build new servers SSE-first — see the dual-transport appendix in §2c.

### Message Flow (Streamable HTTP — current)

```
Client                          Server   (single endpoint, e.g. POST/GET/DELETE /mcp)
  |--- POST /mcp (initialize) ---->|  server may return Mcp-Session-Id response header
  |<-- 200 + Mcp-Session-Id -------|  (Content-Type: application/json)
  |                                |
  |--- POST /mcp (tools/call) ---->|  with Mcp-Session-Id header
  |<-- 200 application/json -------|  one-shot result …
  |   …or text/event-stream -------|  …or streamed result + server notifications
  |                                |
  |--- GET /mcp (SSE stream) ----->|  optional: server→client notifications, resumable
  |--- DELETE /mcp --------------->|  end the session
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
// Current SDK (v1.x) API: server.registerTool(name, config, handler).
// config carries { title, description, inputSchema, outputSchema?, annotations? }.
// (The older server.tool(name, desc, shape, handler) still works but is marked
//  @deprecated in the SDK; registerTool is the documented API: it adds a UI `title`,
//  optional `outputSchema`, and lets handlers return `structuredContent`.)

server.registerTool(
  "screenshot",
  {
    title: "Webpage Screenshot",
    description: "Capture a screenshot of a webpage",
    inputSchema: {
      url: z.string().url().describe("URL to capture"),
      width: z.number().int().min(320).max(3840).default(1280).describe("Viewport width"),
      height: z.number().int().min(240).max(2160).default(720).describe("Viewport height"),
      fullPage: z.boolean().default(false).describe("Capture full page scroll"),
    },
  },
  async ({ url, width, height, fullPage }) => {
    const apiUrl = `https://api.screenshotone.com/take?url=${encodeURIComponent(url)}&viewport_width=${width}&viewport_height=${height}&full_page=${fullPage}&format=png&access_key=${process.env.SCREENSHOT_API_KEY}`;
    const res = await fetch(apiUrl);
    if (!res.ok) {
      return { content: [{ type: "text", text: `Screenshot failed: ${res.status} ${res.statusText}` }], isError: true };
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

server.registerTool(
  "dns_lookup",
  {
    title: "DNS Lookup",
    description: "Resolve DNS records for a domain",
    inputSchema: {
      domain: z.string().min(1).describe("Domain to look up"),
      type: z.enum(["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA"]).default("A").describe("Record type"),
    },
    // outputSchema makes the result machine-readable; pair it with `structuredContent` below.
    outputSchema: {
      records: z.array(z.object({ name: z.string(), type: z.number(), TTL: z.number(), data: z.string() })).default([]),
      status: z.number(),
    },
  },
  async ({ domain, type }) => {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${type}`);
    const data = await res.json();
    const structuredContent = { records: data.Answer ?? [], status: data.Status ?? 0 };
    // When you declare outputSchema, ALSO return a text block (for clients that ignore
    // structuredContent) plus the structuredContent itself (for clients that parse it).
    return {
      content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
      structuredContent,
    };
  }
);

// --- RESOURCES ---

server.registerResource(
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

server.registerPrompt(
  "analyze-domain",
  {
    description: "Analyze a domain's DNS, SSL, and WHOIS info",
    argsSchema: { domain: z.string().describe("Domain to analyze") },
  },
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

### 2a. Streamable HTTP — Stateful (sessions + resumability) — RECOMMENDED

This is the default remote transport. One endpoint `/mcp` handles POST (requests), GET (server→client SSE stream), and DELETE (session teardown). Sessions are keyed by the `Mcp-Session-Id` response header the server returns on `initialize`.

```typescript
// src/http-server.ts
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

const app = express();

// CRITICAL: raw body for webhook signature verification BEFORE the JSON parser (see §8).
app.use("/webhooks", express.raw({ type: "application/json" }));
app.use(express.json());

// CORS: fail closed. NEVER "*" on an MCP/auth endpoint. Browsers also must be allowed
// to READ the session header, so expose it. (Non-browser MCP clients ignore CORS.)
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: allowedOrigins.length ? allowedOrigins : false, // false = deny cross-origin in browsers
  methods: ["GET", "POST", "DELETE"],
  allowedHeaders: ["Content-Type", "Mcp-Session-Id", "Last-Event-ID", "Authorization"],
  exposedHeaders: ["Mcp-Session-Id"],
}));

app.get("/health", (_req, res) =>
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date().toISOString() }));

// One McpServer per session. Register tools/resources/prompts here.
function createMcpServer(): McpServer {
  const server = new McpServer({ name: "my-mcp-server", version: "1.0.0" });
  server.registerTool(
    "screenshot",
    { title: "Webpage Screenshot", description: "Capture a screenshot of a webpage",
      inputSchema: { url: z.string().url(), width: z.number().int().default(1280), height: z.number().int().default(720) } },
    async ({ url, width, height }) => {
      const apiRes = await fetch(
        `https://api.screenshotone.com/take?url=${encodeURIComponent(url)}&viewport_width=${width}&viewport_height=${height}&format=png&access_key=${process.env.SCREENSHOT_API_KEY}`
      );
      if (!apiRes.ok) return { content: [{ type: "text" as const, text: `Error: ${apiRes.status}` }], isError: true };
      const buf = Buffer.from(await apiRes.arrayBuffer());
      return { content: [{ type: "image" as const, data: buf.toString("base64"), mimeType: "image/png" }] };
    }
  );
  return server;
}

// Transports keyed by session id. In multi-node deploys, either pin sessions with a
// sticky load balancer or run stateless (§2b) — this in-memory map is per-process.
const transports: Record<string, StreamableHTTPServerTransport> = {};

// POST /mcp — every JSON-RPC request. Creates a session on `initialize`, reuses it after.
app.post("/mcp", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  try {
    let transport: StreamableHTTPServerTransport;
    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];                 // reuse existing session
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),           // stateful: hand out a session id
        // enableJsonResponse: true,                       // uncomment for JSON-only (no SSE) replies
        // eventStore: new InMemoryEventStore(),           // enable Last-Event-ID resumability
        onsessioninitialized: (sid) => { transports[sid] = transport; }, // store AFTER init (no races)
      });
      transport.onclose = () => {
        const sid = transport.sessionId;
        if (sid) delete transports[sid];
      };
      // Connect BEFORE handling so responses flow back over the same transport.
      await createMcpServer().connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    } else {
      res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Bad Request: no valid session id" }, id: null });
      return;
    }
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP request error:", err);
    if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
  }
});

// GET /mcp — open the server→client SSE notification stream (supports Last-Event-ID resume).
// DELETE /mcp — terminate the session. Both just hand off to the existing transport.
const sessionRequest = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  if (!sessionId || !transports[sessionId]) return res.status(400).send("Invalid or missing session id");
  await transports[sessionId].handleRequest(req, res);
};
app.get("/mcp", sessionRequest);
app.delete("/mcp", sessionRequest);

const PORT = parseInt(process.env.PORT || "3100");
app.listen(PORT, () => console.log(`MCP Streamable HTTP server on http://localhost:${PORT}/mcp`));

// Graceful shutdown: close every live session (see Appendix A for the full handler).
process.on("SIGTERM", async () => {
  for (const sid of Object.keys(transports)) { try { await transports[sid].close(); } catch {} }
  process.exit(0);
});
```

### 2b. Streamable HTTP — Stateless (horizontal scale, JSON-only)

For pure API proxies / serverless / multi-node behind a round-robin LB, run stateless: a fresh transport + server **per request**, no session header, GET/DELETE return `405`. Set `sessionIdGenerator: undefined` and (typically) `enableJsonResponse: true`.

```typescript
// src/http-server-stateless.ts
app.post("/mcp", async (req, res) => {
  try {
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,    // stateless: no sessions, any node can serve any request
      enableJsonResponse: true,         // reply application/json instead of SSE
    });
    res.on("close", () => { transport.close(); server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP request error:", err);
    if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
  }
});

// No sessions ⇒ no SSE stream / no teardown to honor.
const methodNotAllowed = (_req: express.Request, res: express.Response) =>
  res.writeHead(405).end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null }));
app.get("/mcp", methodNotAllowed);
app.delete("/mcp", methodNotAllowed);
```

> **Pick one:** *stateful* keeps per-connection context, supports streaming notifications + resumability, needs sticky routing across nodes. *stateless* scales trivially and is the better default for tool-only API wrappers. Don't mix them on one endpoint.

### 2c. Backward-compat appendix — host legacy HTTP+SSE alongside `/mcp`

**Only if you must support clients that predate Streamable HTTP** (the old two-endpoint transport: `GET /sse` opens the stream, `POST /messages?sessionId=…` sends). New servers should be `/mcp`-only. To serve both from one process, run Streamable HTTP on `/mcp` (per §2a) **and** add the deprecated `SSEServerTransport` pair below. Keep the SSE transports in their own session map — the two transports are not interchangeable.

```typescript
// src/legacy-sse.ts — mount onto the SAME Express app that already serves /mcp (§2a).
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Separate map: SSE sessions are keyed by the id SSEServerTransport generates.
const sseTransports: Record<string, SSEServerTransport> = {};

export function mountLegacySSE(app: express.Express, createMcpServer: () => McpServer) {
  // GET /sse — open the stream. The transport writes an `endpoint` event telling the
  // client where to POST (/messages?sessionId=…). One McpServer per SSE connection.
  app.get("/sse", async (_req, res) => {
    const transport = new SSEServerTransport("/messages", res);  // path the client POSTs back to
    sseTransports[transport.sessionId] = transport;
    res.on("close", () => { delete sseTransports[transport.sessionId]; });
    await createMcpServer().connect(transport);                  // connect AFTER registering in the map
  });

  // POST /messages?sessionId=… — deliver a client message into its SSE session.
  // NOTE: do NOT put express.json() in front of this route — handlePostMessage reads the
  // raw stream itself. Mount it on a sub-router without the JSON body parser.
  app.post("/messages", async (req, res) => {
    const sessionId = req.query.sessionId as string | undefined;
    const transport = sessionId ? sseTransports[sessionId] : undefined;
    if (!transport) return res.status(400).send("No transport for that sessionId");
    await transport.handlePostMessage(req, res);                 // parses the body internally
  });
}
```

> **Migration note:** the SDK still ships `SSEServerTransport`, but the SSE transport is deprecated (spec 2025-03-26) and will be dropped from clients over time. Treat `/sse` as a sunset path: log its usage, and once your clients negotiate `protocolVersion >= 2025-03-26` over `/mcp`, remove it. The official `mcp-remote` shim and current Claude clients already speak Streamable HTTP — point new integrations at `/mcp` (see §12).

---

## 3. Server Setup — Python (FastMCP, the `mcp` package)

Use **FastMCP** (shipped inside the official `mcp` package as `mcp.server.fastmcp`). Decorate plain typed functions; FastMCP derives the JSON Schema from type hints + docstrings and supports stdio and Streamable HTTP from the same definition.

### Project Init

```bash
mkdir my-mcp-server-py && cd my-mcp-server-py
python -m venv .venv && source .venv/bin/activate
pip install "mcp[cli]" httpx pydantic uvicorn   # mcp[cli] adds the `mcp` dev/inspector CLI
```

### FastMCP server — stdio + Streamable HTTP from one definition

```python
# server.py
import json
from urllib.parse import quote
import httpx
from pydantic import BaseModel, Field
from mcp.server.fastmcp import FastMCP

# stateless_http + json_response = best scaling for tool-only API wrappers (see §2b rationale).
# Drop both kwargs for a stateful server with sessions; FastMCP serves a single /mcp endpoint.
mcp = FastMCP("my-mcp-server", stateless_http=True, json_response=True)

@mcp.tool()
async def dns_lookup(domain: str, type: str = "A") -> str:
    """Resolve DNS records for a domain. `type` is one of A, AAAA, CNAME, MX, NS, TXT, SOA."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"https://dns.google/resolve?name={quote(domain)}&type={type}")
        return json.dumps(resp.json(), indent=2)

# Return a Pydantic model (or TypedDict / dataclass) to get an output schema + structuredContent
# automatically — the client receives both a text rendering and machine-readable structured data.
class SSLInfo(BaseModel):
    valid_from: str = Field(description="Certificate validity start")
    valid_to: str = Field(description="Certificate expiry")
    issuer: str
    days_remaining: int

@mcp.tool()
async def ssl_check(domain: str) -> SSLInfo:
    """Check SSL/TLS certificate details for a domain (no scheme, e.g. example.com)."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"https://ssl-checker.io/api/v1/check/{quote(domain)}")
        d = resp.json()["result"]
        return SSLInfo(valid_from=d["valid_from"], valid_to=d["valid_till"],
                       issuer=d["issuer_o"], days_remaining=d["days_left"])

@mcp.resource("info://server")
def server_info() -> str:
    """Server metadata and capabilities."""
    return json.dumps({"name": "my-mcp-server", "version": "1.0.0", "tools": 2})

@mcp.prompt()
def analyze_domain(domain: str) -> str:
    """Reusable prompt: full domain analysis."""
    return (f'Analyze "{domain}": 1) DNS records (A, MX, NS, TXT). '
            "2) SSL certificate. 3) WHOIS. Summarize findings with any security concerns.")

if __name__ == "__main__":
    import sys
    # `python server.py` → stdio (local). `python server.py http` → Streamable HTTP on /mcp.
    mcp.run(transport="streamable-http" if "http" in sys.argv else "stdio")
```

Run it:

```bash
python server.py            # stdio — for Claude Desktop / Claude Code
python server.py http       # Streamable HTTP — serves http://localhost:8000/mcp
mcp dev server.py           # launch MCP Inspector against the stdio server
```

### Mounting FastMCP under FastAPI / Starlette

To expose `/mcp` alongside your existing HTTP API, mount `streamable_http_app()` and run its session manager in the app lifespan:

```python
# app.py — uvicorn app:app
import contextlib
from starlette.applications import Starlette
from starlette.routing import Mount
from server import mcp   # the FastMCP instance above

@contextlib.asynccontextmanager
async def lifespan(app: Starlette):
    # REQUIRED: run the session manager so /mcp works when mounted.
    async with mcp.session_manager.run():
        yield

app = Starlette(routes=[Mount("/", app=mcp.streamable_http_app())], lifespan=lifespan)
```

> **Legacy low-level API.** The pre-FastMCP `from mcp.server import Server` with `@server.list_tools()` / `@server.call_tool()` and `from mcp.server.sse import SseServerTransport` still exist for fine-grained control and old SSE clients, but they are verbose and SSE is deprecated — prefer FastMCP + Streamable HTTP for anything new.

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
server.registerTool(
  "tool_name",                          // snake_case, descriptive
  {
    description: "One-line description for the LLM",  // The LLM reads this to decide when to use it
    inputSchema: {
      // Zod schema → JSON Schema
      param1: z.string().describe("What this param does"),
      param2: z.number().optional().describe("Optional param with context"),
    },
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
server.registerTool(
  "ocr_extract",
  {
    description: "Extract text from an image using OCR",
    inputSchema: {
      imageUrl: z.string().url().describe("URL of the image to process"),
      language: z.enum(["eng", "fra", "deu", "spa", "por", "jpn", "kor", "chi_sim"]).default("eng"),
    },
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
server.registerTool(
  "evm_balance",
  {
    description: "Get native token balance for an address on any EVM chain",
    inputSchema: {
      address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe("EVM wallet address"),
      chain: z.enum(["ethereum", "celo", "base", "polygon", "arbitrum", "optimism"]).default("celo"),
    },
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

// --- WHOIS Lookup (via RDAP, the IANA-backed WHOIS successor) ---
server.registerTool(
  "whois_lookup",
  {
    description: "Get RDAP (WHOIS successor) registration information for a domain",
    inputSchema: {
      domain: z.string().min(1).describe("Domain name (e.g., example.com)"),
    },
  },
  async ({ domain }) => {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`);
    if (!res.ok) return { content: [{ type: "text", text: `RDAP lookup failed: ${res.status}` }], isError: true };
    const data = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// --- SSL Certificate Check ---
server.registerTool(
  "ssl_check",
  {
    description: "Check SSL/TLS certificate details for a domain",
    inputSchema: {
      domain: z.string().min(1).describe("Domain to check (without https://)"),
    },
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

### x402 Payment Flow (v2)

x402 is an HTTP-native stablecoin payment protocol (HTTP 402). **In v2 all payment data lives in headers** (base64-encoded JSON), freeing the response body for normal use. Three headers, three steps:

```
1. Client calls a paid tool with no payment → server returns HTTP 402 + header
     PAYMENT-REQUIRED: base64(JSON array of PaymentRequirement objects)
       each: { scheme:"exact", network:"base", asset:<token addr>, maxAmountRequired, payTo, resource, ... }
2. Client picks a requirement, signs a payload, retries with header
     PAYMENT-SIGNATURE: base64(JSON PaymentPayload)
       for the `exact` scheme on EVM this carries an EIP-3009 transferWithAuthorization signature
3. Server (via a facilitator) VERIFIES then SETTLES on-chain, then returns 200 + header
     PAYMENT-RESPONSE: base64(JSON { success, transaction:<txHash>, network, payer })
```

Notes that the old skill got wrong: the header names are `PAYMENT-REQUIRED` / `PAYMENT-SIGNATURE` / `PAYMENT-RESPONSE` (not `X-Payment` / `X-Payment-Required`), values are **base64 JSON**, and verification+settlement go through a **facilitator** (Coinbase's hosted one via `@coinbase/x402`, or another provider) — you don't POST ad-hoc fields to a bare `/verify` URL. Bind each requirement to the specific `resource` URL and rely on the facilitator/scheme for replay protection (EIP-3009 nonces); never treat a 200 from a random endpoint as proof of payment.

### Easiest path: the official `x402-express` middleware

Don't hand-roll header parsing for production. `x402-express` does the 402 challenge, header (de)serialization, verification, and settlement for you:

```bash
npm install x402-express @coinbase/x402
```

```typescript
// src/x402.ts
import { paymentMiddleware } from "x402-express";
import { facilitator } from "@coinbase/x402"; // Coinbase hosted facilitator (mainnet verify+settle)

// Gate specific routes/tools by price. Use a testnet network first (e.g. "base-sepolia").
export const x402 = paymentMiddleware(
  process.env.X402_RECIPIENT_ADDRESS as `0x${string}`,   // your receiving wallet
  {
    "POST /mcp": { price: "$0.005", network: process.env.X402_NETWORK || "base" },
  },
  facilitator,                                            // verifies + settles; omit to default to x402.org
);
// app.use(x402)  — mount BEFORE the /mcp handler so unpaid calls get a 402 automatically.
```

### Hand-rolled v2 helpers (when you can't use the middleware)

These back the `buildPaymentRequired` / `settleX402` hooks referenced in §6. They call a facilitator's `/verify` and `/settle` endpoints with the v2 payload shapes:

```typescript
// src/auth/x402.ts
import type express from "express";

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64");
const unb64 = <T>(s: string): T => JSON.parse(Buffer.from(s, "base64").toString("utf8"));
const FACILITATOR = process.env.X402_FACILITATOR_URL || "https://x402.org/facilitator";

// Build the 402 challenge: a base64 JSON array of PaymentRequirement objects.
export function buildPaymentRequired(req: express.Request): string {
  const resource = `${req.protocol}://${req.get("host")}${req.originalUrl}`; // bind payment to THIS URL
  return b64([{
    scheme: "exact",
    network: process.env.X402_NETWORK || "base",
    asset: process.env.X402_ASSET,                  // token contract address (see env below)
    payTo: process.env.X402_RECIPIENT_ADDRESS,
    maxAmountRequired: process.env.X402_PRICE_ATOMIC || "5000", // atomic units (USDC 6dp → 5000 = $0.005)
    resource,
    description: "MCP tool call",
    mimeType: "application/json",
    maxTimeoutSeconds: 60,
  }]);
}

// Verify + settle a PAYMENT-SIGNATURE via the facilitator; return the PAYMENT-RESPONSE header value.
export async function settleX402(paymentSignature: string, req: express.Request):
  Promise<{ settled: boolean; paymentResponse?: string; error?: string }> {
  try {
    const payload = unb64<Record<string, unknown>>(paymentSignature);
    const requirements = unb64<unknown[]>(buildPaymentRequired(req))[0];
    const headers = { "Content-Type": "application/json" }; // + CDP auth if using @coinbase/x402 facilitator
    // 1) verify the signed payload satisfies our requirement (amount, asset, payTo, resource, nonce)
    const v = await fetch(`${FACILITATOR}/verify`, { method: "POST", headers,
      body: JSON.stringify({ paymentPayload: payload, paymentRequirements: requirements }) });
    if (!v.ok || !(await v.json()).isValid) return { settled: false, error: "Payment invalid" };
    // 2) settle on-chain (idempotent on the payload nonce) and capture the tx hash
    const s = await fetch(`${FACILITATOR}/settle`, { method: "POST", headers,
      body: JSON.stringify({ paymentPayload: payload, paymentRequirements: requirements }) });
    const settlement = await s.json();
    if (!s.ok || !settlement.success) return { settled: false, error: "Settlement failed" };
    return { settled: true, paymentResponse: b64({ success: true, transaction: settlement.transaction, network: settlement.network, payer: settlement.payer }) };
  } catch (e: any) {
    return { settled: false, error: e.message };
  }
}
```

### Environment Config for x402

```bash
# .env
X402_RECIPIENT_ADDRESS=0xYourWalletAddress
X402_NETWORK=base                 # or "base-sepolia" (testnet), "celo", etc.
X402_ASSET=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913   # token contract (USDC on Base, 6 decimals)
X402_PRICE_ATOMIC=5000            # atomic units: USDC has 6 decimals → 5000 = $0.005
X402_FACILITATOR_URL=https://x402.org/facilitator        # or your CDP/Coinbase facilitator base URL
# Coinbase hosted facilitator (verify+settle on mainnet) also needs CDP API credentials:
# CDP_API_KEY_ID=...   CDP_API_KEY_SECRET=...

# Token addresses (verify current addresses at the issuer / docs.x402.org before mainnet):
# Base USDC: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (6 decimals)
# Celo cUSD: 0x765DE816845861e75A25fCA122bb6898B8B1282a (18 decimals → atomic units differ)
```

> **Money-moving guardrail.** Test on a testnet (`base-sepolia`) first; pin/verify the exact token contract address and decimals before mainnet; treat the wallet key as a production secret. x402 settlement is a real on-chain transfer — your facilitator choice and replay/nonce handling are security-critical. See `security-hardening`.

### Stripe Subscription Setup

```typescript
// scripts/create-stripe-product.ts — run once to set up billing
import Stripe from "stripe";

// Omit `apiVersion` to use the version pinned by your installed stripe-node release
// (recommended — it matches the SDK's TypeScript types). Pin a date only when you must
// freeze behavior, and keep it current. As of Jul 2026 the latest is "2026-06-24.dahlia";
// check https://docs.stripe.com/api/versioning and the stripe-node CHANGELOG for today's value.
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
// To pin explicitly:  new Stripe(key, { apiVersion: "2026-06-24.dahlia" });
// Stripe billing details (Checkout vs Payment Links, subscriptions, migrations): see `stripe-billing`.

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

## 9. Security

### Input Validation

> **SSRF is the #1 risk for an API-wrapping MCP server.** A string filter on `url.hostname` is necessary but **NOT sufficient** — it misses (a) IPv6 loopback/link-local/ULA, (b) decimal/octal/hex/`0x` IPv4 encodings (`http://2130706433/` == `127.0.0.1`), (c) a public hostname whose **DNS resolves** to a private IP, (d) a 30x **redirect** to a private IP after the first hop passed, and (e) cloud **metadata** endpoints (`169.254.169.254`, GCP `metadata.google.internal`, Azure IMDS). Do the string check as a fast pre-filter, then **resolve the host and re-check every resolved IP**, fetch with `redirect: "manual"` (re-validate each hop), and pin the agent to the resolved IP. Below: the syntactic filter, then a runtime guard.

```typescript
import { z } from "zod";
import net from "node:net";
import dns from "node:dns/promises";

// --- 1. Syntactic pre-filter (Zod) — cheap, rejects obvious internals + non-HTTPS ---
const urlSchema = z.string().url().refine(
  (url) => {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;          // no http:, file:, gopher:, ftp:
    let h = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, ""); // strip IPv6 brackets
    // Block obvious internal names + cloud metadata hosts
    if (["localhost", "metadata.google.internal"].includes(h)) return false;
    if (h.endsWith(".internal") || h.endsWith(".local") || h.endsWith(".localhost")) return false;
    // If it's an IP literal, classify it (covers IPv4 + IPv6; throws on weird encodings)
    if (net.isIP(h)) return !isPrivateIp(h);
    // Reject numeric IPv4 in non-dotted form (decimal/octal/hex) that net.isIP missed
    if (/^(0x[0-9a-f]+|\d+)$/.test(h)) return false;
    return true; // a name — still MUST be re-checked after DNS resolution (see guard below)
  },
  { message: "URL must be a public HTTPS URL (no internal hosts/IPs)" }
);

// --- 2. IP classifier: loopback / private / link-local / ULA / metadata, v4 AND v6 ---
function isPrivateIp(ip: string): boolean {
  const v = net.isIP(ip);
  if (v === 4) {
    const o = ip.split(".").map(Number);
    return (
      o[0] === 0 || o[0] === 10 || o[0] === 127 ||                       // this-net, 10/8, loopback
      (o[0] === 100 && o[1] >= 64 && o[1] <= 127) ||                     // 100.64/10 CGNAT
      (o[0] === 169 && o[1] === 254) ||                                  // 169.254/16 link-local (AWS/GCP/Azure metadata)
      (o[0] === 172 && o[1] >= 16 && o[1] <= 31) ||                      // 172.16/12
      (o[0] === 192 && o[1] === 168)                                     // 192.168/16
    );
  }
  if (v === 6) {
    const a = ip.toLowerCase();
    if (a === "::1" || a === "::") return true;                          // loopback / unspecified
    if (a.startsWith("fe80")) return true;                              // link-local
    if (a.startsWith("fc") || a.startsWith("fd")) return true;          // fc00::/7 ULA
    const m = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);                 // IPv4-mapped ::ffff:a.b.c.d
    if (m) return isPrivateIp(m[1]);
    return false;
  }
  return true; // unparseable ⇒ treat as unsafe
}

// --- 3. Runtime guard: resolve + re-check, then fetch with manual redirect re-validation ---
export async function safeFetch(rawUrl: string, init: RequestInit = {}): Promise<Response> {
  let url = rawUrl;
  for (let hop = 0; hop < 5; hop++) {                                    // cap redirects
    const u = new URL(url);
    if (u.protocol !== "https:") throw new Error("SSRF: non-HTTPS");
    const host = u.hostname.replace(/^\[|\]$/g, "");
    const ips = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map(r => r.address);
    if (ips.length === 0 || ips.some(isPrivateIp)) throw new Error(`SSRF: ${host} resolves to a private/blocked IP`);
    const res = await fetch(url, { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url).toString();      // re-validate next hop on loop
      continue;
    }
    return res;                                                          // 2xx/4xx/5xx — done
  }
  throw new Error("SSRF: too many redirects");
}
// NB: even this has a TOCTOU gap (DNS can change between check and connect / "DNS rebinding").
// For hard guarantees, resolve once and pin the connection to that IP via a custom https.Agent
// lookup, or run egress behind an allowlisting forward proxy. See `security-hardening`.

const domainSchema = z.string()
  .min(1).max(253)
  .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/, "Invalid domain");

const evmAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address");
```

> **MCP-specific transport hardening.** A remote MCP server is also exposed to **DNS-rebinding** attacks against its *own* HTTP endpoint: enable the SDK's host/origin validation on `StreamableHTTPServerTransport` (`enableDnsRebindingProtection: true`, `allowedHosts`, `allowedOrigins`) so a browser page on another origin can't drive your `/mcp` endpoint. Pair it with the fail-closed CORS in §8.

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
ExecStart=/usr/bin/node dist/http-server.js
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
CMD ["node", "dist/http-server.js"]
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

For remote (Streamable HTTP) servers, Vercel can act as an edge auth proxy:

```typescript
// vercel-proxy/api/mcp.ts
// NOTE: Vercel doesn't support long-lived SSE streams natively.
// Use Vercel as an auth proxy that FORWARDS to your actual MCP server.
// Do NOT redirect with the token in a query string: the MCP authorization spec
// forbids access tokens in the URI, and query strings leak into CDN/proxy logs.
// Pass the token in the Authorization header instead.

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = req.headers["x-api-key"] as string;
  if (!apiKey) {
    return res.status(401).json({ error: "API key required" });
  }

  // Verify key against your DB (Vercel KV, Upstash Redis, etc.)
  const valid = await verifyKeyAtEdge(apiKey);
  if (!valid) return res.status(401).json({ error: "Invalid API key" });

  // Proxy to the actual MCP server with a short-lived token in the Authorization header
  const token = generateShortLivedToken(apiKey);
  const upstream = await fetch("https://mcp.yourdomain.com/mcp", {
    method: req.method,
    headers: {
      "Content-Type": (req.headers["content-type"] as string) || "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${token}`,
      ...(req.headers["mcp-session-id"] ? { "Mcp-Session-Id": req.headers["mcp-session-id"] as string } : {}),
    },
    body: req.method === "POST" ? JSON.stringify(req.body) : undefined,
  });
  const sid = upstream.headers.get("mcp-session-id");
  if (sid) res.setHeader("Mcp-Session-Id", sid);
  res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
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
      "args": ["-y", "mcp-remote", "https://mcp.yourdomain.com/mcp"],
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

`protocolVersion` is a dated string negotiated at `initialize`. Use a **current** value — as of Jun 2026 the spec revision is **`2025-11-25`** (prior: `2025-06-18`, `2025-03-26`); the server echoes the highest it supports. The old `2024-11-05` is the pre-Streamable-HTTP value — don't hardcode it for new servers. Verify the latest at https://modelcontextprotocol.io/specification.

```bash
# 1. Test the stdio server directly (one-shot initialize)
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node dist/index.js

# 2. Test the Streamable HTTP server (the default remote transport) — start it first:
node dist/http-server.js   # serves http://localhost:3100/mcp

# 2a. initialize — clients MUST send BOTH Accept types; capture the Mcp-Session-Id from headers.
#     (-D - dumps response headers so you can read Mcp-Session-Id back out.)
curl -sD - http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'

# 2b. tools/list on that session (reuse the header value from 2a)
#     Clients MUST send MCP-Protocol-Version on every request after initialize;
#     servers assume 2025-03-26 when the header is absent.
SID="<paste Mcp-Session-Id>"
curl -s http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "MCP-Protocol-Version: 2025-11-25" \
  -H "Mcp-Session-Id: $SID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# 2c. DELETE to terminate the session
curl -s -X DELETE http://localhost:3100/mcp -H "MCP-Protocol-Version: 2025-11-25" -H "Mcp-Session-Id: $SID"

# 3. Test rate limiting (free tier) — repeated initialize calls should trip 429
for i in $(seq 1 15); do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/mcp \
    -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}'
done
# Should see 429 after the free-tier per-minute limit (default 10)

# 4. Test with an API key (pro tier — should NOT 429 at the free-tier limit)
curl -s http://localhost:3100/mcp -H "X-API-Key: your-test-key" \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}'

# 5. Test the x402 challenge (paid tier): no payment header ⇒ 402 + PAYMENT-REQUIRED (base64 JSON)
curl -sD - -o /dev/null http://localhost:3100/mcp -H "Accept-Payment: x402" \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}' \
  | grep -i '^payment-required:'

# 6. Health endpoint
curl http://localhost:3100/health

# 7. MCP Inspector — interactive testing of either transport
npx @modelcontextprotocol/inspector node dist/index.js        # stdio
npx @modelcontextprotocol/inspector                            # then point the UI at http://localhost:3100/mcp

# 8. Legacy HTTP+SSE clients ONLY (if you also host the §2c backward-compat /sse endpoint):
#   curl -N http://localhost:3100/sse                          # open stream, note the sessionId
#   curl -X POST "http://localhost:3100/messages?sessionId=SESSION_ID" \
#     -H "Content-Type: application/json" \
#     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

---

## 13. Listing on mcpservers.org

### Submission Requirements

1. **Working server** — must be installable and functional
2. **README.md** with clear setup instructions
3. **Tool documentation** — describe every tool, its inputs, and expected outputs
4. **npm package** (for stdio servers) or **public endpoint** (for remote Streamable HTTP servers)

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

### Remote (Streamable HTTP)
Endpoint: `https://mcp.yourdomain.com/mcp`

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

# x402 Payments (v2 — see §7; these names match the §7 helpers, NOT the legacy X402_TOKEN/X402_CHAIN)
X402_RECIPIENT_ADDRESS=0xYourWalletAddress
X402_NETWORK=base                 # or "base-sepolia" (testnet), "celo", etc.
X402_ASSET=0xYourTokenContractAddress       # token contract addr (e.g. USDC on Base, 6 decimals)
X402_PRICE_ATOMIC=5000            # atomic units: USDC has 6 decimals → 5000 = $0.005
X402_FACILITATOR_URL=https://x402.org/facilitator   # facilitator BASE url (verify+settle live under it), NOT a bare /verify
# Coinbase hosted facilitator (mainnet verify+settle) also needs CDP credentials:
# CDP_API_KEY_ID=...   CDP_API_KEY_SECRET=...

# Stripe (omit a pinned apiVersion to track the SDK; see §7 for the current-version policy)
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
server.registerTool("analyze_page", {
  description: "Analyze a webpage: screenshot + extracted text",
  inputSchema: { url: z.string().url() },
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
server.registerTool("bulk_dns", {
  description: "Look up DNS for multiple domains",
  inputSchema: { domains: z.array(z.string()).max(50) },
}, async ({ domains }) => {
  const results: string[] = [];
  for (let i = 0; i < domains.length; i++) {
    const data = await dnsLookup(domains[i]);
    results.push(`${domains[i]}: ${JSON.stringify(data)}`);
  }
  return { content: [{ type: "text", text: results.join("\n\n") }] };
});
```

### Gotcha: SSE Connection Lifecycle (legacy `/sse` transport — §2c)

Applies to the deprecated HTTP+SSE path only. With Streamable HTTP the SDK manages the GET stream for you; you mainly handle teardown via `transport.onclose` (§2a).

```typescript
// Legacy SSE connections can die silently. Always handle cleanup:
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

  for (const [id, transport] of Object.entries(transports)) {
    try { (transport as any).close?.(); } catch {}
    delete transports[id];
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

  // Strict > against the post-increment count: allows exactly perMinute/perDay
  // requests, matching the check-then-increment semantics of the §6 limiter.
  if (minuteCount > perMinute) {
    const ttl = await redis.ttl(minuteKey);
    return { allowed: false, retryAfter: ttl };
  }
  if (dayCount > perDay) {
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
  server.registerTool(name, { description, inputSchema: schema }, async (args) => {
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
