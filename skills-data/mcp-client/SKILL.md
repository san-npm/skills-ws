---
name: mcp-client
description: Consume MCP services — connect AI agents to external tools for screenshots, DNS, WHOIS, SSL, OCR, and blockchain queries with three-tier authentication
version: 1.0.0
---

# MCP Client — Consuming Model Context Protocol Services

> Connect AI agents to external MCP services for web intelligence, blockchain data, document processing, and more. Production patterns for authentication, payments, and multi-tool workflows.

## Overview

MCP (Model Context Protocol) lets AI agents call external tools through a standardized interface. Instead of building every capability from scratch, agents connect to MCP services that provide specialized tools — screenshots, DNS lookups, blockchain queries, OCR, and more.

This skill teaches you to:
1. Connect to MCP services via SSE or stdio transport
2. Authenticate across three tiers: free, API key, and x402 micropayments
3. Build multi-tool workflows combining several MCP tools
4. Handle errors, retries, and cost optimization
5. Configure popular AI clients (Claude Desktop, Claude Code, Cursor)

## Why External MCP Services?

**Build vs. consume decision matrix:**

| Factor | Build Your Own | Use MCP Service |
|--------|---------------|-----------------|
| Time to value | Days–weeks | Minutes |
| Infrastructure | Your servers, your ops | Managed |
| Cost at low volume | High (fixed costs) | Free tier available |
| Cost at high volume | Lower marginal | Pay-per-call |
| Customization | Full control | Limited to API |
| Reliability | Your SLA | Provider's SLA |

**When to consume:** You need web screenshots, DNS/WHOIS lookups, SSL checks, OCR, or blockchain data. These are commodity capabilities — don't rebuild them.

**When to build:** You need proprietary data access, custom business logic, or sub-millisecond latency.

---

## Connecting to MCP Services

### Transport Types

**SSE (Server-Sent Events)** — HTTP-based, works across networks:
```
Endpoint: https://mcp.skills.ws/mcp/sse
Protocol: HTTP GET (SSE stream) + HTTP POST (tool calls)
```

**stdio** — Local process, used for CLI tools:
```
Command: npx @mcp/some-local-server
Protocol: JSON-RPC over stdin/stdout
```

For remote services, SSE is the standard transport.

### Health Check

Always verify a service is up before configuring:

```bash
curl -s https://mcp.skills.ws/health
# {"status":"ok","services":["screenshot","whois","blockchain"]}
```

---

## Available Tools — mcp.skills.ws

A production MCP service providing web intelligence and blockchain tools.

### Screenshot — Capture Any Webpage

```bash
# Response is JSON with base64 image — extract and decode to get the PNG
curl -s "https://mcp.skills.ws/api/screenshot?url=https://example.com" \
  | jq -r '.image' | sed 's|data:image/png;base64,||' | base64 -d > screenshot.png
```

Parameters:
- `url` (required) — URL to capture
- `width` — Viewport width (default: 1280)
- `height` — Viewport height (default: 800)
- `fullPage` — Capture full scrollable page (default: false)
- `format` — `png` or `jpeg` (default: png)

### WHOIS — Domain Registration Data

```bash
curl -s "https://mcp.skills.ws/api/whois?domain=example.com"
```

Returns: registrar, creation/expiry dates, nameservers, registrant info (when available).

### DNS — Record Lookups

```bash
curl -s "https://mcp.skills.ws/api/dns?domain=example.com&type=A"
```

Parameters:
- `domain` (required)
- `type` — `A`, `AAAA`, `MX`, `NS`, `TXT`, `CNAME`, `SOA` (default: A)

### SSL — Certificate Analysis

```bash
curl -s "https://mcp.skills.ws/api/ssl?domain=example.com"
```

Returns: issuer, validity dates, SANs, certificate chain, protocol support.

### OCR — Extract Text from Images

```bash
curl -s "https://mcp.skills.ws/api/ocr?url=https://example.com/receipt.png"
```

### Blockchain — On-Chain Queries

```bash
# Native token balance
curl -s "https://mcp.skills.ws/api/chain/balance?address=0x...&chain=celo"

# ERC20 token balance
curl -s "https://mcp.skills.ws/api/chain/erc20?address=0x...&token=0xTOKEN_ADDRESS&chain=base"

# Transaction details
curl -s "https://mcp.skills.ws/api/chain/tx?hash=0x...&chain=ethereum"
```

