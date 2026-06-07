---
name: security-sentinel
description: "Runtime threat intel — URL/phishing scans, wallet scam detection, domain reputation, email-header validation, smart-contract risk, calibrated multi-source scoring. Use when an agent must vet an unknown link, address, contract, or sender before trusting it. Siblings: security-hardening, security-pentester, virustotal."
---

# Security Sentinel

> Disambiguation: this skill = runtime threat intel. For defensive code patterns see `security-hardening`. For active offensive testing see `security-pentester`. For deep VirusTotal API workflows see the optional `virustotal` skill (this skill works standalone without it).

Autonomous threat detection and response. Scan URLs, wallets, domains, emails, and contracts before trusting them.

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

## 1. URL & Phishing Detection

### Scan Before Clicking

```bash
# VirusTotal URL scan
vt url "https://example.com" --include=last_analysis_stats,reputation

# Google Safe Browsing — v4 threatMatches:find still works until 2027-03-31.
# Migrate to v5 (real-time SearchHashes / hash-prefix lookups) for new builds; see §9.
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

A correct check must (1) decode punycode (`xn--`) to catch IDN homograph attacks, (2) fold Unicode confusables to their ASCII skeleton (so `раура1.com` with Cyrillic letters collapses onto `paypal`), and (3) compare the **eTLD+1** (registrable domain), not `split('.')[0]` — otherwise `paypal.com.evil.ru` and `paypal.attacker.io` slip through, and multi-label brands like `co.uk` confuse the base extraction. Compare both the edit-distance ratio AND an exact skeleton match (skeleton match = almost certainly malicious).

```python
# pip install tldextract idna confusable_homoglyphs
from difflib import SequenceMatcher
import idna, tldextract
from confusable_homoglyphs import confusables

KNOWN_BRANDS = [  # store as registrable domains (eTLD+1)
    "google.com", "facebook.com", "paypal.com", "amazon.com",
    "microsoft.com", "apple.com", "netflix.com", "coinbase.com",
    "binance.com", "metamask.io", "uniswap.org", "opensea.io",
]
# Fold a label to its ASCII/Latin "skeleton" so cross-script lookalikes collapse onto
# their Latin form. We pass preferred_aliases=['latin'] so is_confusable() returns the
# LATIN homoglyph of a non-Latin char (e.g. Cyrillic 'а' U+0430 -> 'a'); pure-ASCII chars
# return False and pass through unchanged.
def skeleton(s: str) -> str:
    out = []
    for ch in s:
        try:
            m = confusables.is_confusable(ch, greedy=True, preferred_aliases=["latin"])
        except Exception:
            m = False
        if m and m[0].get("homoglyphs"):
            out.append(m[0]["homoglyphs"][0]["c"])  # Latin canonical form
        else:
            out.append(ch)
    return "".join(out).lower()

BRAND_SKELETONS = {b: skeleton(tldextract.extract(b).domain) for b in KNOWN_BRANDS}

def registrable(domain: str) -> str:
    """Decode punycode, return eTLD+1 (handles co.uk, .com.br, etc.)."""
    try:
        domain = idna.decode(domain.encode("ascii")) if "xn--" in domain else domain
    except idna.IDNAError:
        pass
    ext = tldextract.extract(domain.lower())
    return f"{ext.domain}.{ext.suffix}" if ext.suffix else ext.domain

def check_typosquat(domain: str, threshold: float = 0.85) -> list:
    alerts = []
    reg = registrable(domain)            # e.g. paypal.com.evil.ru -> evil.ru
    label = tldextract.extract(reg).domain
    label_skel = skeleton(label)
    for brand, brand_skel in BRAND_SKELETONS.items():
        if reg == brand:
            continue
        if label_skel == brand_skel:     # confusable/homoglyph hit
            alerts.append(f"CRITICAL: '{domain}' confusable-matches '{brand}' (homoglyph skeleton)")
            continue
        ratio = SequenceMatcher(None, label, tldextract.extract(brand).domain).ratio()
        if ratio >= threshold:
            alerts.append(f"'{domain}' (reg: {reg}) resembles '{brand}' (similarity: {ratio:.0%})")
    # brand name present but NOT the registrable domain → impersonation in a subdomain/path host
    for brand in KNOWN_BRANDS:
        bl = tldextract.extract(brand).domain
        if bl in domain.lower() and registrable(domain) != brand:
            alerts.append(f"HIGH: '{brand}' label appears in '{domain}' but it is not {brand}")
    return alerts
