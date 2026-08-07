## What this skill covers

1. Transports: stdio (local) vs Streamable HTTP (remote), with a Streamable-HTTP-then-SSE fallback for legacy servers.
2. Connection lifecycle: `initialize` handshake, protocol-version negotiation, capability discovery, clean shutdown.
3. Primitives: tools (`tools/list`, `tools/call`), resources (`resources/list`, `resources/read`, templates, subscriptions), prompts (`prompts/list`, `prompts/get`), and client-provided capabilities (roots, sampling, elicitation).
4. Robustness: cursor pagination, progress notifications, cancellation, timeouts, JSON-RPC error codes, retries with backoff.
5. Auth: OAuth 2.1 (the spec's standard for remote HTTP servers) plus provider-specific bearer/API-key headers; token storage and least privilege.
6. Client configuration for Claude Desktop, Claude Code, Cursor, and OpenClaw (stdio + Streamable HTTP).
7. Cost, caching, and security best practices.

---
