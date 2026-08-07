## 16. Complete Production Checklist

Before shipping your MCP server:

- [ ] **All tool inputs validated** with Zod schemas (SSRF protection on URLs)
- [ ] **Error handling** — every tool returns graceful errors, never throws unhandled
- [ ] **Rate limiting** — free tier IP limits, pro tier key limits
- [ ] **Auth** — constant-time key comparison, x402 payment verification
- [ ] **Webhook signature verification** — Stripe, GitHub, etc.
- [ ] **Raw body middleware** before `express.json()` for webhook routes
- [ ] **CORS configured** — specific origins in production, not `*`
- [ ] **Health endpoint** at `/health` for monitoring
- [ ] **Structured logging** — JSON logs with tier, tool, duration, errors
- [ ] **No secrets in error messages** — upstream API keys never exposed
- [ ] **stdio server uses stderr** for debug output, not stdout
- [ ] **SSE heartbeat** — detect dead connections
- [ ] **Graceful shutdown** — clean up SSE connections on SIGTERM
- [ ] **Docker image** — non-root user, health check, resource limits
- [ ] **systemd service** — auto-restart, security hardening directives
- [ ] **cloudflared tunnel** — HTTPS without port forwarding
- [ ] **Tested with Claude Desktop** — stdio transport works
- [ ] **Tested with MCP Inspector** — all tools respond correctly
- [ ] **Published to npm** — `npx my-server` works
- [ ] **Listed on mcpservers.org** — discoverable by the community
- [ ] **README** — clear setup, tool docs, pricing info

---