Supported chains: Ethereum, Base, Arbitrum, Optimism, Polygon, Celo.

---

## Authentication Tiers

### Tier 1: Free (No Auth Required)

10 API calls per day per IP address. No signup needed.

```bash
# Just call it — no headers required
curl -s "https://mcp.skills.ws/api/dns?domain=example.com"
```

Rate limit headers in response:
```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 7
```

When exhausted:
```json
{
  "error": "Daily free limit reached",
  "limit": 10,
  "upgrade": {
    "stripe": "POST /billing/checkout for unlimited API key ($9/mo)",
    "x402": {
      "price": 0.005,
      "currency": "USD",
      "receiver": "0x087ae921CE8d07a4dE6BdacAceD475e9080B2aDF",
      "networks": ["base", "celo"],
      "accepts": ["USDC", "USDT"]
    }
  }
}
```

### Tier 2: API Key ($9/month)

Unlimited calls with a subscription API key.

**Get a key:**
```bash
# Create checkout session
curl -s -X POST "https://mcp.skills.ws/billing/checkout" | jq .url
# Opens Stripe checkout → pay → receive API key
```

**Use the key:**
```bash
curl -s "https://mcp.skills.ws/api/whois?domain=example.com" \
  -H "X-Api-Key: mcp_your_key_here"
```

### Tier 3: x402 Pay-Per-Call ($0.005/call)

Pay with stablecoins per request — no subscription needed. Ideal for AI agents with crypto wallets.

**Supported:**
- Networks: Base, Celo
- Tokens: USDC, USDT
- Price: $0.005 per call
- Receiver: `0x087ae921CE8d07a4dE6BdacAceD475e9080B2aDF`

**Payment header format:**

```javascript
const payment = {
  network: "base",           // "base" or "celo"
  token: "USDC",             // "USDC" or "USDT"
  txHash: "0xabc123...",     // Transaction hash proving payment
  amount: "0.005",           // USD amount (must be >= 0.005)
  receiver: "0x087ae921CE8d07a4dE6BdacAceD475e9080B2aDF"
};

const header = Buffer.from(JSON.stringify(payment)).toString('base64');
```

**Making a paid call:**

```bash
# After sending $0.005 USDC to the receiver address:
PAYMENT=$(echo -n '{"network":"base","token":"USDC","txHash":"0xYOUR_TX_HASH","amount":"0.005","receiver":"0x087ae921CE8d07a4dE6BdacAceD475e9080B2aDF"}' | base64)

curl -s "https://mcp.skills.ws/api/dns?domain=example.com" \
  -H "X-Payment: $PAYMENT"
```

**x402 flow in JavaScript:**

```javascript
import { encodeFunctionData, parseUnits } from 'viem';
import { base } from 'viem/chains';

const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const RECEIVER = '0x087ae921CE8d07a4dE6BdacAceD475e9080B2aDF';
const PRICE = parseUnits('0.005', 6); // USDC has 6 decimals

// 1. Send USDC payment
const txHash = await walletClient.sendTransaction({
  to: USDC_BASE,
  data: encodeFunctionData({
    abi: [{
      name: 'transfer',
      type: 'function',
      inputs: [
        { name: 'to', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ],
      outputs: [{ type: 'bool' }]
    }],
    args: [RECEIVER, PRICE]
  }),
  chain: base
});

// 2. Build payment proof
const payment = Buffer.from(JSON.stringify({
  network: 'base',
  token: 'USDC',
  txHash,
  amount: '0.005',
  receiver: RECEIVER
})).toString('base64');

// 3. Make authenticated API call
const res = await fetch('https://mcp.skills.ws/api/screenshot?url=https://example.com', {
  headers: { 'X-Payment': payment }
});
```

**x402 flow in Python:**

```python
import base64, json, requests

payment = {
    "network": "base",
    "token": "USDC",
    "txHash": "0xYOUR_TX_HASH",
    "amount": "0.005",
    "receiver": "0x087ae921CE8d07a4dE6BdacAceD475e9080B2aDF"
}

header = base64.b64encode(json.dumps(payment).encode()).decode()

response = requests.get(
    "https://mcp.skills.ws/api/dns",
    params={"domain": "example.com"},
    headers={"X-Payment": header}
)
print(response.json())
```

---

