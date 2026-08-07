## Contents

- Quick Start
- Claude Desktop
- Remote (Streamable HTTP)
- Pricing
- Publishing to npm

## Quick Start

### Claude Desktop
```json
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["-y", "my-mcp-server"],
      "env": { "API_KEY": "your-key" }
    }
  }
}
```

### Remote (Streamable HTTP)
Endpoint: `https://mcp.yourdomain.com/mcp`

### Pricing
- Free: 10 req/min, 100/day
- Pro ($9/mo): 100 req/min, 10k/day
- Pay-per-use: $0.005/call via x402
````

### Publishing to npm

```json
// package.json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "description": "MCP server for screenshots, DNS, WHOIS, SSL, and more",
  "bin": { "my-mcp-server": "dist/index.js" },
  "files": ["dist"],
  "keywords": ["mcp", "model-context-protocol", "ai-tools"],
  "license": "MIT"
}
```

```bash
npm run build
npm publish
```

Submit to https://mcpservers.org with your npm package name, category, and tool list.

---
