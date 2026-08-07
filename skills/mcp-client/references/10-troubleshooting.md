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
