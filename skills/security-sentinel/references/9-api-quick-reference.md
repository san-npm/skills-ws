## Contents

- 9. API Quick Reference
- Free Tier APIs
- Environment Variables
- Graceful Degradation

## 9. API Quick Reference

### Free Tier APIs

Free-tier terms change — figures below are "as of Jun 2026, verify at the linked page."

| Service | Free Limit (verify) | Best For | Notes |
|---------|-----------|----------|-------|
| VirusTotal (v3) | 4/min, 500/day, 15.5k/month | URL, file, domain, IP scans | Public API; verify docs.virustotal.com/reference/public-vs-premium-api |
| AbuseIPDB | ~1,000 checks/day | IP reputation | verify abuseipdb.com/pricing |
| PhishTank | Deprecated | — | Public API restricted; do not rely on it. Use OpenPhish instead |
| OpenPhish | Community feed | Phishing URL feed | Free, no key; `openphish.com/feed.txt`. PhishTank replacement |
| OTX AlienVault | Free, key required | Threat indicators, IOCs | "Unlimited" no longer guaranteed — verify otx.alienvault.com |
| Google Safe Browsing v5 | Free, default quota (raise via Cloud Console) | URL safety check | v4 ends 2027-03-31; migrate to v5. No published hard 10k/day cap |
| Etherscan API V2 | ~5 req/sec, ~100k/day | Multichain contract/tx lookups | One key, 50+ chains via `chainid`; nametag/label endpoint is Pro Plus only; verify etherscan.io/apis |
| Chainabuse (Public API v1.2) | ~10 calls/month (≤50 reports each) | Crypto scam reports | Basic auth; very low free quota — cache hard. docs.chainabuse.com |
| Honeypot.is | Generous free tier | Token honeypot detection | verify honeypot.is |
| WHOIS / RDAP (CLI) | ~30-50/min per registrar | Domain age and registrar | RDAP is the modern replacement for port-43 WHOIS; backoff on failures |

### Environment Variables

```bash
VT_API_KEY=          # VirusTotal (v3 public API)
GSB_API_KEY=         # Google Safe Browsing (v5; v4 sunsets 2027-03-31)
ABUSEIPDB_API_KEY=   # AbuseIPDB
OTX_API_KEY=         # AlienVault OTX
ETHERSCAN_API_KEY=   # Etherscan API V2 — single key covers all chains via chainid
ETH_RPC_URL=         # JSON-RPC endpoint (for cast calls, e.g. the sanctions oracle)
CHAINABUSE_API_KEY=  # Chainabuse v1.2 — same key used as BOTH Basic-auth user AND password
# PhishTank removed: public API deprecated; OpenPhish needs no key (see §6).
# Never commit real keys — use a .env file or secrets manager; rotate if exposed.
```

### Graceful Degradation

Not all API keys are required. The agent should adapt based on what's available:

```
Keys configured   Capability level   Behavior
─────────────── ─────────────────── ────────────────────────────────────────────
All keys          Full                All checks enabled
4-6 keys          Partial             Run available checks, warn about gaps
1-3 keys          Degraded            Heuristic-heavy mode, warn prominently
0 keys            Heuristic-only      Pattern matching only, no external lookups
```

On startup, log which checks are unavailable:
- Example: "VT_API_KEY not set — URL reputation checks will use heuristics only"

On API errors during operation:
- Timeout (>5s): skip source, note in output, continue with other sources
- Rate limited (429): queue and retry with exponential backoff, warn user of delay
- Server error (5xx): skip source, note in output, continue
- All external sources fail: switch to heuristic mode and warn explicitly
