## Contents

- 2. Server Setup — TypeScript (@modelcontextprotocol/sdk)
- Project Init
- Minimal stdio Server
- 2a. Streamable HTTP — Stateful (sessions + resumability) — RECOMMENDED
- 2b. Streamable HTTP — Stateless (horizontal scale, JSON-only)
- 2c. Backward-compat appendix — host legacy HTTP+SSE alongside /mcp

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