## Client Configuration

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "skills-ws": {
      "url": "https://mcp.skills.ws/mcp/sse",
      "headers": {
        "X-Api-Key": "mcp_your_key_here"
      }
    }
  }
}
```

For free tier (no key needed):
```json
{
  "mcpServers": {
    "skills-ws": {
      "url": "https://mcp.skills.ws/mcp/sse"
    }
  }
}
```

### Claude Code

```bash
# Add as MCP server
claude mcp add skills-ws https://mcp.skills.ws/mcp/sse

# With API key
claude mcp add skills-ws https://mcp.skills.ws/mcp/sse --header "X-Api-Key: mcp_your_key_here"
```

Or in `.claude/settings.json`:
```json
{
  "mcpServers": {
    "skills-ws": {
      "type": "sse",
      "url": "https://mcp.skills.ws/mcp/sse",
      "headers": {
        "X-Api-Key": "mcp_your_key_here"
      }
    }
  }
}
```

### Cursor

In Cursor settings → MCP Servers:
```json
{
  "skills-ws": {
    "url": "https://mcp.skills.ws/mcp/sse",
    "headers": {
      "X-Api-Key": "mcp_your_key_here"
    }
  }
}
```

### OpenClaw

In `openclaw.json`:
```json
{
  "mcp": {
    "servers": {
      "skills-ws": {
        "transport": "sse",
        "url": "https://mcp.skills.ws/mcp/sse",
        "headers": {
          "X-Api-Key": "mcp_your_key_here"
        }
      }
    }
  }
}
```

---

## Error Handling

### HTTP Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Process response |
| 400 | Bad request | Fix parameters |
| 401 | Invalid API key | Check/regenerate key |
| 402 | Payment required | x402 payment invalid or insufficient |
| 429 | Rate limited | Wait or upgrade tier |
| 500 | Server error | Retry with backoff |
| 503 | Service unavailable | Retry later |

### Retry Pattern (JavaScript)

```javascript
async function mcpCall(url, headers = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, { headers });
      
      if (res.status === 429) {
        const waitMs = Math.min(1000 * Math.pow(2, i), 30000);
        console.log(`Rate limited. Waiting ${waitMs}ms...`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      
      if (res.status === 402) {
        const body = await res.json();
        console.log('Payment required:', body.x402);
        throw new Error('x402 payment needed');
      }
      
      if (res.status === 401) {
        throw new Error('Invalid API key');
      }
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }
      
      return await res.json();
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}

// Usage
const dns = await mcpCall(
  'https://mcp.skills.ws/api/dns?domain=example.com',
  { 'X-Api-Key': 'mcp_your_key_here' }
);
```

### Retry Pattern (Python)

```python
import time
import requests

def mcp_call(url, headers=None, max_retries=3):
    for i in range(max_retries):
        try:
            res = requests.get(url, headers=headers or {}, timeout=30)
            
            if res.status_code == 429:
                wait = min(2 ** i, 30)
                print(f"Rate limited. Waiting {wait}s...")
                time.sleep(wait)
                continue
            
            if res.status_code == 402:
                print("Payment required:", res.json().get("x402"))
                raise Exception("x402 payment needed")
            
            if res.status_code == 401:
                raise Exception("Invalid API key")
            
            res.raise_for_status()
            return res.json()
        except requests.exceptions.RequestException as e:
            if i == max_retries - 1:
                raise
            time.sleep(2 ** i)

