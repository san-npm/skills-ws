## 11. Verification & reproducibility checklist
Before you publish any on-chain figure:
1. **State the source and as-of block/time** ("USDC holders as of block N / 2026-06-01 UTC"). On-chain numbers are only meaningful with a timestamp.
2. **Reconcile across ≥2 independent sources** (Dune vs DefiLlama vs your subgraph). Investigate any >5–10% gap before shipping.
3. **Confirm decimals and price keys** (`blockchain` + `contract_address` + `minute`), not symbols.
4. **Cut off at a finalized block** for balances; flag the last ~2 finalized epochs (L1) / recent minutes (L2) as mutable.
5. **Label, don't dox** for wallet work; every wallet label carries `confidence` + `source`; no identity claims without a verifiable citation (see §5).
6. **Note the methodology** for fees vs revenue, FDV vs circulating cap, floor proxy vs live floor — conflating these is the most common way an on-chain analysis misleads.
