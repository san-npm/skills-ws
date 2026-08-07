## 9. Protocol Fee Reference

All fees below are governance-/pool-configurable and can change — read them on-chain or from current docs rather than hardcoding.

| Protocol | Fee | Paid by |
|----------|-----|---------|
| Uniswap V3 | 0.01% / 0.05% / 0.3% / 1% (pool-specific) | Swapper |
| Uniswap V4 | Static or dynamic per pool (hook-set) | Swapper |
| Aave V3 flash loan | ~0.05% historically; **read `POOL.FLASHLOAN_PREMIUM_TOTAL()`** | Borrower |
| Aave V3 borrow | Variable APR (market-driven) | Borrower |
| Compound V3 | Variable APR | Borrower |
| Curve | ~0.01–0.04% swap fee (pool-specific) | Swapper |
| 1inch / Velora | No protocol fee (aggregator; positive-slippage policy varies) | — |
| Balancer V2 | Pool-specific (0.01–10%) | Swapper |

---
