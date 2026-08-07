---
name: mcp-client
description: "Consume MCP (Model Context Protocol) servers over stdio (local) or Streamable HTTP (remote): initialize handshake, call tools, read resources, get prompts, pagination/timeouts/errors, OAuth/bearer auth, plus Claude Desktop/Code, Cursor, OpenClaw config. Use when wiring an agent to an MCP server or debugging a transport/auth failure."
---
# MCP Client — Consuming Model Context Protocol Servers

> **Transport policy (MCP spec):** Use **stdio** for local subprocess servers and **Streamable HTTP** (`StreamableHTTPClientTransport`, endpoint usually `/mcp`) for remote servers. The old **HTTP+SSE** transport was deprecated in spec revision `2025-03-26` and superseded by Streamable HTTP; keep it only as a *legacy fallback* for old servers (endpoint usually `/sse`). WebSocket transport was removed. As of Jun 2026 the latest spec revision is `2025-11-25` — verify at https://modelcontextprotocol.io/specification.

This skill makes an agent expert at being an **MCP client**: discovering a server's capabilities, calling its tools, reading its resources, using its prompts, and doing so safely with auth, timeouts, retries, and cost control. It is provider-agnostic; one specific public server (`mcp.skills.ws`) appears only as an optional worked example at the end.

For building the *server* side, see the sibling skill `mcp-server-builder`. For agent orchestration around these tool calls, see `ai-agent-building`. For wallet/payment flows (x402), see `wallet-integration` and `defi-integration`.

## Reference guide

Read only the references needed for the current request:

- **What this skill covers**: [references/what-this-skill-covers.md](references/what-this-skill-covers.md)
- **1. Transports**: [references/1-transports.md](references/1-transports.md)
- **2. Programmatic client (official SDK)**: [references/2-programmatic-client-official-sdk.md](references/2-programmatic-client-official-sdk.md)
- **3. Using server capabilities**: [references/3-using-server-capabilities.md](references/3-using-server-capabilities.md)
- **4. Configuring AI clients**: [references/4-configuring-ai-clients.md](references/4-configuring-ai-clients.md)
- **5. Authentication**: [references/5-authentication.md](references/5-authentication.md)
- **6. Robustness patterns**: [references/6-robustness-patterns.md](references/6-robustness-patterns.md)
- **7. Cost control**: [references/7-cost-control.md](references/7-cost-control.md)
- **8. Pay-per-call (x402) — handle the challenge safely**: [references/8-pay-per-call-x402-handle-the-challenge-safely.md](references/8-pay-per-call-x402-handle-the-challenge-safely.md)
- **9. Optional worked example — `mcp.skills.ws`**: [references/9-optional-worked-example-mcp-skills-ws.md](references/9-optional-worked-example-mcp-skills-ws.md)
- **10. Troubleshooting**: [references/10-troubleshooting.md](references/10-troubleshooting.md)
- **Quick reference**: [references/quick-reference.md](references/quick-reference.md)
