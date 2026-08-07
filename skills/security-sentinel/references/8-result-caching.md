## 8. Result Caching

Cache scan results to preserve API quota and avoid redundant checks:

| Check Type | Cache TTL | Cache Key |
|-----------|----------|-----------|
| URL scan | 1 hour | Normalized URL (strip tracking params) |
| Domain WHOIS | 24 hours | Domain name |
| Wallet reputation | 15 minutes | Address (lowercased) |
| Contract scan | 1 hour | Contract address + chain ID |
| Threat intel IOC | 30 minutes | IOC value |

- Cache is in-memory only (no persistence across sessions)
- Force refresh available via user request: "rescan [target]"
- Cache hit returns cached result with age note (e.g., "cached 12 min ago")

---
