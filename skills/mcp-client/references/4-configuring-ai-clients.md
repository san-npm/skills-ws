## Contents

- 4. Configuring AI clients
- 4.1 Claude Desktop
- 4.2 Claude Code
- 4.3 Cursor
- 4.4 OpenClaw

## 4. Configuring AI clients

Below: **local (stdio)** and **remote (Streamable HTTP)** for each client. Auth on remote servers is provider-specific — use OAuth (the client opens a browser flow) where the server supports it, or inject a bearer/API-key header. CLIs and config schemas change; verify against each tool's current docs (links inline).

### 4.1 Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows). Claude Desktop primarily launches **stdio** servers:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me/projects"]
    },
    "my-remote": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://api.example.com/mcp", "--header", "Authorization: Bearer ${MCP_TOKEN}"],
      "env": { "MCP_TOKEN": "..." }
    }
  }
}
```

> Native remote (Streamable HTTP / OAuth) support in Claude Desktop has shipped via Connectors/Settings rather than this JSON file; for a remote URL without native support, bridge it with the `mcp-remote` stdio adapter as above. Verify current options at https://modelcontextprotocol.io/docs/develop/connect-local-servers (as of Jun 2026).

### 4.2 Claude Code

```bash
# Local stdio server
claude mcp add filesystem -- npx -y @modelcontextprotocol/server-filesystem ~/projects

# Remote Streamable HTTP server (preferred for URLs)
claude mcp add --transport http my-remote https://api.example.com/mcp \
  --header "Authorization: Bearer ${MCP_TOKEN}"

# Legacy SSE server (only if it doesn't support Streamable HTTP)
claude mcp add --transport sse old-remote https://legacy.example.com/sse

# Manage
claude mcp list
claude mcp get my-remote
claude mcp remove my-remote
```

Equivalent `.mcp.json` (project-scoped, commit-safe if it contains no secrets):

```json
{
  "mcpServers": {
    "my-remote": {
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": { "Authorization": "Bearer ${MCP_TOKEN}" }
    },
    "old-remote": { "type": "sse", "url": "https://legacy.example.com/sse" }
  }
}
```

Use `"type": "http"` for Streamable HTTP. Keep `"type": "sse"` only for legacy servers. Reference: https://code.claude.com/docs/en/mcp (verify flags/keys for your version).

### 4.3 Cursor

`~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project):

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me/projects"]
    },
    "my-remote": {
      "url": "https://api.example.com/mcp",
      "headers": { "Authorization": "Bearer ${MCP_TOKEN}" }
    }
  }
}
```

A `url` entry is treated as remote (Streamable HTTP, SSE as fallback). Cursor also supports OAuth login for servers that advertise it. Docs: https://docs.cursor.com/context/mcp (verify, as of Jun 2026).

### 4.4 OpenClaw

`openclaw.json`:

```json
{
  "mcp": {
    "servers": {
      "filesystem": {
        "transport": "stdio",
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/me/projects"]
      },
      "my-remote": {
        "transport": "http",
        "url": "https://api.example.com/mcp",
        "headers": { "Authorization": "Bearer ${MCP_TOKEN}" }
      },
      "old-remote": {
        "transport": "sse",
        "url": "https://legacy.example.com/sse"
      }
    }
  }
}
```

Prefer `"transport": "http"` (Streamable HTTP); reserve `"sse"` for legacy servers. Confirm exact keys against the OpenClaw version you run.

**Secrets in configs:** reference env vars (`${MCP_TOKEN}`) rather than pasting tokens; keep any file that contains a literal secret out of git.

---
