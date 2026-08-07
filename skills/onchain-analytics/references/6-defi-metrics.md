## Contents

- 6. DeFi Metrics
- TVL Calculation (flow-based approximation)
- Protocol Revenue
- Key DeFi Metrics Reference

## 6. DeFi Metrics

> **Two ways to compute TVL — know which you're doing.** (a) **Flow-based** (cumulative deposits − withdrawals, below) is cheap but drifts: it ignores price changes on already-deposited assets, rebases, liquidations, and any non-event balance change, so it diverges from reality over time. (b) **Balance-based / point-in-time** (read each vault's `balanceOf` per asset at a block × price) is correct but heavier. For published TVL, reconcile against DefiLlama (§10), which does balance-based accounting across protocols.

### TVL Calculation (flow-based approximation)
```sql
-- Cumulative TVL from deposit/withdraw events (approximation — see caveat above)
SELECT
    day,
    SUM(net_usd) OVER (ORDER BY day) AS tvl_approx
FROM (
    SELECT
        DATE_TRUNC('day', f.evt_block_time) AS day,
        SUM(f.signed_amount * p.price)      AS net_usd
    FROM (
        SELECT evt_block_time, asset,  amount AS signed_amount FROM protocol.deposits
        UNION ALL
        SELECT evt_block_time, asset, -amount AS signed_amount FROM protocol.withdrawals
    ) f
    JOIN prices.minute p
        ON p.blockchain = 'ethereum'                       -- always key price on chain too
       AND p.contract_address = f.asset
       AND p.timestamp = DATE_TRUNC('minute', f.evt_block_time)
    GROUP BY 1
) daily
ORDER BY day;
```

### Protocol Revenue
```sql
-- Fee estimate for a DEX: dex.trades has no fee columns, so estimate from volume x fee rate
SELECT
    DATE_TRUNC('day', block_time) AS day,
    SUM(amount_usd)               AS volume_usd,
    SUM(amount_usd) * 0.003       AS est_fees_usd  -- replace 0.003 with the real pool fee tier(s)
FROM dex.trades
WHERE project = 'uniswap'
  AND blockchain = 'ethereum'
  AND block_time >= NOW() - INTERVAL '30' DAY
GROUP BY 1
ORDER BY 1;
```

> `dex.trades` carries no per-trade fee split. For a real protocol vs LP revenue split, decode the protocol's own fee events (fee-switch config) or per-pool fee tiers, or use Token Terminal/Artemis for standardized cross-protocol fee and revenue series.

### Key DeFi Metrics Reference
| Metric | Definition | Source / caveat |
|--------|------------|-----------------|
| TVL | Σ deposited-asset balances × price | Balance-based; flow-based drifts (above) |
| Volume (24h) | Σ trade notional in 24h | Use `dex.trades`; dedupe aggregator hops |
| Fees (24h) | Total fees paid by users | Volume × tier fee; some V3 pools vary by tier |
| Revenue | Protocol's share of fees (to treasury) | Depends on fee-switch config; ≠ total fees |
| P/F ratio | Market cap (or FDV) ÷ annualized **fees** | State which cap you used (circulating vs FDV) |
| P/S ratio | Market cap (or FDV) ÷ annualized **revenue** | Revenue = protocol's cut, not total fees |
| FDV | Total/max supply × price | Overstates value when emissions are far in the future |
| Market cap | Circulating supply × price | Circulating ≠ total; check vesting/locks |

> "Fees" and "revenue" are routinely conflated and inflate valuation multiples. Be explicit: **fees** = paid by users; **revenue** = the protocol's retained cut. With a fee switch off, protocol revenue can be ~0 even with large fees. State FDV vs circulating cap whenever you publish a P/F or P/S number.

---
