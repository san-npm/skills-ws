## Contents

- 6. Threat Intelligence Lookups
- IOC Enrichment
- Threat Intelligence Decision (calibrated, not a naive sum)
- Output Templates (evidence, source, timestamp, uncertainty — always)

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
