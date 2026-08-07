## Contents

- 1. Transports
- Choosing and detecting

## 1. Transports

MCP is JSON-RPC 2.0 messages over a transport. You pick the transport based on *where the server runs*.

| Transport | Use for | Endpoint shape | SDK class (TS) | SDK helper (Py) |
|-----------|---------|----------------|----------------|-----------------|
| **stdio** | Local subprocess (a CLI you spawn) | command + args | `StdioClientTransport` | `stdio_client` |
| **Streamable HTTP** | Remote server over the network (preferred) | `https://host/mcp` | `StreamableHTTPClientTransport` | `streamablehttp_client` |
| HTTP+SSE *(legacy)* | Old remote servers built pre-2025-03-26 | `https://host/sse` | `SSEClientTransport` | `sse_client` |

**stdio** — the server is a process you launch; messages flow over stdin/stdout, framed as newline-delimited JSON-RPC. Most "install an MCP server" instructions (`npx @scope/server`, `uvx some-server`) are stdio. Logging must go to **stderr** — never stdout (stdout is the protocol channel).

**Streamable HTTP** — a single HTTP endpoint (commonly `/mcp`). The client `POST`s JSON-RPC requests; the server may answer with a single `application/json` body or upgrade to an SSE stream (`text/event-stream`) for streaming/server-initiated messages. After the `initialize` response, the client must echo the negotiated version on every request via the `MCP-Protocol-Version` header, and persist any `Mcp-Session-Id` the server returns. This replaces the deprecated two-endpoint SSE transport.

**Legacy SSE** — two endpoints (a GET SSE stream + a POST channel). Only for servers that predate Streamable HTTP. Detect-and-fallback (see §2.3); don't build new clients on it.

### Choosing and detecting

- If you control the launch command → **stdio**.
- If you have a URL → try **Streamable HTTP** first, fall back to **SSE** only if the server rejects it (HTTP 400/404/405 on the `initialize` POST).
- Public server registries (the MCP registry `server.json`) list `remotes[]` entries typed `streamable-http` or `sse`; prefer the `streamable-http` entry.

---
