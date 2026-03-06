---
name: security-sentinel
description: "Autonomous security vigilance — URL/phishing scanning, wallet scam detection, domain threat analysis, email header validation, smart contract risk assessment, and threat intelligence lookups. Teaches agents to proactively protect users from scams, malware, and fraud."
version: 1.0.0
category: dev
---

# Security Sentinel

Autonomous threat detection and response. Scan URLs, wallets, domains, emails, and contracts before trusting them.

## Decision Framework

When an agent encounters untrusted input, follow this escalation:

```
1. URL/link encountered     → URL scan + domain threat check
2. Wallet address received  → Wallet reputation + contract scan (if contract)
3. Email received           → Header analysis + sender domain check
4. New domain encountered   → WHOIS age + DNS + SSL + typosquatting check
5. Smart contract address   → Bytecode analysis + honeypot detection
6. Suspicious IP/hash/IOC   → Threat intelligence lookup
```

**Severity responses:**
- **Clean** → proceed normally
- **Suspicious** → warn the user, explain why, let them decide
- **Malicious** → block the action, explain the threat, suggest alternatives

---

## 1. URL & Phishing Detection

### Scan Before Clicking

```bash
# VirusTotal URL scan
vt url "https://example.com" --include=last_analysis_stats,reputation

# Google Safe Browsing (via API)
curl -s "https://safebrowsing.googleapis.com/v4/threatMatches:find?key=$GSB_API_KEY" \
  -d '{
    "threatInfo": {
      "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
      "platformTypes": ["ANY_PLATFORM"],
      "threatEntryTypes": ["URL"],
      "threatEntries": [{"url": "https://example.com"}]
    }
  }'
```

### Phishing Indicators (Heuristic)

Check URLs against these red flags:

| Indicator | Risk | Example |
|-----------|------|---------|
| Homoglyph characters | High | `goog1e.com` (1 instead of l) |
| Excessive subdomains | Medium | `login.secure.account.example.xyz` |
| Recently registered (<30 days) | High | WHOIS creation_date check |
| Free hosting/URL shortener | Medium | `bit.ly`, `000webhostapp.com` |
| IP address as URL | High | `http://192.168.1.1/login` |
| Misspelled brand names | High | `paypa1.com`, `arnazon.com` |
| HTTP (no TLS) for login page | Critical | `http://bank.example.com/login` |
| Suspicious TLD | Medium | `.xyz`, `.top`, `.buzz`, `.tk` |

### Typosquatting Detection

```python
# Levenshtein distance check against known brands
from difflib import SequenceMatcher

KNOWN_BRANDS = [
    "google.com", "facebook.com", "paypal.com", "amazon.com",
    "microsoft.com", "apple.com", "netflix.com", "coinbase.com",
    "binance.com", "metamask.io", "uniswap.org", "opensea.io"
]

def check_typosquat(domain: str, threshold: float = 0.8) -> list:
    alerts = []
    domain_base = domain.split('.')[0].lower()
    for brand in KNOWN_BRANDS:
        brand_base = brand.split('.')[0].lower()
        ratio = SequenceMatcher(None, domain_base, brand_base).ratio()
        if ratio >= threshold and domain != brand:
            alerts.append(f"'{domain}' resembles '{brand}' (similarity: {ratio:.0%})")
    return alerts
```

---

## 2. Wallet & Address Reputation

### Before Transacting

```bash
# Check address against known scam databases
# ChainAbuse API
curl -s "https://api.chainabuse.com/v0/addresses/$ADDRESS" \
  -H "Authorization: Bearer $CHAINABUSE_API_KEY"

# Etherscan labels (free)
curl -s "https://api.etherscan.io/api?module=account&action=txlist&address=$ADDRESS&startblock=0&endblock=99999999&page=1&offset=1&apikey=$ETHERSCAN_API_KEY"
```

### Scam Wallet Red Flags

| Signal | Risk Level | What to Check |
|--------|-----------|---------------|
| Address reported on ChainAbuse | Critical | Direct scam reports from victims |
| OFAC/SDN sanctioned address | Critical | US Treasury sanctions list |
| Tornado Cash interaction | High | Privacy mixer usage (not always malicious) |
| High-frequency small txs | Medium | Dust attack / address poisoning pattern |
| Contract with no verified source | Medium | Etherscan/Basescan verification status |
| Recently created + high value received | High | Potential rug pull collection wallet |

