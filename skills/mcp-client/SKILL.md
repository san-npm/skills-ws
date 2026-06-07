---
name: mcp-client
description: "Consume MCP (Model Context Protocol) servers over stdio (local) or Streamable HTTP (remote): initialize handshake, call tools, read resources, get prompts, pagination/timeouts/errors, OAuth/bearer auth, plus Claude Desktop/Code, Cursor, OpenClaw config. Use when wiring an agent to an MCP server or debugging a transport/auth failure."
---

# MCP Client — Consuming Model Context Protocol Servers

> **Transport policy (MCP spec):** Use **stdio** for local subprocess servers and **Streamable HTTP** (`StreamableHTTPClientTransport`, endpoint usually `/mcp`) for remote servers. The old **HTTP+SSE** transport was deprecated in spec revision `2025-03-26` and superseded by Streamable HTTP; keep it only as a *legacy fallback* for old servers (endpoint usually `/sse`). WebSocket transport was removed. As of Jun 2026 the latest spec revision is `2025-11-25` — verify at https://modelcontextprotocol.io/specification.

This skill makes an agent expert at being an **MCP client**: discovering a server's capabilities, calling its tools, reading its resources, using its prompts, and doing so safely with auth, timeouts, retries, and cost control. It is provider-agnostic; one specific public server (`mcp.skills.ws`) appears only as an optional worked example at the end.

For building the *server* side, see the sibling skill `mcp-server-builder`. For agent orchestration around these tool calls, see `ai-agent-building`. For wallet/payment flows (x402), see `wallet-integration` and `defi-integration`.

## What this skill covers