```

---

## 2. Wallet & Address Reputation

### Before Transacting

```bash
# 1) Chainabuse — community scam reports (Public API v1.2; verify at docs.chainabuse.com)
# Endpoint: GET /v0/reports (the "/v0/addresses/{addr}" path is gone). Screen by ?address=&chain=.
# Auth: HTTP Basic — put the SAME API key in BOTH the username and password fields.
#   "Authorization: Basic base64(API_KEY:API_KEY)" — curl -u does this for you.
# chain ∈ {ETH, BTC, TRON, SOL, POLYGON, BSC, ARBITRUM, BASE, ...}
curl -s -u "$CHAINABUSE_API_KEY:$CHAINABUSE_API_KEY" \
  "https://api.chainabuse.com/v0/reports?address=$ADDRESS&chain=ETH&perPage=50"
# Interpret the JSON: each item has `category` (PHISHING, RUG_PULL, SCAM, RANSOMWARE,
# SEXTORTION, ...), `checked` (moderator-verified), `trustedReporter` (vetted source),
# `createdAt`, and `addresses[]`. Treat checked OR trustedReporter reports as high-signal;
# unverified single reports as Suspicious, not Malicious. NOTE: standard free keys are
# capped at ~10 calls/month (1 call = up to 50 reports) — cache aggressively (see §8).

# 2) OFAC / sanctions screening. Chainabuse is DEPRECATING its sanctions endpoint; use a
#    sanctions oracle instead. On-chain: Chainalysis free Sanctions Oracle (read isSanctioned).
#    Off-chain: TRM / Chainalysis sanctions API, or match against the OFAC SDN crypto list.
#    Mainnet oracle 0x40C57923924B5c5c5455c48D93317139ADDaC8fb — call isSanctioned(address).
#    (Same address on Polygon/BSC; verify at go.chainalysis.com/chainalysis-oracle-docs.html)
cast call 0x40C57923924B5c5c5455c48D93317139ADDaC8fb \
  "isSanctioned(address)(bool)" "$ADDRESS" --rpc-url "$ETH_RPC_URL"

# 3) Etherscan V2 (multichain, single key). V1 was deprecated in 2025 — V2 REQUIRES chainid.
#    Base URL: https://api.etherscan.io/v2/api   (chainid 1=ETH, 8453=Base, 42161=Arbitrum,
#    137=Polygon, 56=BSC, 10=Optimism). Same key works on all 50+ supported chains.

# Activity / age signal — does the address have history, or is it freshly funded?
curl -s "https://api.etherscan.io/v2/api?chainid=1&module=account&action=txlist&address=$ADDRESS&startblock=0&endblock=99999999&page=1&offset=10&sort=asc&apikey=$ETHERSCAN_API_KEY"

# Public name tag / label (e.g. "Phish/Hack", "Fake_Phishing", exchange labels)
curl -s "https://api.etherscan.io/v2/api?chainid=1&module=nametag&action=getaddresstag&address=$ADDRESS&apikey=$ETHERSCAN_API_KEY"

