## Contents

- 5. Domain Intelligence
- WHOIS Age Check
- SSL/TLS Assessment
- DNS Anomalies

## 5. Domain Intelligence

### WHOIS Age Check

```bash
# Check domain registration age
whois example.com | grep -i "creation date"

# Age is a RISK MULTIPLIER, never a verdict on its own. Legitimate new domains exist:
# product launches, marketing campaigns, startups, and incident-response/takedown domains
# are routinely days old. Weight age UP only when combined with another signal (typosquat,
# a credential/login or "connect wallet" page, or a threat-intel hit — see §6 STEP 2/3).
# < 7 days    → strong risk signal; CRITICAL only if it ALSO impersonates a brand or
#               collects credentials/funds. Bare new domain = elevated, not confirmed-bad.
# < 30 days   → HIGH contribution to score
# < 90 days   → MEDIUM (commonly a legitimate startup or campaign)
# > 1 year    → LOW (age is reassuring but not proof — aged domains get hijacked too)
```

### SSL/TLS Assessment

```bash
# Check certificate details
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null \
  | openssl x509 -text -noout
```

```
Key checks (TLS is weak signal for malice — calibrate to context):
- Issuer: free CAs (Let's Encrypt, ZeroSSL, Google Trust) are the norm now, NOT a red flag.
- Subject / SAN: does CN/SAN actually cover the host? A mismatch or a wildcard that does
  not include the brand it claims to be = real signal.
- Validity window: SHORT-LIVED CERTS ARE NORMAL in 2026 (ACME automation; the CA/Browser
  Forum is driving max lifetimes toward ~47 days by 2029). Do NOT flag short rotation as
  abuse. A LONG-lived cert with a brand mismatch is more suspicious than a fresh ACME cert.
- Self-signed / private CA: expected for internal, *.internal, RFC-1918, and corp-PKI hosts
  — DOWN-weight there (see §6 STEP 3). Treat as a real problem ONLY on a PUBLIC site that
  presents itself as a bank/exchange/brand or collects credentials, where a browser would
  show a trust error. Combine with the host's public reputation before concluding.
```

### DNS Anomalies

```bash
# Check for suspicious DNS patterns
dig A example.com +short          # IP resolution
dig MX example.com +short         # Mail servers
dig NS example.com +short         # Name servers
dig TXT example.com +short        # SPF, verification records

# Red flags:
# - Cloudflare/hosting IP resolving to a brand-impersonating domain
# - No MX records for a domain claiming to send email
# - Recently changed NS records (domain hijack indicator)
```

---