# Usage
dns = mcp_call(
    "https://mcp.skills.ws/api/dns?domain=example.com",
    headers={"X-Api-Key": "mcp_your_key_here"}
)
```

---

## Multi-Tool Workflows

### Website Audit (DNS + SSL + Screenshot)

```javascript
async function auditWebsite(domain, apiKey) {
  const headers = { 'X-Api-Key': apiKey };
  const base = 'https://mcp.skills.ws/api';
  
  const [dns, ssl, whois] = await Promise.all([
    mcpCall(`${base}/dns?domain=${domain}&type=A`, headers),
    mcpCall(`${base}/ssl?domain=${domain}`, headers),
    mcpCall(`${base}/whois?domain=${domain}`, headers),
  ]);
  
  // Take screenshot after DNS resolves
  const screenshot = await fetch(
    `${base}/screenshot?url=https://${domain}&fullPage=true`,
    { headers }
  );
  
  return {
    domain,
    dns: dns.records,
    ssl: {
      issuer: ssl.certificate.issuer,
      validUntil: ssl.certificate.validUntil,
      daysRemaining: ssl.certificate.daysUntilExpiry,
    },
    whois: {
      registrar: whois.whois?.registrar,
      expires: whois.whois?.expiryDate,  // field names vary by registrar/TLD
    },
    screenshot: await screenshot.arrayBuffer(),
  };
}
```

### Receipt Processing (Screenshot + OCR)

```javascript
async function processReceipt(imageUrl, apiKey) {
  const headers = { 'X-Api-Key': apiKey };

  // Extract text from receipt image
  const ocr = await fetch(
    `https://mcp.skills.ws/api/ocr?url=${encodeURIComponent(imageUrl)}`,
    { headers }
  );

  const { text } = await ocr.json();

  // Parse extracted text for amounts, dates, vendor
  return {
    rawText: text,
    // Further parsing with regex or LLM
  };
}
```

### Domain Portfolio Monitor

```javascript
async function monitorDomains(domains, apiKey) {
  const headers = { 'X-Api-Key': apiKey };
  const base = 'https://mcp.skills.ws/api';
  const alerts = [];
  
  for (const domain of domains) {
    const [ssl, whois] = await Promise.all([
      mcpCall(`${base}/ssl?domain=${domain}`, headers),
      mcpCall(`${base}/whois?domain=${domain}`, headers),
    ]);
    
    // Alert if SSL expires within 30 days
    if (ssl.certificate.daysUntilExpiry < 30) {
      alerts.push({
        domain,
        type: 'ssl_expiry',
        message: `SSL expires in ${ssl.certificate.daysUntilExpiry} days`,
      });
    }

    // Alert if domain expires within 60 days (field names vary by registrar)
    const domainDays = Math.floor(
      (new Date(whois.whois?.expiryDate) - Date.now()) / 86400000
    );
    if (domainDays < 60) {
      alerts.push({
        domain,
        type: 'domain_expiry',
        message: `Domain expires in ${domainDays} days`,
      });
    }
  }
  
  return alerts;
}
```

### Blockchain Wallet Dashboard

```javascript
async function walletDashboard(address, chains, apiKey) {
  const headers = { 'X-Api-Key': apiKey };
  const base = 'https://mcp.skills.ws/api/chain';

  const balances = await Promise.all(
    chains.map(chain =>
      mcpCall(`${base}/balance?address=${address}&chain=${chain}`, headers)
        .then(data => ({ chain, ...data }))
    )
  );

  return {
    address,
    balances,
  };
}
```

---

## Best Practices

### Caching

Cache responses for data that doesn't change frequently:

```javascript
const cache = new Map();
const CACHE_TTL = {
  dns: 300000,      // 5 minutes
  whois: 86400000,  // 24 hours
  ssl: 3600000,     // 1 hour
  screenshot: 60000, // 1 minute
};

async function cachedMcpCall(tool, params, headers) {
  const key = `${tool}:${JSON.stringify(params)}`;
  const cached = cache.get(key);
  
  if (cached && Date.now() - cached.time < (CACHE_TTL[tool] || 60000)) {
    return cached.data;
  }
  
  const query = new URLSearchParams(params).toString();
  const data = await mcpCall(
    `https://mcp.skills.ws/api/${tool}?${query}`,
    headers
  );
  
  cache.set(key, { data, time: Date.now() });
  return data;
}
```

### Cost Optimization

1. **Start with free tier** — 10 calls/day is enough for development
2. **Cache aggressively** — DNS and WHOIS data rarely changes
3. **Batch related calls** — Use `Promise.all()` for parallel requests
4. **Use API key for production** — $9/mo is cheaper than x402 at 1800+ calls/month
5. **Use x402 for burst traffic** — Pay only for what you use, no commitment

**Break-even calculation:**
- API key: $9/mo = unlimited calls
- x402: $0.005/call × 1,800 calls = $9
- If you make >1,800 calls/month → API key is cheaper
- If you make <1,800 calls/month → x402 is cheaper

### Security

1. **Never expose API keys in client-side code** — Use server-side proxies
2. **Rotate keys periodically** — Use `POST /admin/keys` (requires admin secret) to generate a new key, then `POST /admin/revoke` to revoke the old one
3. **Monitor usage** — Track calls per key to detect abuse
4. **Validate responses** — Don't trust MCP responses blindly in security-critical flows

### Fallback Patterns

```javascript
async function resilientDnsLookup(domain) {
  try {
    // Primary: MCP service
    return await mcpCall(
      `https://mcp.skills.ws/api/dns?domain=${domain}`,
      { 'X-Api-Key': API_KEY }
    );
  } catch (err) {
    // Fallback: local dig command
    const { execSync } = await import('child_process');
    const result = execSync(`dig +short ${domain} A`).toString().trim();
    return { records: result.split('\n').filter(Boolean) };
  }
}
```

---

## Programmatic MCP Client (SDK)

For building agents that dynamically discover and call MCP tools:

```javascript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';

