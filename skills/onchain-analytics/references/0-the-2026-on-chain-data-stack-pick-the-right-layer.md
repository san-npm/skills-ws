## Contents

- 0. The 2026 On-Chain Data Stack — pick the right layer
- Data-quality checklist (apply to every query before you trust the output)

## 0. The 2026 On-Chain Data Stack — pick the right layer

There is no single "best" tool; match the layer to the job. Five access patterns dominate in 2026:

| Layer | Tools | Best for | Watch out for |
|-------|-------|----------|---------------|
| **Ad-hoc SQL** | Dune (DuneSQL/Trino), Allium | Exploratory analysis, dashboards, holder/flow studies | Curated tables lag the chain tip (minutes–hours); decoded coverage varies by chain |
| **Custom indexers** | The Graph (subgraphs), Envio HyperIndex, Goldsky, Substreams, Ponder | App back-ends needing low-latency, app-specific schema | You own reorg handling, schema migrations, and infra cost |
| **Enhanced RPC / data APIs** | Alchemy, Infura, QuickNode, Moralis | Wallet balances, NFT ownership, transfer history without indexing | Compute-unit metering; per-provider quotas drift — verify before relying on a number |
| **Curated metrics** | Token Terminal, Artemis, DefiLlama, Nansen | Standardized fees/revenue/TVL, labeled wallets, fast comparisons | Methodology is the vendor's, not yours — read their docs before quoting |
| **Raw warehouse / streams** | Allium, Goldsky Mirror, Dune's `*_decoded` tables, RPC `eth_getLogs` | Bespoke pipelines, ML features, full-fidelity traces | Volume and cost scale fast; build dedup + finality logic |

Indexer performance note (Sentio benchmarks, 2025): RPC-native frameworks (Envio HyperSync, Substreams) backfill EVM history dramatically faster than RPC-only subgraph indexing — orders of magnitude on factory-style workloads. Validate the latest numbers for your chain before committing; benchmarks shift release-to-release.

**Cross-source reconciliation rule:** any headline number (TVL, 24h volume, holder count, revenue) should agree within a few percent across at least two independent sources (e.g. Dune vs DefiLlama, your subgraph vs Etherscan). A >5–10% gap means a methodology difference (price source, fee split, double-counted wrapped assets, unindexed events) — find it before publishing.

### Data-quality checklist (apply to every query before you trust the output)
- **Finality / reorgs:** Ethereum L1 finalizes in ~2 epochs (~13 min). Treat the last ~2 finalized epochs of L1, and the last several minutes of fast L2s, as mutable. For point-in-time balances, cut off at a finalized block, not `latest`.
- **Decimals:** scale by the token's real `decimals` (USDC=6, WBTC=8, most ERC-20=18). Never hardcode `/1e18`.
- **Mints/burns:** transfers from/to `0x0000000000000000000000000000000000000000` (and known burn addresses like `0x...dEaD`) are supply changes, not holder movements — keep them in supply math, drop them from "holder" counts.
- **Logs vs traces:** ERC-20/721/1155 movements live in **event logs** (`Transfer`). Native-ETH internal sends and contract-to-contract value live only in **traces** (`ethereum.traces`), not logs. Pick the right source for the asset.
- **Price joins:** join prices on `(blockchain, contract_address, minute)` — never on `symbol` alone (symbols collide across tokens/chains). Missing minutes need forward-fill or a `prices.day` fallback.
- **Rebasing/fee-on-transfer tokens** (stETH, some reflection tokens): a balance computed from `Transfer` events will not match the real balance. Read on-chain `balanceOf` for these, or note the caveat.
