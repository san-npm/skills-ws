## Contents

- 6. Robustness patterns
- 6.1 Retry with backoff (transport-level)
- 6.2 HTTP status handling (when calling a raw HTTP/REST endpoint, not via the SDK)
- 6.3 Caching (avoid redundant calls)
- 6.4 Safe local fallback (no command injection)

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
