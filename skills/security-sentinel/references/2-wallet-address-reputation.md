## Contents

- 2. Wallet & Address Reputation
- Before Transacting
- Scam Wallet Red Flags
- Address Poisoning Detection
- Mixer / Privacy Protocol Assessment

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

# Public name tag / label (e.g. "Phish/Hack", "Fake_Phishing", exchange labels).
# NOTE: module=nametag is a PRO endpoint (Pro Plus tier only, 2 req/sec); on a free key
# this call fails, so treat the label signal as unavailable and lean on getsourcecode
# plus Chainabuse instead.
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