# Is the address a verified contract? (unverified source on a "token" = elevated risk)
curl -s "https://api.etherscan.io/v2/api?chainid=1&module=contract&action=getsourcecode&address=$ADDRESS&apikey=$ETHERSCAN_API_KEY"
```

### Scam Wallet Red Flags

| Signal | Risk Level | What to Check |
|--------|-----------|---------------|
| Chainabuse report, `checked` or `trustedReporter` | Critical | Moderator-verified / vetted-source scam report |
| Chainabuse report, single unverified | Suspicious | One unverified victim report — corroborate, don't auto-block |
| OFAC/SDN sanctioned address | Critical | Sanctions oracle `isSanctioned` / SDN crypto list |
| Etherscan name tag = `Phish/Hack` or `Fake_Phishing` | Critical | Explorer-applied malicious label |
| Tornado Cash interaction | Context-dependent | See mixer assessment below |
| High-frequency small txs | Medium | Dust attack / address poisoning pattern |
| Contract with no verified source | Medium | Etherscan `getsourcecode` returns empty `SourceCode` |
| Recently created + high value received | High | Potential rug pull collection wallet |

### Address Poisoning Detection

```
Attacker creates addresses that look like your recent contacts:

Real:    0xAbC1234567890DEF1234567890abcdef12345678
Fake:    0xAbC12...............different............45678
                                                    ^^^^^ same prefix/suffix

Defense: Always verify the FULL address, not just first/last characters.
```

### Mixer / Privacy Protocol Assessment

Do NOT automatically flag all mixer interactions as suspicious. Apply contextual analysis:

```
HIGH RISK (flag as Suspicious):
- Direct deposits/withdrawals > $10,000 equivalent
- Multiple mixer interactions within 24 hours
- Mixer usage immediately followed by transfers to exchanges
- Address appears on OFAC SDN list regardless of mixer use

LOWER RISK (note but do not flag):
- Single small-value mixer interaction
- Interaction via intermediary contract (indirect)
- Known privacy-preserving DeFi protocols (not mixers)
```

When mixer interaction is detected, include this context:
"This address has interacted with [protocol]. Privacy tool usage alone
is not inherently malicious. Risk assessment considers transaction
patterns, volume, and regulatory context."

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

# Check DKIM selector (replace "selector" with the real one from the email's
# DKIM-Signature header s= tag — common defaults: google, default, k1, s1)
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

## 6. Threat Intelligence Lookups

### IOC Enrichment

```bash
# AbuseIPDB — check IP reputation (use a placeholder IP; never hardcode a real target)
curl -s "https://api.abuseipdb.com/api/v2/check?ipAddress=203.0.113.10&maxAgeInDays=90" \
  -H "Key: $ABUSEIPDB_API_KEY" \
  -H "Accept: application/json"

# OpenPhish — current phishing-URL feed (PhishTank's public API is deprecated; see §9).
# Free community feed, no key; refreshed frequently. Match the target against the feed.
curl -s "https://openphish.com/feed.txt" | grep -Fxq "https://suspicious.example.com" \
  && echo "OPENPHISH: listed (high-confidence phishing)" || echo "OPENPHISH: not listed"

# OTX AlienVault — threat indicators (free, key required)
curl -s "https://otx.alienvault.com/api/v1/indicators/domain/example.com/general" \
  -H "X-OTX-API-KEY: $OTX_API_KEY"
```

### Threat Intelligence Decision (calibrated, not a naive sum)

Summing heterogeneous vendor weights and blocking at a fixed threshold produces
false blocks (e.g. a year-old AbuseIPDB note + a 0.5 OTX prior would "block" a clean
target). Use this ordered decision procedure instead. Run it AFTER the allowlist gate.

```
STEP 0 — Known-good gate (prevents the worst false positives):
  - Target is an org-maintained allowlist entry (your own domains/contracts)? → CLEAN, stop.
  - Domain on a major reputable list (e.g. Tranco/Cisco-Umbrella top ~10k) AND not
    flagged by any AUTHORITATIVE source below? → CLEAN, lower the weight of weak signals.

