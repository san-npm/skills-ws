## Contents

- 10. Useful API Endpoints
- DefiLlama (no API key, great for cross-checking TVL/prices)

## 10. Useful API Endpoints

> **Free quotas and unit pricing change constantly — do not treat the right-hand column as a contract.** Verify on each vendor's pricing page before architecting around a limit. (As of Jun 2026.)

| Service | Endpoint (V2 where noted) | Free-tier note → verify at |
|---------|---------------------------|----------------------------|
| Etherscan V2 | `api.etherscan.io/v2/api` (+`chainid`) | 3 calls/s, 100k/day → etherscan.io/apis |
| Dune | `api.dune.com` | Credit-metered free plan → dune.com/pricing |
| The Graph | `gateway.thegraph.com` | ~100k queries/mo free → thegraph.com/studio |
| Alchemy | `*.g.alchemy.com` | CU-metered monthly free pool → alchemy.com/pricing |
| Infura | `mainnet.infura.io` | Daily request cap → infura.io/pricing |
| DefiLlama | `api.llama.fi` | Open, no key; courtesy rate limits → defillama.com/docs/api |
| CoinGecko | `api.coingecko.com` | Free Demo plan; per-minute cap varies → coingecko.com/en/api/pricing |
| Moralis | `deep-index.moralis.io` | CU-metered daily free pool → moralis.io/pricing |
| Allium / Token Terminal / Artemis | (enterprise/SQL/metrics) | Paid; for warehouse-grade & standardized metrics |

> Compute-unit (CU) models make a flat "X CU/month" number nearly meaningless on its own — different methods cost wildly different CU, and the per-method costs get repriced. Budget against *your* method mix, measure actual usage, and re-check the vendor page rather than hardcoding a figure.

### DefiLlama (no API key, great for cross-checking TVL/prices)
```typescript
// Current TVL for a protocol (number, USD)
const tvl = await fetch('https://api.llama.fi/tvl/aave').then(r => r.json());

// All protocols with TVL + chain breakdown
const protocols = await fetch('https://api.llama.fi/protocols').then(r => r.json());

// Historical chain TVL (array of { date, tvl })
const chainTvl = await fetch('https://api.llama.fi/v2/historicalChainTvl/Ethereum').then(r => r.json());

// Token prices by (chain:address) — handy to sanity-check your own price joins
const prices = await fetch(
  'https://coins.llama.fi/prices/current/ethereum:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
).then(r => r.json());
```

> DefiLlama does balance-based TVL across protocols, so it's the fastest independent check on a TVL number you computed yourself. The yields API (`yields.llama.fi`) and stablecoins API are similarly key-free. Be a good citizen: cache responses and don't hammer it.

---