1. Transports: stdio (local) vs Streamable HTTP (remote), with a Streamable-HTTP-then-SSE fallback for legacy servers.
2. Connection lifecycle: `initialize` handshake, protocol-version negotiation, capability discovery, clean shutdown.
3. Primitives: tools (`tools/list`, `tools/call`), resources (`resources/list`, `resources/read`, templates, subscriptions), prompts (`prompts/list`, `prompts/get`), and client-provided capabilities (roots, sampling, elicitation).
4. Robustness: cursor pagination, progress notifications, cancellation, timeouts, JSON-RPC error codes, retries with backoff.
5. Auth: OAuth 2.1 (the spec's standard for remote HTTP servers) plus provider-specific bearer/API-key headers; token storage and least privilege.
6. Client configuration for Claude Desktop, Claude Code, Cursor, and OpenClaw (stdio + Streamable HTTP).
7. Cost, caching, and security best practices.

---

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

## 2. Programmatic client (official SDK)

Install: `npm i @modelcontextprotocol/sdk` (TypeScript) or `pip install mcp` / `uv add mcp` (Python). The TypeScript SDK uses subpath imports under `@modelcontextprotocol/sdk/...`. (As of Jun 2026; check the current import paths and package name at https://github.com/modelcontextprotocol/typescript-sdk and https://github.com/modelcontextprotocol/python-sdk before pinning.)

### 2.1 Connect to a remote server (Streamable HTTP) — TypeScript

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const client = new Client(
  { name: 'my-agent', version: '1.0.0' },
  // Advertise the client capabilities you actually implement (see §3.4).
  { capabilities: { /* roots: { listChanged: true }, sampling: {}, elicitation: {} */ } }
);

const transport = new StreamableHTTPClientTransport(
  new URL('https://api.example.com/mcp'),
  {
    // Provider-specific static headers (API key, etc.). For OAuth, prefer authProvider — see §5.
    requestInit: {
      headers: new Headers({ Authorization: `Bearer ${process.env.MCP_TOKEN}` }),
    },
  }
);

await client.connect(transport); // performs the initialize handshake for you
// ... use the client (see §3) ...
await client.close();
```

`client.connect()` runs the full `initialize` exchange: it sends the client's protocol version + capabilities + `clientInfo`, receives the server's negotiated version + capabilities + `serverInfo`, and sends the `notifications/initialized` ack. You don't hand-roll JSON-RPC.

### 2.2 Connect to a local server (stdio) — TypeScript

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'npx',
  args: ['-y', '@scope/some-mcp-server'],
  env: { ...process.env, SOME_API_KEY: process.env.SOME_API_KEY ?? '' }, // pass only what's needed
});

const client = new Client({ name: 'my-agent', version: '1.0.0' });
await client.connect(transport);
```

Secrets reach a local server via its **environment**, not the command line (args are visible in `ps`). Pass an explicit `env` allowlist rather than leaking your whole environment.

### 2.3 Streamable HTTP with SSE fallback (support old + new servers)

This is the canonical compatibility pattern from the SDK docs:

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

async function connectRemote(url: string) {
  const baseUrl = new URL(url);
  try {
    // Preferred: modern Streamable HTTP
    const client = new Client({ name: 'my-agent', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(baseUrl);
    await client.connect(transport);
    return { client, transport };
  } catch {
    // Legacy fallback: old HTTP+SSE servers (deprecated 2025-03-26)
    const client = new Client({ name: 'my-agent', version: '1.0.0' });
    const transport = new SSEClientTransport(baseUrl);
    await client.connect(transport);
    return { client, transport };
  }
}
```

### 2.4 Python client (Streamable HTTP, with stdio + legacy SSE shown)

```python
import asyncio
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from mcp.client.streamable_http import streamablehttp_client  # preferred for remote
# from mcp.client.sse import sse_client                       # legacy fallback only

async def remote():
    # Provider-specific auth headers; for OAuth see the SDK auth helpers (§5).
    headers = {"Authorization": "Bearer <token>"}
    async with streamablehttp_client(
        "https://api.example.com/mcp", headers=headers, timeout=30
    ) as (read, write, _get_session_id):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            print("tools:", [t.name for t in tools.tools])
            result = await session.call_tool("dns_lookup", {"domain": "example.com"})
            print(result.content)

async def local():
    params = StdioServerParameters(command="uvx", args=["some-mcp-server"], env=None)
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            print((await session.list_tools()).tools)

asyncio.run(remote())
```

> SDK note (Jun 2026): newer Python SDK releases also expose a `streamable_http_client(url, http_client=httpx.AsyncClient(...))` form where you configure headers/timeout/auth on an `httpx.AsyncClient` (set `follow_redirects=True`). Use whichever your installed `mcp` version documents — `python -c "import mcp; print(mcp.__version__)"` then check that version's `docs/`.

---

## 3. Using server capabilities

After `initialize`, only call primitives the server actually advertised in its capabilities. Calling a method the server didn't declare returns a JSON-RPC error (`-32601 Method not found`).

### 3.1 Tools — discover and call

```typescript
// List (paginate — never assume one page; see §3.5)
const { tools } = await client.listTools();
console.log(tools.map(t => `${t.name}: ${t.description}`));
// Each tool has a JSON Schema `inputSchema`; validate arguments against it before calling.

// Call
const result = await client.callTool({
  name: 'dns_lookup',
  arguments: { domain: 'example.com', type: 'MX' },
});

// Read structured + unstructured output. `content` is an array of typed blocks.
for (const block of result.content) {
  if (block.type === 'text') console.log(block.text);
  // other block types: 'image' (data+mimeType), 'resource', 'resource_link', 'audio'
}
// Tools signal failures via result.isError === true (NOT a transport/JSON-RPC error).
// Modern servers may also return `result.structuredContent` (typed JSON) — prefer it when present.
if (result.isError) {
  throw new Error('Tool reported an error: ' + JSON.stringify(result.content));
}
```

**Two error channels — keep them straight:**
- **Protocol errors** (bad params, unknown method, transport down) → thrown as an `McpError` carrying a JSON-RPC code (v1 SDK; v2 splits this into local `SdkError` vs server-side `ProtocolError`).
- **Tool execution errors** (the DNS lookup failed, the API 500'd) → returned *successfully* with `result.isError === true` and a human-readable message in `content`. The model is meant to see and react to these, so don't mask them.

### 3.2 Resources — list, read, templates, subscribe

```typescript
// List concrete resources (paginate on nextCursor)
const { resources } = await client.listResources();
// Read one by URI
const { contents } = await client.readResource({ uri: 'config://app/settings' });
for (const item of contents) {
  // item.uri, item.mimeType, and either item.text or item.blob (base64)
  console.log(item.uri, item.mimeType);
}

// Resource templates (RFC 6570 URI templates) for parameterized reads
const { resourceTemplates } = await client.listResourceTemplates();
// e.g. uriTemplate: "github://repos/{owner}/{repo}/issues/{id}"

// If the server's resources capability advertises `subscribe: true`:
await client.subscribeResource({ uri: 'log://app/today' });
client.setNotificationHandler(
  /* ResourceUpdatedNotificationSchema */ undefined as any,
  (n) => console.log('resource changed:', n.params.uri)
);
```

Resources are **app-controlled context** (read-only data the host chooses to feed the model), distinct from tools (model-invoked actions). Don't treat a `resources/read` as a side-effecting call.

### 3.3 Prompts — list and fill

```typescript
const { prompts } = await client.listPrompts(); // each has name + argument schema
const { messages } = await client.getPrompt({
  name: 'review-code',
  arguments: { code: 'console.log("hello")' },
});
// `messages` is a ready-to-send array of {role, content} you forward to the model.
```

Prompts are **user-controlled** templates (often surfaced as slash commands / menu items). Let the user pick them; don't auto-invoke silently.

### 3.4 Client-provided capabilities (the reverse direction)

A server can call *back* into your client if you advertised the capability in `initialize`:
- **roots** — you expose filesystem roots the server may operate within (register a `ListRootsRequest` handler).
- **sampling** — the server asks *your* model to generate text (`sampling/createMessage`). Gate this behind user approval and a token/cost budget; a malicious server could otherwise drive your LLM spend.
- **elicitation** — the server asks the user for structured input mid-call (you render a form from a JSON Schema and return the answer). Never auto-fill secrets; show the user what's being requested.

Only advertise what you actually implement and intend to honor.

### 3.5 Pagination, progress, cancellation, timeouts

```typescript
// Pagination: list endpoints return nextCursor; loop until it's undefined.
const allTools = [];
let cursor: string | undefined;
do {
  const page = await client.listTools({ cursor });
  allTools.push(...page.tools);
  cursor = page.nextCursor;
} while (cursor);

// Per-call timeout (default is 60s). On timeout the SDK sends a cancellation to the server.
// v1 SDK (npm i @modelcontextprotocol/sdk): McpError + ErrorCode from .../sdk/types.js.
// v2 renamed these — local errors become `SdkError`/`SdkErrorCode` and protocol errors
// `ProtocolError`/`ProtocolErrorCode`, both imported from `@modelcontextprotocol/client`.
// Check your installed major version and import accordingly.
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
try {
  const r = await client.callTool(
    { name: 'slow-operation', arguments: {} },
    { timeout: 120_000 } // override default 60s
  );
} catch (e) {
  if (e instanceof McpError && e.code === ErrorCode.RequestTimeout) {
    console.error('timed out');
  } else { throw e; }
}

// Progress + long-running work: pass onprogress; reset the timeout as progress arrives,
// but cap total wall-clock with maxTotalTimeout so a stalled server can't hang forever.
await client.callTool(
  { name: 'long-operation', arguments: {} },
  {
    onprogress: ({ progress, total }) => console.log(`${progress}/${total ?? '?'}`),
    resetTimeoutOnProgress: true,
    maxTotalTimeout: 600_000,
  }
);

// Manual cancellation via AbortSignal:
const ac = new AbortController();
const p = client.callTool({ name: 'x', arguments: {} }, { signal: ac.signal });
// ac.abort();  // sends notifications/cancelled to the server
```

### 3.6 JSON-RPC / SDK error codes

| Code | Name | Typical cause | Client action |
|------|------|---------------|---------------|
| `-32700` | Parse error | Malformed JSON on the wire | Bug in transport/serialization; report |
| `-32600` | Invalid request | Bad JSON-RPC envelope | Fix request shape |
| `-32601` | Method not found | Called a capability the server didn't advertise | Check `initialize` capabilities first |
| `-32602` | Invalid params | Arguments fail the tool's `inputSchema` | Validate args against the schema |
| `-32603` | Internal error | Server-side exception | Retry with backoff; if persistent, report |
| `-32002` | Resource not found | Bad/expired resource URI | Re-list resources |
| `-32001` | Request timeout (SDK) | No response within `timeout` | Backoff/retry; raise timeout for slow tools |

Distinguish these (protocol failures) from `result.isError === true` (the tool ran but failed). Retry only idempotent operations; never blindly retry a tool that may have side effects.

---

## 4. Configuring AI clients

Below: **local (stdio)** and **remote (Streamable HTTP)** for each client. Auth on remote servers is provider-specific — use OAuth (the client opens a browser flow) where the server supports it, or inject a bearer/API-key header. CLIs and config schemas change; verify against each tool's current docs (links inline).

### 4.1 Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows). Claude Desktop primarily launches **stdio** servers:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me/projects"]
    },
    "my-remote": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://api.example.com/mcp", "--header", "Authorization: Bearer ${MCP_TOKEN}"],
      "env": { "MCP_TOKEN": "..." }
    }
  }
}
```

> Native remote (Streamable HTTP / OAuth) support in Claude Desktop has shipped via Connectors/Settings rather than this JSON file; for a remote URL without native support, bridge it with the `mcp-remote` stdio adapter as above. Verify current options at https://modelcontextprotocol.io/docs/develop/connect-local-servers (as of Jun 2026).

### 4.2 Claude Code

```bash
# Local stdio server
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem ~/projects

# Remote Streamable HTTP server (preferred for URLs)
claude mcp add --transport http my-remote https://api.example.com/mcp \
  --header "Authorization: Bearer ${MCP_TOKEN}"

# Legacy SSE server (only if it doesn't support Streamable HTTP)
claude mcp add --transport sse old-remote https://legacy.example.com/sse

# Manage
claude mcp list
claude mcp get my-remote
claude mcp remove my-remote
```

Equivalent `.mcp.json` (project-scoped, commit-safe if it contains no secrets):

```json
{
  "mcpServers": {
    "my-remote": {
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": { "Authorization": "Bearer ${MCP_TOKEN}" }
    },
    "old-remote": { "type": "sse", "url": "https://legacy.example.com/sse" }
  }
}
```

Use `"type": "http"` for Streamable HTTP. Keep `"type": "sse"` only for legacy servers. Reference: https://docs.claude.com/en/docs/claude-code/mcp (verify flags/keys for your version).

### 4.3 Cursor

`~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project):

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me/projects"]
    },
    "my-remote": {
      "url": "https://api.example.com/mcp",
      "headers": { "Authorization": "Bearer ${MCP_TOKEN}" }
    }
  }
}
```

A `url` entry is treated as remote (Streamable HTTP, SSE as fallback). Cursor also supports OAuth login for servers that advertise it. Docs: https://docs.cursor.com/context/mcp (verify, as of Jun 2026).

### 4.4 OpenClaw

`openclaw.json`:

```json
{
  "mcp": {
    "servers": {
      "filesystem": {
        "transport": "stdio",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me/projects"]
      },
      "my-remote": {
        "transport": "http",
        "url": "https://api.example.com/mcp",
        "headers": { "Authorization": "Bearer ${MCP_TOKEN}" }
      },
      "old-remote": {
        "transport": "sse",
        "url": "https://legacy.example.com/sse"
      }
    }
  }
}
```

Prefer `"transport": "http"` (Streamable HTTP); reserve `"sse"` for legacy servers. Confirm exact keys against the OpenClaw version you run.

**Secrets in configs:** reference env vars (`${MCP_TOKEN}`) rather than pasting tokens; keep any file that contains a literal secret out of git.

---

## 5. Authentication

There are two worlds:

1. **OAuth 2.1** — the MCP spec's standard for remote HTTP servers. The server is an OAuth *resource server*; you obtain a token from its authorization server and send `Authorization: Bearer <token>`.
2. **Provider-specific headers** — many real servers just want a static API-key header (`Authorization: Bearer ...`, `X-Api-Key: ...`). Simpler, but the key is long-lived — store and scope it carefully.

### 5.1 OAuth 2.1 discovery flow (spec)

1. Client hits the MCP endpoint with no token → server returns **`401 Unauthorized`** with a `WWW-Authenticate: Bearer ... resource_metadata="https://server/.well-known/oauth-protected-resource"` header.
2. Client fetches that **Protected Resource Metadata (PRM)** doc to learn the authorization server(s).
3. Client fetches the authorization server's metadata (`/.well-known/oauth-authorization-server`), runs an **Authorization Code + PKCE** flow (Dynamic Client Registration if supported), and gets an access token (+ refresh token).
4. Client retries with `Authorization: Bearer <access_token>` and includes the resource indicator so the token is audience-bound to this server.
5. On `401`/expiry, refresh; on `403` you lack scope.

### 5.2 OAuth in the TypeScript SDK

The SDK handles the dance if you pass an `authProvider`. For servers that mint tokens out-of-band, the minimal form just supplies the token:

```typescript
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

// Minimal: provide a token; a 401 surfaces as UnauthorizedError.
const transport = new StreamableHTTPClientTransport(new URL('https://api.example.com/mcp'), {
  authProvider: { token: async () => process.env.MCP_TOKEN! },
});
```

For full interactive OAuth (PKCE, redirect, token persistence), implement `OAuthClientProvider` (redirect URL, client metadata, `tokens()`/`saveTokens()`, `redirectToAuthorization()`, code-verifier storage) and call `transport.finishAuth(authorizationCode)` after the redirect returns. Check the current interface at https://github.com/modelcontextprotocol/typescript-sdk/blob/main/docs/client.md — the auth API evolves.

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
- Treat a server as untrusted: it can return prompt-injection-laden tool output. Don't auto-execute server-suggested shell/SQL; gate sampling/elicitation behind user approval.

---

## 6. Robustness patterns

### 6.1 Retry with backoff (transport-level)

```typescript
async function withRetry<T>(fn: () => Promise<T>, max = 3): Promise<T> {
  for (let i = 0; i < max; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const code = e?.code;                 // JSON-RPC / SDK error code
      const retriable = code === -32603      // internal error
        || code === -32001                   // timeout
        || e?.status === 429 || e?.status === 503;
      if (!retriable || i === max - 1) throw e;
      await new Promise(r => setTimeout(r, Math.min(1000 * 2 ** i, 30_000) + Math.random() * 250));
    }
  }
  throw new Error('unreachable');
}

// Only wrap idempotent calls. A non-idempotent tool (e.g. "send_email") must NOT be auto-retried.
const tools = await withRetry(() => client.listTools());
```

### 6.2 HTTP status handling (when calling a raw HTTP/REST endpoint, not via the SDK)

Some "MCP" providers also expose plain REST endpoints. For those, map status codes:

| Code | Meaning | Action |
|------|---------|--------|
| 200 | OK | Process |
| 400 | Bad request | Fix params |
| 401 | Unauthenticated | Refresh token / fix key |
| 402 | Payment required | See §8 (handle the 402 challenge) |
| 403 | Forbidden | Insufficient scope |
| 429 | Rate limited | Honor `Retry-After`; backoff |
| 5xx | Server error | Backoff + retry (idempotent only) |

### 6.3 Caching (avoid redundant calls)

```typescript
const cache = new Map<string, { data: unknown; at: number }>();
const TTL: Record<string, number> = { dns: 300_000, whois: 86_400_000, ssl: 3_600_000 };
async function cached(tool: string, args: Record<string, unknown>, fn: () => Promise<unknown>) {
  const key = `${tool}:${JSON.stringify(args)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < (TTL[tool] ?? 60_000)) return hit.data;
  const data = await fn();
  cache.set(key, { data, at: Date.now() });
  return data;
}
```

Cache read-only/slow-changing results (DNS, WHOIS, SSL). Never cache anything user/auth-scoped under a shared key, and never cache side-effecting calls.

### 6.4 Safe local fallback (no command injection)

If you fall back to a local shell when an MCP call fails, **never interpolate user input into a shell string**. Resolve DNS with the runtime resolver, or use `execFile` with an argument array and validate input:

```typescript
import { resolve4 } from 'node:dns/promises';

async function resilientDns(domain: string) {
  if (!/^[a-z0-9.-]{1,253}$/i.test(domain)) throw new Error('invalid domain');
  try {
    return await client.callTool({ name: 'dns', arguments: { domain, type: 'A' } });
  } catch {
    // Safe: no shell, argument is validated and passed to a resolver API (not a shell string).
    const records = await resolve4(domain);
    return { content: [{ type: 'text', text: JSON.stringify({ records }) }], isError: false };
  }
}
```

> Anti-pattern: ``execSync(`dig +short ${domain} A`)`` — a `domain` of `"x; rm -rf ~"` executes arbitrary commands. Don't do this.

---

## 7. Cost control

- **Cache** read-only results (§6.3) — biggest single lever.
- **Batch** independent calls with `Promise.all` to cut latency (not necessarily cost).
- **Set timeouts** so a hung server doesn't stall the whole agent (§3.5).
- **Cap LLM-side spend** if you grant the server `sampling` — set a per-session token/dollar budget and require approval (§3.4).
- **Pick the pricing model** that fits volume: most providers offer a free tier, a flat subscription, and/or pay-per-call. Subscriptions win above the break-even call volume; pay-per-call/x402 wins for spiky low volume. Confirm the *current* numbers on the provider's pricing page before optimizing — prices and quotas drift.

---

## 8. Pay-per-call (x402) — handle the challenge safely

Some HTTP MCP/API providers gate calls behind **x402** (HTTP `402 Payment Required` + onchain micropayment). x402 is **provider-specific and still evolving** (as of Jun 2026), so do **not** hardcode a price, token, chain, or receiver — read them from the server's 402 challenge each time.

**Correct flow:** call the endpoint → on `402`, parse the challenge the server returns (it specifies `accepts`: scheme(s), network/chain-id, token contract, amount, `payTo` receiver, and a nonce/validity window) → pay *exactly that*, audience/chain-bound → resend the request with the payment proof header the scheme defines → the server (or its facilitator) verifies and serves the response.

```typescript
// Pseudocode — adapt to the provider's documented x402 scheme; the server dictates the terms.
async function x402Fetch(url: string, opts: RequestInit = {}) {
  let res = await fetch(url, opts);
  if (res.status !== 402) return res;

  const challenge = await res.json(); // { accepts: [{ scheme, network, asset, amount, payTo, nonce, expiresAt }] }
  const terms = challenge.accepts[0];

  // ---- MANDATORY GUARDRAILS before spending money ----
  assertAllowlisted(terms.network, terms.asset, terms.payTo);   // chain/token/receiver allowlist
  assertWithinSpendLimit(terms.asset, terms.amount);            // per-call + rolling budget cap
  if (Date.now() > Date.parse(terms.expiresAt)) throw new Error('challenge expired');
  await confirmWithUser(terms);                                 // explicit human approval (skip only in dev)
  if (process.env.X402_MODE !== 'mainnet') terms.network = TESTNET_FOR(terms.network); // default to testnet

  const proof = await buildAndSignPayment(terms);  // sign per the scheme; bind to chain-id + nonce (replay-safe)
  return fetch(url, { ...opts, headers: { ...opts.headers, 'X-Payment': proof } });
}
```

**Guardrails (non-negotiable for money-moving code):**
- **Allowlist** the receiver, chain-id, and token contract; reject anything the challenge proposes that isn't pre-approved (a compromised server could swap in its own receiver).
- **Spend limits**: enforce a per-call max *and* a rolling session/day budget; abort on breach.
- **Explicit user confirmation** for every payment outside an automated dev/testnet context.
- **Default to testnet**; require an explicit `mainnet` opt-in env flag before real funds move.
- **Replay safety**: bind the payment to the challenge's nonce + chain-id + expiry; never reuse a proof.
- **No hardcoded receiver/price.** These come from the live challenge, not the skill.
- This is unaudited financial automation — verify the provider's scheme and your wallet handling, and treat keys per `wallet-integration` / `security-hardening`.

KYC/jurisdiction/tax: moving stablecoins may have tax and regulatory implications in your jurisdiction — keep records and consult a professional.

---

## 9. Optional worked example — `mcp.skills.ws`

A public MCP/HTTP service for web-intelligence and onchain reads (screenshots, WHOIS, DNS, SSL, OCR, balances). Shown only to make the generic patterns above concrete. **All prices, quotas, supported chains, and receiver addresses below are commercial facts that drift — treat them as illustrative and confirm live values from the service's own responses/pricing page before relying on them.**

**Connect (Streamable HTTP, preferred):**

```bash
# Health
curl -s https://mcp.skills.ws/health
```

```bash
# Claude Code, as a remote Streamable HTTP MCP server
claude mcp add --transport http skills-ws https://mcp.skills.ws/mcp \
  --header "X-Api-Key: ${SKILLS_WS_KEY}"
```

```typescript
// SDK
const transport = new StreamableHTTPClientTransport(
  new URL('https://mcp.skills.ws/mcp'),
  { requestInit: { headers: new Headers({ 'X-Api-Key': process.env.SKILLS_WS_KEY ?? '' }) } }
);
const client = new Client({ name: 'my-agent', version: '1.0.0' });
await client.connect(transport);
const { tools } = await client.listTools();
const r = await client.callTool({ name: 'dns', arguments: { domain: 'example.com', type: 'MX' } });
```

**Auth tiers (illustrative — verify current values):**
- *Free*: small per-IP daily quota, no signup; watch `X-RateLimit-Remaining` and back off on `429`.
- *API key (subscription)*: send `X-Api-Key: <key>`; obtain via the service's billing checkout. Read the *current* price from the upgrade prompt in a `402`/`429` body, not from this doc.
- *x402 pay-per-call*: handle the `402` challenge per §8 — read the price/token/network/receiver from the live challenge; do **not** hardcode them.

**Example tools (parameters as advertised by `tools/list`):** `screenshot` (`url`,`width`,`height`,`fullPage`,`format`), `whois` (`domain`), `dns` (`domain`,`type`), `ssl` (`domain`), `ocr` (`url`), `chain.balance`/`chain.erc20`/`chain.tx` (`address`/`token`/`hash` + `chain`). Always trust the server's `inputSchema` from `tools/list` over any list here.

**Worked multi-tool flow — website audit (via the SDK, parallel):**

```typescript
async function auditWebsite(client: Client, domain: string) {
  const [dns, ssl, whois] = await Promise.all([
    client.callTool({ name: 'dns', arguments: { domain, type: 'A' } }),
    client.callTool({ name: 'ssl', arguments: { domain } }),
    client.callTool({ name: 'whois', arguments: { domain } }),
  ]);
  for (const r of [dns, ssl, whois]) if (r.isError) console.warn('tool error', r.content);
  const shot = await client.callTool({ name: 'screenshot', arguments: { url: `https://${domain}`, fullPage: true } });
  return { dns, ssl, whois, shot }; // parse each result.structuredContent / content as needed
}
```

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `connect()` hangs or 404/405 on remote URL | Server is SSE-only (legacy) or wrong path | Use the Streamable-HTTP-then-SSE fallback (§2.3); try `/mcp` then `/sse` |
| `-32601 Method not found` | Calling a capability the server didn't advertise | Inspect server capabilities from `initialize`; only call what's offered |
| `-32602 Invalid params` | Args don't match the tool's `inputSchema` | Validate args against the schema from `tools/list` |
| `401` on every request | No/expired/wrong-audience token | Run the OAuth flow (§5.1) or fix the API-key header; ensure token is bound to this resource |
| `403` | Token lacks scope | Re-consent with the needed scopes |
| Works once, fails after idle | HTTP/SSE stream timed out | Reconnect with backoff; re-`initialize`; persist `Mcp-Session-Id` |
| Garbled stdio / server "won't start" | Server logged to **stdout** (protocol channel) | Ensure the server logs to stderr; check the launch command/args |
| `result.isError === true` but no exception | Tool ran but failed | Read `content`; surface it to the model/user; retry only if idempotent |
| Calls hang forever | No timeout set | Set `timeout` + `maxTotalTimeout` (§3.5) |
| `402 Payment Required` | Pay-per-call gate | Handle the challenge with guardrails (§8) — never hardcode the receiver/price |

---

## Quick reference

**Decision tree**
- Local subprocess? → **stdio** (`StdioClientTransport` / `stdio_client`), secrets via `env`.
- Remote URL? → **Streamable HTTP** (`StreamableHTTPClientTransport` / `streamablehttp_client`, endpoint `/mcp`); fall back to **SSE** only if it 400/404/405s.
- Auth? → OAuth 2.1 (browser flow) where supported; else provider bearer/API-key header. Never commit tokens.
- Slow tool? → `timeout` + `onprogress` + `maxTotalTimeout`.
- Many results? → loop on `nextCursor`.
- Tool failed? → check `result.isError` (not just exceptions).
- Money (x402)? → handle the live `402` challenge with allowlist + spend cap + user confirm + testnet default; no hardcoded receiver.

**Key facts (verify against current spec/SDK — Jun 2026)**
- Latest spec revision: `2025-11-25` (https://modelcontextprotocol.io/specification).
- Streamable HTTP replaced HTTP+SSE in `2025-03-26`; SSE is legacy-fallback only.
- Send `MCP-Protocol-Version: <negotiated>` on every HTTP request after `initialize`; persist `Mcp-Session-Id`.
- TS package `@modelcontextprotocol/sdk` (subpath imports); Python package `mcp` (`pip install mcp`).
- Default per-call timeout: 60s (override per call).

**Related skills:** `mcp-server-builder` (build the server), `ai-agent-building` (orchestrate tool calls), `wallet-integration` / `defi-integration` (x402 payments), `auth-implementation` (OAuth flows), `security-hardening` (key handling, injection), `onchain-analytics` (consuming chain-data tools).
