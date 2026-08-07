## Contents

- 2. Programmatic client (official SDK)
- 2.1 Connect to a remote server (Streamable HTTP) — TypeScript
- 2.2 Connect to a local server (stdio) — TypeScript
- 2.3 Streamable HTTP with SSE fallback (support old + new servers)
- 2.4 Python client (Streamable HTTP, with stdio + legacy SSE shown)

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