### Address Poisoning Detection

```
Attacker creates addresses that look like your recent contacts:

Real:    0xAbC1234567890DEF1234567890abcdef12345678
Fake:    0xAbC12...............different............45678
                                                    ^^^^^ same prefix/suffix

Defense: Always verify the FULL address, not just first/last characters.
```

---

## 3. Smart Contract Risk Assessment

### Honeypot Detection

```bash
# Quick honeypot check (token contracts)
# A honeypot lets you buy but blocks selling

# Check with honeypot.is API
curl -s "https://api.honeypot.is/v2/IsHoneypot?address=$TOKEN_ADDRESS&chainID=1"
```

### Rug Pull Indicators

| Check | How | Red Flag |
|-------|-----|----------|
| Ownership | Read `owner()` or `Ownable` | Owner can mint unlimited tokens |
| Renounced | Check if owner is `0x0` | Not renounced = owner can rug |
| Liquidity lock | Check LP token holder | LP tokens not locked or short lock |
| Proxy contract | Check for `delegatecall` patterns | Owner can change logic at will |
| Hidden mint | Search for `_mint` outside constructor | Can inflate supply post-launch |
| Transfer restrictions | Check `_transfer` overrides | May block selling |
| Fee manipulation | Check `setFee`/`setTax` functions | Owner can set 100% sell tax |
| Blacklist function | Search for `blacklist`/`isBlacklisted` | Owner can freeze your tokens |

### Automated Contract Scan Checklist

```
1. Is source code verified on block explorer?          → No = HIGH RISK
2. Is ownership renounced (owner == 0x0)?              → No = CHECK FURTHER
3. Are there mint functions callable by owner?          → Yes = HIGH RISK
4. Are there blacklist/whitelist functions?              → Yes = MEDIUM RISK
5. Is there a max transaction/wallet limit?             → Check if owner-adjustable
6. Are LP tokens locked? For how long?                  → <30 days = HIGH RISK
7. Are there pausable functions?                        → Yes = MEDIUM RISK (could be legitimate)
8. Does the contract use upgradeable proxy?             → Yes = CHECK proxy admin
```

---

## 4. Email Header Analysis

### Validate Sender Authenticity

```bash
# Check SPF record
dig TXT example.com | grep "v=spf1"

# Check DKIM selector
dig TXT selector._domainkey.example.com

# Check DMARC policy
dig TXT _dmarc.example.com
```

### Header Red Flags

| Header Field | Check | Red Flag |
|-------------|-------|----------|
| `Return-Path` | Match with `From` | Different domain = spoofing attempt |
| `Received` chain | Trace hops | Unexpected mail servers |
| `Authentication-Results` | SPF/DKIM/DMARC | `fail` or `none` on any |
| `X-Mailer` | Software used | Bulk mailer or suspicious client |
| `Reply-To` | Match with `From` | Different address = phishing likely |
| `Message-ID` domain | Match with sender | Mismatch = forged email |

### Interpreting Authentication Results

```
Authentication-Results: mx.google.com;
  dkim=pass header.d=example.com;        ← GOOD: signed by claimed domain
  spf=pass (google.com: domain of noreply@example.com designates 1.2.3.4 as permitted sender);
  dmarc=pass (p=REJECT)                  ← GOOD: strict DMARC policy

If ANY of dkim/spf/dmarc = fail → SUSPICIOUS
If sender domain has no DMARC record → MEDIUM RISK (no spoofing protection)
If DMARC policy = none → LOW protection (monitoring only, not enforcing)
```

---

## 5. Domain Intelligence

### WHOIS Age Check

```bash
# Check domain registration age
whois example.com | grep -i "creation date"

# Risk thresholds:
# < 7 days    → CRITICAL (almost certainly malicious for financial/brand domains)
# < 30 days   → HIGH
# < 90 days   → MEDIUM (could be legitimate startup)
# > 1 year    → LOW (domain age alone is not sufficient)
```

### SSL/TLS Assessment

