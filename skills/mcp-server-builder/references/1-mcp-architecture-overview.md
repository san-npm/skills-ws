## Contents

- 1. MCP Architecture Overview
- Transports
- Message Flow (Streamable HTTP — current)
- JSON-RPC Protocol

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
