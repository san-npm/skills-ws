---
name: mcp-server-builder
description: "Build production MCP servers: tool/resource/prompt schemas (Zod/Pydantic), Streamable HTTP + stdio (spec 2025-11-25, SSE legacy), OAuth 2.1 bearer auth, FastMCP (Python) and @modelcontextprotocol/sdk (TS), Stripe + x402 v2 monetization, deploy. Use when shipping, monetizing, or deploying an MCP server or wrapping a REST API as tools."
---
# MCP Server Builder — Production Skill

> **Pick the transport first.** **stdio** for local-process servers (Claude Desktop, CLI). **Streamable HTTP** for everything remote/shared/monetized — `StreamableHTTPServerTransport` in TS (`@modelcontextprotocol/sdk` v1.x), `FastMCP` in Python. The two standard transports are stdio and Streamable HTTP. The old **HTTP+SSE** transport (`/sse` + `/messages`) is **legacy/deprecated** (replaced in spec 2025-03-26, current spec **2025-11-25**); ship it only as a backward-compat appendix for old clients (see §2c).

> Build production-grade Model Context Protocol servers that wrap any REST API into AI-callable tools, with three-tier auth, monetization, and battle-tested deployment.

> **Related skills:** for the consuming side (connecting to / calling MCP servers) see `mcp-client`; for general agent architecture see `ai-agent-building`; for REST contract/versioning design see `api-design`; for the Stripe billing details behind §7 see `stripe-billing`; for the SSRF/secret-handling depth in §9 see `security-hardening`.

## Reference guide

Read only the references needed for the current request:

- **When to Use**: [references/when-to-use.md](references/when-to-use.md)
- **1. MCP Architecture Overview**: [references/1-mcp-architecture-overview.md](references/1-mcp-architecture-overview.md)
- **2. Server Setup — TypeScript (@modelcontextprotocol/sdk)**: [references/2-server-setup-typescript-modelcontextprotocol-sdk.md](references/2-server-setup-typescript-modelcontextprotocol-sdk.md)
- **3. Server Setup — Python (FastMCP, the `mcp` package)**: [references/3-server-setup-python-fastmcp-the-mcp-package.md](references/3-server-setup-python-fastmcp-the-mcp-package.md)
- **4. Tool Schema Design (JSON Schema)**: [references/4-tool-schema-design-json-schema.md](references/4-tool-schema-design-json-schema.md)
- **5. REST API to MCP Pattern**: [references/5-rest-api-to-mcp-pattern.md](references/5-rest-api-to-mcp-pattern.md)
- **6. Three-Tier Authentication**: [references/6-three-tier-authentication.md](references/6-three-tier-authentication.md)
- **7. Monetization Strategy**: [references/7-monetization-strategy.md](references/7-monetization-strategy.md)
- **8. Express.js Architecture**: [references/8-express-js-architecture.md](references/8-express-js-architecture.md)
- **9. Security**: [references/9-security.md](references/9-security.md)
- **10. Monitoring & Logging**: [references/10-monitoring-logging.md](references/10-monitoring-logging.md)
- **11. Deployment**: [references/11-deployment.md](references/11-deployment.md)
- **12. Testing with Claude Desktop & Claude Code**: [references/12-testing-with-claude-desktop-claude-code.md](references/12-testing-with-claude-desktop-claude-code.md)
- **13. Listing on mcpservers.org**: [references/13-listing-on-mcpservers-org.md](references/13-listing-on-mcpservers-org.md)
- **Tools**: [references/tools.md](references/tools.md)
- **Quick Start**: [references/quick-start.md](references/quick-start.md)
- **14. Environment Variables Reference**: [references/14-environment-variables-reference.md](references/14-environment-variables-reference.md)
- **15. Common Patterns & Gotchas**: [references/15-common-patterns-gotchas.md](references/15-common-patterns-gotchas.md)
- **16. Complete Production Checklist**: [references/16-complete-production-checklist.md](references/16-complete-production-checklist.md)
- **Appendix A: Graceful Shutdown**: [references/appendix-a-graceful-shutdown.md](references/appendix-a-graceful-shutdown.md)
- **Appendix B: Redis Rate Limiter (Production)**: [references/appendix-b-redis-rate-limiter-production.md](references/appendix-b-redis-rate-limiter-production.md)
- **Appendix C: Tool Registration Helper**: [references/appendix-c-tool-registration-helper.md](references/appendix-c-tool-registration-helper.md)