```bash
# Check certificate details
echo | openssl s_client -connect example.com:443 2>/dev/null | openssl x509 -text -noout

# Key checks:
# - Issuer: Let's Encrypt = free (not inherently bad, but scammers use it)
# - Subject Alternative Names: does it cover expected domains?
# - Expiry: very short cert rotation could indicate automation abuse
# - Self-signed: CRITICAL for any production site
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

## 6. Threat Intelligence Lookups

### IOC Enrichment

```bash
# AbuseIPDB — check IP reputation
curl -s "https://api.abuseipdb.com/api/v2/check?ipAddress=1.2.3.4&maxAgeInDays=90" \
  -H "Key: $ABUSEIPDB_API_KEY" \
  -H "Accept: application/json"

# PhishTank — check known phishing URLs
curl -s "https://checkurl.phishtank.com/checkurl/" \
  -d "url=https://suspicious.example.com&format=json&app_key=$PHISHTANK_API_KEY"

# OTX AlienVault — threat indicators
curl -s "https://otx.alienvault.com/api/v1/indicators/domain/example.com/general" \
  -H "X-OTX-API-KEY: $OTX_API_KEY"
```

### Threat Intelligence Decision Matrix

```
Combined verdict from multiple sources:

Sources flagging = 0       → CLEAN
Sources flagging = 1       → LIKELY FALSE POSITIVE (investigate the specific vendor)
Sources flagging = 2-3     → SUSPICIOUS (warn user, provide details)
Sources flagging = 4+      → MALICIOUS (block and explain)

Always cross-reference:
- A single vendor flagging is often a false positive
- Multiple vendors agreeing is strong signal
- Check the specific threat type (phishing vs malware vs adware)
- Recent reports carry more weight than old ones
```

---

## 7. Continuous Monitoring Playbook

### Agent-Initiated Security Checks

An autonomous security agent should proactively scan at these trigger points:

```
TRIGGER                          ACTION                         FREQUENCY
──────────────────────────────── ────────────────────────────── ──────────
User shares a URL                → url_scan + domain_threat     Every time
User provides wallet address     → wallet_check                 Every time
New dependency added             → npm audit + snyk check       On change
Pre-deployment                   → header_scan + ssl_audit      Per deploy
Weekly maintenance               → full domain posture check    Weekly
Email campaign setup             → SPF/DKIM/DMARC validation   On setup
Smart contract interaction       → contract_scan + honeypot     Every time
File download from external      → VirusTotal file hash check   Every time
```

### Incident Response Quick Actions

```
1. PHISHING DETECTED
   → Block URL in security headers (CSP)
   → Notify affected users
   → Report to PhishTank/Google Safe Browsing
   → Check if credentials were entered → force password reset

2. SCAM WALLET DETECTED
   → Block transaction
   → Warn user with specific evidence
   → Report to ChainAbuse
   → Check transaction history for prior interactions

3. COMPROMISED DOMAIN DETECTED
   → Revoke any API keys associated with domain
   → Update DNS if you control it
   → Notify users who may have visited
   → Check for data exfiltration in logs

4. MALICIOUS CONTRACT DETECTED
   → Revoke token approvals (approve(0))
   → Warn user with contract analysis
   → Check for pending transactions to cancel
   → Report to block explorer
```

---

## 8. API Quick Reference

### Free Tier APIs

| Service | Free Limit | Best For |
|---------|-----------|----------|
| VirusTotal | 4/min, 500/day | URL, file, domain, IP scans |
| AbuseIPDB | 1000/day | IP reputation |
| PhishTank | Unlimited lookups | Known phishing URL check |
| OTX AlienVault | Unlimited | Threat indicators, IOCs |
| Google Safe Browsing | 10,000/day | URL safety check |
| Etherscan | 5/sec | Contract verification, tx history |
| Honeypot.is | Unlimited | Token honeypot detection |
| WHOIS (CLI) | Unlimited | Domain age and registrar |

### Environment Variables

```bash
VT_API_KEY=          # VirusTotal
GSB_API_KEY=         # Google Safe Browsing
ABUSEIPDB_API_KEY=   # AbuseIPDB
PHISHTANK_API_KEY=   # PhishTank
OTX_API_KEY=         # AlienVault OTX
ETHERSCAN_API_KEY=   # Etherscan (or Basescan, etc.)
CHAINABUSE_API_KEY=  # ChainAbuse
```
