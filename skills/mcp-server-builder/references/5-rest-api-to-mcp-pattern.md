## Contents

- 5. REST API to MCP Pattern
- Complete API Wrapper Examples

## 5. REST API to MCP Pattern

The universal pattern for wrapping any REST API as an MCP tool:

```typescript
// Pattern: REST API → MCP Tool
server.registerTool(
  "tool_name",                          // snake_case, descriptive
  {
    description: "One-line description for the LLM",  // The LLM reads this to decide when to use it
    inputSchema: {
      // Zod schema → JSON Schema
      param1: z.string().describe("What this param does"),
      param2: z.number().optional().describe("Optional param with context"),
    },
  },
  async (args) => {
    // 1. Validate / transform input
    const sanitized = sanitizeInput(args.param1);

    // 2. Call upstream API
    const response = await fetch(`https://api.example.com/endpoint?q=${encodeURIComponent(sanitized)}`, {
      headers: { Authorization: `Bearer ${process.env.UPSTREAM_API_KEY}` },
    });

    // 3. Handle errors
    if (!response.ok) {
      return {
        content: [{ type: "text", text: `API error: ${response.status} — ${await response.text()}` }],
        isError: true,
      };
    }

    // 4. Transform response for LLM consumption
    const data = await response.json();
    const summary = formatForLLM(data); // Trim noise, keep signal

    // 5. Return structured content
    return {
      content: [{ type: "text", text: summary }],
    };
  }
);
```

### Complete API Wrapper Examples

```typescript
// --- OCR Tool (wrapping OCR.space API) ---
server.registerTool(
  "ocr_extract",
  {
    description: "Extract text from an image using OCR",
    inputSchema: {
      imageUrl: z.string().url().describe("URL of the image to process"),
      language: z.enum(["eng", "fra", "deu", "spa", "por", "jpn", "kor", "chi_sim"]).default("eng"),
    },
  },
  async ({ imageUrl, language }) => {
    const form = new URLSearchParams({
      url: imageUrl,
      language,
      isOverlayRequired: "false",
      OCREngine: "2",
    });
    const res = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: { apikey: process.env.OCR_API_KEY! },
      body: form,
    });
    const data = await res.json();
    if (data.IsErroredOnProcessing) {
      return { content: [{ type: "text", text: `OCR error: ${data.ErrorMessage?.join(", ")}` }], isError: true };
    }
    const text = data.ParsedResults?.map((r: any) => r.ParsedText).join("\n") || "No text found";
    return { content: [{ type: "text", text }] };
  }
);

// --- Blockchain: EVM Balance Check ---
server.registerTool(
  "evm_balance",
  {
    description: "Get native token balance for an address on any EVM chain",
    inputSchema: {
      address: z.string().regex(/^0x[a-fA-F0-9]{40}$/).describe("EVM wallet address"),
      chain: z.enum(["ethereum", "celo", "base", "polygon", "arbitrum", "optimism"]).default("celo"),
    },
  },
  async ({ address, chain }) => {
    const rpcUrls: Record<string, string> = {
      ethereum: "https://eth.llamarpc.com",
      celo: "https://forno.celo.org",
      base: "https://mainnet.base.org",
      polygon: "https://polygon-rpc.com",
      arbitrum: "https://arb1.arbitrum.io/rpc",
      optimism: "https://mainnet.optimism.io",
    };
    const res = await fetch(rpcUrls[chain], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [address, "latest"] }),
    });
    const data = await res.json();
    const wei = BigInt(data.result);
    // Safe conversion: divide in BigInt domain first to avoid Number precision loss
    const ether = (Number(wei / 10n ** 12n) / 1_000_000).toFixed(6);
    return { content: [{ type: "text", text: `${address} on ${chain}: ${ether} native tokens (${wei} wei)` }] };
  }
);

// --- WHOIS Lookup (via RDAP, the IANA-backed WHOIS successor) ---
server.registerTool(
  "whois_lookup",
  {
    description: "Get RDAP (WHOIS successor) registration information for a domain",
    inputSchema: {
      domain: z.string().min(1).describe("Domain name (e.g., example.com)"),
    },
  },
  async ({ domain }) => {
    const res = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`);
    if (!res.ok) return { content: [{ type: "text", text: `RDAP lookup failed: ${res.status}` }], isError: true };
    const data = await res.json();
    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
  }
);

// --- SSL Certificate Check ---
server.registerTool(
  "ssl_check",
  {
    description: "Check SSL/TLS certificate details for a domain",
    inputSchema: {
      domain: z.string().min(1).describe("Domain to check (without https://)"),
    },
  },
  async ({ domain }) => {
    const tls = await import("tls");
    return new Promise((resolve) => {
      const socket = tls.connect(443, domain, { servername: domain }, () => {
        const cert = socket.getPeerCertificate();
        socket.destroy();
        const info = {
          subject: cert.subject,
          issuer: cert.issuer,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          serialNumber: cert.serialNumber,
          fingerprint256: cert.fingerprint256,
          daysRemaining: Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86400000),
        };
        resolve({ content: [{ type: "text" as const, text: JSON.stringify(info, null, 2) }] });
      });
      socket.on("error", (err) => {
        resolve({ content: [{ type: "text" as const, text: `SSL check failed: ${err.message}` }], isError: true });
      });
      socket.setTimeout(10000, () => {
        socket.destroy();
        resolve({ content: [{ type: "text" as const, text: "SSL check timed out" }], isError: true });
      });
    });
  }
);
```

---
