## Contents

- 3. Using server capabilities
- 3.1 Tools — discover and call
- 3.2 Resources — list, read, templates, subscribe
- 3.3 Prompts — list and fill
- 3.4 Client-provided capabilities (the reverse direction)
- 3.5 Pagination, progress, cancellation, timeouts
- 3.6 JSON-RPC / SDK error codes

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
import { ResourceUpdatedNotificationSchema } from '@modelcontextprotocol/sdk/types.js';
await client.subscribeResource({ uri: 'log://app/today' });
client.setNotificationHandler(
  ResourceUpdatedNotificationSchema,
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
