## Contents

- 9. Security
- Input Validation
- Constant-Time Comparison
- Webhook Signature Verification
- Security Headers

## 9. Security

### Input Validation

> **SSRF is the #1 risk for an API-wrapping MCP server.** A string filter on `url.hostname` is necessary but **NOT sufficient** — it misses (a) IPv6 loopback/link-local/ULA, (b) decimal/octal/hex/`0x` IPv4 encodings (`http://2130706433/` == `127.0.0.1`), (c) a public hostname whose **DNS resolves** to a private IP, (d) a 30x **redirect** to a private IP after the first hop passed, and (e) cloud **metadata** endpoints (`169.254.169.254`, GCP `metadata.google.internal`, Azure IMDS). Do the string check as a fast pre-filter, then **resolve the host and re-check every resolved IP**, fetch with `redirect: "manual"` (re-validate each hop), and pin the agent to the resolved IP. Below: the syntactic filter, then a runtime guard.

```typescript
import { z } from "zod";
import net from "node:net";
import dns from "node:dns/promises";

// --- 1. Syntactic pre-filter (Zod) — cheap, rejects obvious internals + non-HTTPS ---
const urlSchema = z.string().url().refine(
  (url) => {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return false;          // no http:, file:, gopher:, ftp:
    let h = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, ""); // strip IPv6 brackets
    // Block obvious internal names + cloud metadata hosts
    if (["localhost", "metadata.google.internal"].includes(h)) return false;
    if (h.endsWith(".internal") || h.endsWith(".local") || h.endsWith(".localhost")) return false;
    // If it's an IP literal, classify it (covers IPv4 + IPv6; throws on weird encodings)
    if (net.isIP(h)) return !isPrivateIp(h);
    // Reject numeric IPv4 in non-dotted form (decimal/octal/hex) that net.isIP missed
    if (/^(0x[0-9a-f]+|\d+)$/.test(h)) return false;
    return true; // a name — still MUST be re-checked after DNS resolution (see guard below)
  },
  { message: "URL must be a public HTTPS URL (no internal hosts/IPs)" }
);

// --- 2. IP classifier: loopback / private / link-local / ULA / metadata, v4 AND v6 ---
function isPrivateIp(ip: string): boolean {
  const v = net.isIP(ip);
  if (v === 4) {
    const o = ip.split(".").map(Number);
    return (
      o[0] === 0 || o[0] === 10 || o[0] === 127 ||                       // this-net, 10/8, loopback
      (o[0] === 100 && o[1] >= 64 && o[1] <= 127) ||                     // 100.64/10 CGNAT
      (o[0] === 169 && o[1] === 254) ||                                  // 169.254/16 link-local (AWS/GCP/Azure metadata)
      (o[0] === 172 && o[1] >= 16 && o[1] <= 31) ||                      // 172.16/12
      (o[0] === 192 && o[1] === 168)                                     // 192.168/16
    );
  }
  if (v === 6) {
    const a = ip.toLowerCase();
    if (a === "::1" || a === "::") return true;                          // loopback / unspecified
    if (a.startsWith("fe80")) return true;                              // link-local
    if (a.startsWith("fc") || a.startsWith("fd")) return true;          // fc00::/7 ULA
    const m = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);                 // IPv4-mapped ::ffff:a.b.c.d
    if (m) return isPrivateIp(m[1]);
    return false;
  }
  return true; // unparseable ⇒ treat as unsafe
}

// --- 3. Runtime guard: resolve + re-check, then fetch with manual redirect re-validation ---
export async function safeFetch(rawUrl: string, init: RequestInit = {}): Promise<Response> {
  let url = rawUrl;
  for (let hop = 0; hop < 5; hop++) {                                    // cap redirects
    const u = new URL(url);
    if (u.protocol !== "https:") throw new Error("SSRF: non-HTTPS");
    const host = u.hostname.replace(/^\[|\]$/g, "");
    const ips = net.isIP(host) ? [host] : (await dns.lookup(host, { all: true })).map(r => r.address);
    if (ips.length === 0 || ips.some(isPrivateIp)) throw new Error(`SSRF: ${host} resolves to a private/blocked IP`);
    const res = await fetch(url, { ...init, redirect: "manual" });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = new URL(res.headers.get("location")!, url).toString();      // re-validate next hop on loop
      continue;
    }
    return res;                                                          // 2xx/4xx/5xx — done
  }
  throw new Error("SSRF: too many redirects");
}
// NB: even this has a TOCTOU gap (DNS can change between check and connect / "DNS rebinding").
// For hard guarantees, resolve once and pin the connection to that IP via a custom https.Agent
// lookup, or run egress behind an allowlisting forward proxy. See `security-hardening`.

const domainSchema = z.string()
  .min(1).max(253)
  .regex(/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/, "Invalid domain");

const evmAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid EVM address");
```

> **MCP-specific transport hardening.** A remote MCP server is also exposed to **DNS-rebinding** attacks against its *own* HTTP endpoint: enable the SDK's host/origin validation on `StreamableHTTPServerTransport` (`enableDnsRebindingProtection: true`, `allowedHosts`, `allowedOrigins`) so a browser page on another origin can't drive your `/mcp` endpoint. Pair it with the fail-closed CORS in §8.

### Constant-Time Comparison

```typescript
import crypto from "crypto";

// ALWAYS use this for secret comparison — never use === for API keys/tokens
function secureCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
```

### Webhook Signature Verification

```typescript
// Generic HMAC webhook verification
function verifyWebhookSignature(
  payload: Buffer | string,
  signature: string,
  secret: string,
  algorithm: "sha256" | "sha1" = "sha256",
  prefix: string = ""
): boolean {
  const expected = prefix + crypto.createHmac(algorithm, secret).update(payload).digest("hex");
  return secureCompare(signature, expected);
}

// Stripe: compound timestamp signature
// For Stripe: use stripe.webhooks.constructEvent() instead of manual HMAC.
// It handles timestamp tolerance and proper signature verification.
// Manual example kept for non-Stripe webhooks only:
function verifyStripeSignature(payload: Buffer, sigHeader: string, secret: string): boolean {
  const parts: Record<string, string> = {};
  sigHeader.split(",").forEach(p => { const [k, v] = p.split("="); parts[k] = v; });
  if (!parts.t || !parts.v1) return false;
  const timestamp = parseInt(parts.t, 10);
  if (isNaN(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  // Feed payload as Buffer directly — template literal would coerce Buffer to string
  const expected = crypto.createHmac("sha256", secret)
    .update(`${parts.t}.`)
    .update(payload)
    .digest("hex");
  return secureCompare(parts.v1, expected);
}

// GitHub: sha256 HMAC
function verifyGitHubSignature(payload: Buffer, sigHeader: string, secret: string): boolean {
  return verifyWebhookSignature(payload, sigHeader, secret, "sha256", "sha256=");
}
```

### Security Headers

```typescript
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-Request-Id", crypto.randomUUID());
  next();
});
```

---
