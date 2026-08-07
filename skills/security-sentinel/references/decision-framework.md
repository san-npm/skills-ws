## Decision Framework

When an agent encounters untrusted input, classify it and run ALL matching checks in parallel:

```
Classification (applied independently — input may match multiple):
─────────────────────────────────────────────────────────────────
Contains URL pattern        → URL scan + domain threat check
Contains wallet address     → Wallet reputation + contract scan (if contract)
Contains email headers      → Header analysis + sender domain check
Contains domain name        → WHOIS age + DNS + SSL + typosquatting check
Contains contract address   → Bytecode analysis + honeypot detection
Contains IP/hash/IOC        → Threat intelligence lookup

Example: A URL with a wallet address as a query parameter triggers
BOTH a URL scan AND a wallet reputation check.
```

Final severity = highest severity across all matched checks.

**Severity responses:**
- **Clean** → proceed normally
- **Suspicious** → warn the user, explain why, let them decide
- **Malicious** → block the action, explain the threat, suggest alternatives

---