STEP 1 — Authoritative override (any ONE ⇒ verdict immediately):
  - Google Safe Browsing v5 match (MALWARE / SOCIAL_ENGINEERING / UNWANTED) → MALICIOUS.
  - OpenPhish / verified Chainabuse (checked|trustedReporter) listing → MALICIOUS.
  - OFAC/SDN sanctioned address → MALICIOUS (legal, not heuristic).
  - VirusTotal ≥ 5 engines flagging, OR ≥ 3 reputable engines agreeing → MALICIOUS.
  These are high-precision; a single hit is sufficient. Do NOT average them away.

STEP 2 — Corroboration tier (needs ≥ 2 independent signals OR 1 strong + recency):
  Score each source, then require AGREEMENT rather than a raw sum:
    VirusTotal      = engines_flagging / total_engines        (1–4 engines = weak)
    AbuseIPDB       = abuseConfidenceScore/100, ×0.5 if newest report > 90d old
    OTX pulses      = 0.4 (prior/context only — never decisive alone)
    Chainabuse      = 0.8 if checked|trusted else 0.3 (unverified)
    Domain age      = +0.3 if eTLD+1 < 30d (see §5 — age alone is NOT proof)
    Typosquat hit   = skeleton match 0.9 / edit-distance 0.5 (see §1)
  - ≥ 2 independent sources each ≥ 0.4  → SUSPICIOUS (warn, show every source).
  - 1 source ≥ 0.4 AND report age < 7d  → SUSPICIOUS (fresh single-vendor signal).
  - exactly 1 weak source (< 0.4)        → LOW-CONFIDENCE note, proceed with caution.
  - 0 signals                             → CLEAN.

STEP 3 — Target-category weighting:
  - Money-moving target (wallet, contract, "connect wallet"/login page) → escalate one
    band on uncertainty (SUSPICIOUS→treat as block-worthy until confirmed).
  - Internal/private host (RFC-1918, .internal, corp CA) → DOWN-weight TLS/age/self-signed
    heuristics; private PKI and fresh certs are normal there.

STEP 4 — False-positive escalation (before blocking anything high-impact):
  - Conflict (authoritative CLEAN vs heuristic MALICIOUS)? Surface BOTH, do not auto-block;
    ask the user or require a second authoritative source.
  - Always record: source name, exact verdict field, report timestamp, and your confidence.
    New threats often start with one vendor — log uncertainty, never fabricate corroboration.
```

### Output Templates (evidence, source, timestamp, uncertainty — always)

```
CLEAN
  ✅ <target> — no threats found.
  Checked: VirusTotal (0/72), Google Safe Browsing v5 (no match), Chainabuse (0 reports).
  Sources current as of <ISO-8601 ts>. Absence of reports ≠ proof of safety.

SUSPICIOUS
  ⚠️  <target> — proceed with caution. Confidence: MEDIUM.
  Evidence:
    • VirusTotal: 3/72 engines (Fortinet, Sophos, Kaspersky) flag "phishing" [scanned <ts>]
    • Domain age: registered 5 days ago (eTLD+1 <reg-domain>)
  No authoritative source confirms. Recommend not entering credentials/funds until verified.

MALICIOUS
  🛑 <target> — BLOCKED. Confidence: HIGH.
  Authoritative match:
    • Google Safe Browsing v5: SOCIAL_ENGINEERING [<ts>]
    • Chainabuse: 4 reports, category RUG_PULL, moderator-checked [oldest <ts>]
  Action taken: <blocked tx / blocked navigation>. Alternative: <safe path>.
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
   → Report it: Google Safe Browsing (safebrowsing.google.com/safebrowsing/report_phish),
     APWG (reportphishing@apwg.org), and the impersonated brand's abuse contact
   → Check if credentials were entered → force password reset

2. SCAM WALLET DETECTED
   → Block transaction
   → Warn user with specific evidence
   → Report to Chainabuse (chainabuse.com/report)
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
| Etherscan API V2 | ~5 req/sec, ~100k/day | Multichain contract/tx/label lookups | One key, 50+ chains via `chainid`; verify etherscan.io/apis |
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
