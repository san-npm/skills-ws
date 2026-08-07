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
