## 9. Optional worked example — `mcp.skills.ws`

A public MCP/HTTP service for web-intelligence and onchain reads (screenshots, WHOIS, DNS, SSL, OCR, balances). Shown only to make the generic patterns above concrete. **All prices, quotas, supported chains, and receiver addresses below are commercial facts that drift — treat them as illustrative and confirm live values from the service's own responses/pricing page before relying on them.**

**Connect (Streamable HTTP, preferred):**

```bash
# Health
curl -s https://mcp.skills.ws/health
```

```bash
# Claude Code, as a remote Streamable HTTP MCP server
claude mcp add --transport http skills-ws https://mcp.skills.ws/mcp \
  --header "X-Api-Key: ${SKILLS_WS_KEY}"
```

```typescript
// SDK
const transport = new StreamableHTTPClientTransport(
  new URL('https://mcp.skills.ws/mcp'),
  { requestInit: { headers: new Headers({ 'X-Api-Key': process.env.SKILLS_WS_KEY ?? '' }) } }
);
const client = new Client({ name: 'my-agent', version: '1.0.0' });
await client.connect(transport);
const { tools } = await client.listTools();
const r = await client.callTool({ name: 'dns', arguments: { domain: 'example.com', type: 'MX' } });
```

**Auth tiers (illustrative — verify current values):**
- *Free*: small per-IP daily quota, no signup; watch `X-RateLimit-Remaining` and back off on `429`.
- *API key (subscription)*: send `X-Api-Key: <key>`; obtain via the service's billing checkout. Read the *current* price from the upgrade prompt in a `402`/`429` body, not from this doc.
- *x402 pay-per-call*: handle the `402` challenge per §8 — read the price/token/network/receiver from the live challenge; do **not** hardcode them.

**Example tools (parameters as advertised by `tools/list`):** `screenshot` (`url`,`width`,`height`,`fullPage`,`format`), `whois` (`domain`), `dns` (`domain`,`type`), `ssl` (`domain`), `ocr` (`url`), `chain.balance`/`chain.erc20`/`chain.tx` (`address`/`token`/`hash` + `chain`). Always trust the server's `inputSchema` from `tools/list` over any list here.

**Worked multi-tool flow — website audit (via the SDK, parallel):**

```typescript
async function auditWebsite(client: Client, domain: string) {
  const [dns, ssl, whois] = await Promise.all([
    client.callTool({ name: 'dns', arguments: { domain, type: 'A' } }),
    client.callTool({ name: 'ssl', arguments: { domain } }),
    client.callTool({ name: 'whois', arguments: { domain } }),
  ]);
  for (const r of [dns, ssl, whois]) if (r.isError) console.warn('tool error', r.content);
  const shot = await client.callTool({ name: 'screenshot', arguments: { url: `https://${domain}`, fullPage: true } });
  return { dns, ssl, whois, shot }; // parse each result.structuredContent / content as needed
}
```

---
