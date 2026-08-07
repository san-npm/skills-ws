## Contents

- 11. Deployment
- systemd + cloudflared Tunnel
- Docker
- Vercel Edge Proxy Pattern

## 11. Deployment

### systemd + cloudflared Tunnel

```bash
# 1. Build
cd /opt/my-mcp-server
npm ci && npm run build

# 2. systemd service
sudo tee /etc/systemd/system/mcp-server.service << 'EOF'
[Unit]
Description=MCP Server
After=network.target

[Service]
Type=simple
User=mcp
WorkingDirectory=/opt/my-mcp-server
ExecStart=/usr/bin/node dist/http-server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3100
EnvironmentFile=/opt/my-mcp-server/.env

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/my-mcp-server/logs
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now mcp-server

# 3. cloudflared tunnel
cloudflared tunnel create mcp-server
cloudflared tunnel route dns mcp-server mcp.yourdomain.com

# cloudflared config
sudo tee /etc/cloudflared/config.yml << 'EOF'
tunnel: YOUR_TUNNEL_ID
credentials-file: /root/.cloudflared/YOUR_TUNNEL_ID.json

ingress:
  - hostname: mcp.yourdomain.com
    service: http://localhost:3100
  - service: http_status:404
EOF

sudo tee /etc/systemd/system/cloudflared-tunnel.service << 'EOF'
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/cloudflared tunnel --config /etc/cloudflared/config.yml run
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable --now cloudflared-tunnel
```

### Docker

```dockerfile
# Dockerfile
FROM node:22-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src/ src/
RUN npm run build

FROM node:22-slim
WORKDIR /app
RUN addgroup --system mcp && adduser --system --ingroup mcp mcp
COPY --from=builder /app/dist dist/
COPY --from=builder /app/node_modules node_modules/
COPY package.json ./
USER mcp
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3100/health || exit 1
CMD ["node", "dist/http-server.js"]
```

```yaml
# docker-compose.yml
services:
  mcp-server:
    build: .
    ports:
      - "3100:3100"
    env_file: .env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3100/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.0"
```

### Vercel Edge Proxy Pattern

For remote (Streamable HTTP) servers, Vercel can act as an edge auth proxy:

```typescript
// vercel-proxy/api/mcp.ts
// NOTE: Vercel doesn't support long-lived SSE streams natively.
// Use Vercel as an auth proxy that FORWARDS to your actual MCP server.
// Do NOT redirect with the token in a query string: the MCP authorization spec
// forbids access tokens in the URI, and query strings leak into CDN/proxy logs.
// Pass the token in the Authorization header instead.

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const apiKey = req.headers["x-api-key"] as string;
  if (!apiKey) {
    return res.status(401).json({ error: "API key required" });
  }

  // Verify key against your DB (Vercel KV, Upstash Redis, etc.)
  const valid = await verifyKeyAtEdge(apiKey);
  if (!valid) return res.status(401).json({ error: "Invalid API key" });

  // Proxy to the actual MCP server with a short-lived token in the Authorization header
  const token = generateShortLivedToken(apiKey);
  const upstream = await fetch("https://mcp.yourdomain.com/mcp", {
    method: req.method,
    headers: {
      "Content-Type": (req.headers["content-type"] as string) || "application/json",
      Accept: "application/json, text/event-stream",
      Authorization: `Bearer ${token}`,
      ...(req.headers["mcp-session-id"] ? { "Mcp-Session-Id": req.headers["mcp-session-id"] as string } : {}),
    },
    body: req.method === "POST" ? JSON.stringify(req.body) : undefined,
  });
  const sid = upstream.headers.get("mcp-session-id");
  if (sid) res.setHeader("Mcp-Session-Id", sid);
  res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
}
```

---
