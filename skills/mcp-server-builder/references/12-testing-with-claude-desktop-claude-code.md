## Contents

- 12. Testing with Claude Desktop & Claude Code
- Claude Desktop Configuration
- Claude Code Configuration
- Testing Checklist

## 12. Testing with Claude Desktop & Claude Code

### Claude Desktop Configuration

```json
// ~/Library/Application Support/Claude/claude_desktop_config.json (macOS)
// %APPDATA%\Claude\claude_desktop_config.json (Windows)
{
  "mcpServers": {
    "my-mcp-server-local": {
      "command": "node",
      "args": ["/path/to/my-mcp-server/dist/index.js"],
      "env": {
        "SCREENSHOT_API_KEY": "your-key",
        "OCR_API_KEY": "your-key"
      }
    },
    "my-mcp-server-remote": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.yourdomain.com/mcp"],
      "env": {}
    }
  }
}
```

### Claude Code Configuration

```json
// .mcp.json in project root
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "node",
      "args": ["./dist/index.js"],
      "env": {
        "SCREENSHOT_API_KEY": "your-key"
      }
    }
  }
}
```

### Testing Checklist

`protocolVersion` is a dated string negotiated at `initialize`. Use a **current** value — as of Jun 2026 the spec revision is **`2025-11-25`** (prior: `2025-06-18`, `2025-03-26`); the server echoes the highest it supports. The old `2024-11-05` is the pre-Streamable-HTTP value — don't hardcode it for new servers. Verify the latest at https://modelcontextprotocol.io/specification.

```bash
# 1. Test the stdio server directly (one-shot initialize)
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | node dist/index.js

# 2. Test the Streamable HTTP server (the default remote transport) — start it first:
node dist/http-server.js   # serves http://localhost:3100/mcp

# 2a. initialize — clients MUST send BOTH Accept types; capture the Mcp-Session-Id from headers.
#     (-D - dumps response headers so you can read Mcp-Session-Id back out.)
curl -sD - http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}'

# 2b. tools/list on that session (reuse the header value from 2a)
#     Clients MUST send MCP-Protocol-Version on every request after initialize;
#     servers assume 2025-03-26 when the header is absent.
SID="<paste Mcp-Session-Id>"
curl -s http://localhost:3100/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "MCP-Protocol-Version: 2025-11-25" \
  -H "Mcp-Session-Id: $SID" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

# 2c. DELETE to terminate the session
curl -s -X DELETE http://localhost:3100/mcp -H "MCP-Protocol-Version: 2025-11-25" -H "Mcp-Session-Id: $SID"

# 3. Test rate limiting (free tier) — repeated initialize calls should trip 429
for i in $(seq 1 15); do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/mcp \
    -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
    -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}'
done
# Should see 429 after the free-tier per-minute limit (default 10)

# 4. Test with an API key (pro tier — should NOT 429 at the free-tier limit)
curl -s http://localhost:3100/mcp -H "X-API-Key: your-test-key" \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}'

# 5. Test the x402 challenge (paid tier): no payment header ⇒ 402 + PAYMENT-REQUIRED (base64 JSON)
curl -sD - -o /dev/null http://localhost:3100/mcp -H "Accept-Payment: x402" \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-11-25","capabilities":{},"clientInfo":{"name":"t","version":"1"}}}' \
  | grep -i '^payment-required:'

# 6. Health endpoint
curl http://localhost:3100/health

# 7. MCP Inspector — interactive testing of either transport
npx @modelcontextprotocol/inspector node dist/index.js        # stdio
npx @modelcontextprotocol/inspector                            # then point the UI at http://localhost:3100/mcp

# 8. Legacy HTTP+SSE clients ONLY (if you also host the §2c backward-compat /sse endpoint):
#   curl -N http://localhost:3100/sse                          # open stream, note the sessionId
#   curl -X POST "http://localhost:3100/messages?sessionId=SESSION_ID" \
#     -H "Content-Type: application/json" \
#     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

---