// Connect to MCP service
const transport = new SSEClientTransport(
  new URL('https://mcp.skills.ws/mcp/sse'),
  {
    requestInit: {
      headers: { 'X-Api-Key': 'mcp_your_key_here' }
    }
  }
);

const client = new Client({ name: 'my-agent', version: '1.0.0' });
await client.connect(transport);

// Discover available tools
const { tools } = await client.listTools();
console.log('Available tools:', tools.map(t => t.name));

// Call a tool
const result = await client.callTool({
  name: 'dns',
  arguments: { domain: 'example.com', type: 'MX' }
});
console.log('DNS result:', result.content[0].text);

// Cleanup
await client.close();
```

### Python MCP Client

```python
from mcp import ClientSession
from mcp.client.sse import sse_client

async def main():
    headers = {"X-Api-Key": "mcp_your_key_here"}
    
    async with sse_client("https://mcp.skills.ws/mcp/sse", headers=headers) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            
            # List tools
            tools = await session.list_tools()
            for tool in tools.tools:
                print(f"  {tool.name}: {tool.description}")
            
            # Call a tool
            result = await session.call_tool("whois", {"domain": "example.com"})
            print(result)

import asyncio
asyncio.run(main())
```

---

## Monitoring Your Usage

### Check Current Status

```bash
# Free tier — check remaining calls via response headers
curl -sI "https://mcp.skills.ws/api/dns?domain=test.com" | grep RateLimit
# X-RateLimit-Limit: 10
# X-RateLimit-Remaining: 6
```

### Admin Stats (if you have admin access)

```bash
curl -s "https://mcp.skills.ws/admin/stats" \
  -H "X-Admin-Secret: your_admin_secret" | jq .
```

Returns:
```json
{
  "freeUsers": 42,
  "totalFreeRequests": 156,
  "keys": { "total": 5, "active": 4, "revoked": 1 },
  "requests": { "free": 156, "apikey": 1203, "x402": 47, "blocked": 12 },
  "freeLimit": 10,
  "x402Price": 0.005
}
```

---

## Common Issues

### "Daily free limit reached" (429)
Upgrade to API key ($9/mo) or use x402 pay-per-call.

### "Invalid API key" (401)
Key may have been revoked (subscription cancelled). Generate a new one via `/billing/checkout`.

### "Payment required" (402)
x402 payment header is malformed, amount is too low, or txHash was already used (replay prevention).

### SSE connection drops
Reconnect with exponential backoff. SSE connections may timeout after extended idle periods.

### Slow responses
Screenshots take 3-10s depending on page complexity. DNS/WHOIS/SSL are typically <1s. Use timeouts appropriately.

---

## Quick Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/health` | GET | None | Service status |
| `/mcp/sse` | GET | Optional | MCP SSE transport |
| `/api/screenshot` | GET | Any tier | Webpage capture |
| `/api/pdf` | GET | Any tier | PDF generation |
| `/api/html2md` | GET | Any tier | URL to Markdown |
| `/api/whois` | GET | Any tier | Domain WHOIS |
| `/api/dns` | GET | Any tier | DNS records |
| `/api/ssl` | GET | Any tier | SSL certificate |
| `/api/ocr` | GET | Any tier | Image text extraction |
| `/api/chain/balance` | GET | Any tier | Native token balance |
| `/api/chain/erc20` | GET | Any tier | ERC20 token balance |
| `/api/chain/tx` | GET | Any tier | Transaction details |
| `/billing/checkout` | POST | None | Get API key ($9/mo) |
| `/billing/success` | GET | None | Retrieve key after payment |

**Default service endpoint:** `https://mcp.skills.ws`

