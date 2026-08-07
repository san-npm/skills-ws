---
name: defi-integration
description: "Build Solidity/TypeScript DeFi integrations — Uniswap V3/V4, Aave V3, Compound V3, Curve, 1inch/Velora, ERC-4626 vaults: swaps, lending, liquidity, flash loans, yield. Use when writing contract or wallet code that swaps, LPs, borrows, or flash-loans; simulate, set slippage from a live quote, confirm with the user before mainnet."
---
# DeFi Protocol Integration

> **SAFETY — read first.** Every contract in this skill is an **unaudited teaching template**, not production code. Before any mainnet use you MUST: (1) add slippage bounds derived from a live quote/oracle (never `0`/`1`), (2) set real `deadline`s, (3) add reentrancy protection (`ReentrancyGuard` / checks-effects-interactions) on any function that calls external contracts and moves funds, (4) use `SafeERC20` for all token transfers/approvals, (5) dry-run via a fork or Tenderly simulation, (6) verify every address against the official deployment registry for the target chain, and (7) get an independent security **audit**. Do not broadcast a money-moving transaction without explicit user confirmation. See §7 (Slippage & MEV) and §11 (Pre-flight Safety Checklist).

## Reference guide

Read only the references needed for the current request:

- **1. Uniswap Integration**: [references/1-uniswap-integration.md](references/1-uniswap-integration.md)
- **2. Aave V3**: [references/2-aave-v3.md](references/2-aave-v3.md)
- **3. Compound V3 (Comet)**: [references/3-compound-v3-comet.md](references/3-compound-v3-comet.md)
- **4. Curve Finance**: [references/4-curve-finance.md](references/4-curve-finance.md)
- **5. DEX Aggregator Integration**: [references/5-dex-aggregator-integration.md](references/5-dex-aggregator-integration.md)
- **6. Flash Loan Arbitrage Template**: [references/6-flash-loan-arbitrage-template.md](references/6-flash-loan-arbitrage-template.md)
- **7. Slippage & MEV Protection**: [references/7-slippage-mev-protection.md](references/7-slippage-mev-protection.md)
- **8. Yield Strategy Patterns**: [references/8-yield-strategy-patterns.md](references/8-yield-strategy-patterns.md)
- **9. Protocol Fee Reference**: [references/9-protocol-fee-reference.md](references/9-protocol-fee-reference.md)
- **10. Fork Testing DeFi**: [references/10-fork-testing-defi.md](references/10-fork-testing-defi.md)
- **11. Pre-flight Safety Checklist (money-moving transactions)**: [references/11-pre-flight-safety-checklist-money-moving-transactions.md](references/11-pre-flight-safety-checklist-money-moving-transactions.md)
- **Related skills**: [references/related-skills.md](references/related-skills.md)
