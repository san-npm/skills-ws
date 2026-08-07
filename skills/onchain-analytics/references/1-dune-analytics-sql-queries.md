## Contents

- 1. Dune Analytics SQL Queries
- Token Holder Analysis — balance ledger
- Token Holder Distribution — concentration / Nakamoto-style
- DEX Volume — use the curated dex.trades table
- Protocol TVL (simplified, flow-based)
- Whale Tracking

## 1. Dune Analytics SQL Queries

> **Engine:** Dune runs **DuneSQL** (Trino/Presto dialect) since the 2024 migration off Postgres. Use double quotes for identifiers (`"from"`, `"to"`), `from_hex`/`varbinary` for addresses, `bytearray_substring` for byte slicing, and DuneSQL date functions. Prefer **curated Spellbook tables** (`dex.trades`, `tokens.transfers`, `nft.trades`, `prices.usd`/`prices.minute`, `labels.*`, `tokens.erc20`) over raw decoded protocol event tables — Spellbook normalizes decimals, symbols, USD value, and multichain schemas, and is far less brittle than per-protocol `*_evt_*` tables whose names change between protocol versions.

### Token Holder Analysis — balance ledger

The correct pattern for an ERC-20 balance is a **normalized transfer ledger**: every transfer contributes `+value` to the recipient and `-value` to the sender; sum per address and keep positives. Always scale by real `decimals` and exclude the zero address (mint/burn sink) from the holder set. Prefer the curated `tokens.transfers` Spellbook table — it already normalizes amounts and works multichain.

```sql
-- Top 100 holders of USDC on Ethereum (USDC has 6 decimals)
WITH ledger AS (
    -- inflows: recipient gains
    SELECT "to" AS holder, amount_raw AS delta
    FROM tokens.transfers
    WHERE blockchain = 'ethereum'
      AND contract_address = 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48  -- USDC
    UNION ALL
    -- outflows: sender loses
    SELECT "from" AS holder, -amount_raw AS delta
    FROM tokens.transfers
    WHERE blockchain = 'ethereum'
      AND contract_address = 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
)
SELECT
    holder,
    SUM(delta) / 1e6 AS balance          -- USDC decimals = 6
FROM ledger
WHERE holder <> 0x0000000000000000000000000000000000000000  -- drop mint/burn sink
GROUP BY holder
HAVING SUM(delta) > 0
ORDER BY balance DESC
LIMIT 100;
```

> If you must use raw decoded events instead of `tokens.transfers`, substitute `erc20_ethereum.evt_Transfer` with columns `"to"`, `"from"`, `value`, and join `tokens.erc20` to get `decimals` rather than hardcoding `1e6`/`1e18`.

### Token Holder Distribution — concentration / Nakamoto-style

Build the per-holder balance ledger **once**, then rank and bucket. The original version was wrong on two counts: it referenced the output alias `holder` inside its own aggregate (illegal — aliases are not visible in the expression that defines them), and it summed only `"to"` rows so outgoing transfers were never subtracted. This version fixes both.

```sql
WITH ledger AS (
    SELECT "to" AS holder, amount_raw AS delta
    FROM tokens.transfers
    WHERE blockchain = 'ethereum'
      AND contract_address = 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
    UNION ALL
    SELECT "from" AS holder, -amount_raw AS delta
    FROM tokens.transfers
    WHERE blockchain = 'ethereum'
      AND contract_address = 0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48
),
balances AS (
    SELECT holder, SUM(delta) / 1e6 AS balance
    FROM ledger
    WHERE holder <> 0x0000000000000000000000000000000000000000
    GROUP BY holder
    HAVING SUM(delta) > 0
),
ranked AS (
    SELECT
        holder,
        balance,
        ROW_NUMBER() OVER (ORDER BY balance DESC) AS rnk,
        SUM(balance) OVER () AS circulating
    FROM balances
)
SELECT
    CASE
        WHEN rnk <= 10  THEN 'Top 10'
        WHEN rnk <= 50  THEN 'Top 11-50'
        WHEN rnk <= 100 THEN 'Top 51-100'
        ELSE 'Rest'
    END AS tier,
    COUNT(*)                              AS holders,
    SUM(balance)                          AS total_balance,
    SUM(balance) / MAX(circulating) * 100 AS pct_of_supply
FROM ranked
GROUP BY 1
ORDER BY MIN(rnk);
```

> `circulating` here is the on-ledger circulating supply (sum of positive balances), not max/total supply — state that explicitly when you publish. CEX hot wallets, bridges, and staking contracts inflate "top holder" concentration; label and optionally exclude them via `labels.all` before drawing conclusions about decentralization.

### DEX Volume — use the curated `dex.trades` table

Do **not** query per-pool/per-version event tables like `uniswap_v3_ethereum.Pair_evt_Swap` for volume — Uniswap V3 swaps are pool-based (not "Pair") and table names differ by protocol version, so they break constantly. Spellbook's `dex.trades` already aggregates every DEX/version across chains, normalizes decimals, and precomputes `amount_usd`. It also avoids the original query's price-join bug (joining on `symbol='ETH'` ignored chain and token address and could fan out rows).

```sql
-- Daily Uniswap volume on Ethereum (all versions), pool-level via dex.trades
SELECT
    DATE_TRUNC('day', block_time) AS day,
    COUNT(*)                      AS num_trades,
    SUM(amount_usd)               AS volume_usd
FROM dex.trades
WHERE blockchain = 'ethereum'
  AND project = 'uniswap'              -- omit for total cross-DEX volume
  AND block_time >= NOW() - INTERVAL '30' DAY
  AND amount_usd IS NOT NULL           -- rows with no reliable price are dropped from $ volume
GROUP BY 1
ORDER BY 1;
```

> `dex.trades` is pool-level: a swap routed through 1inch/CoWSwap appears once per pool hop, so per-pool DEX volume is correct but user-intent volume is overstated. Use `dex_aggregator.trades` for aggregator trade intents (one row per intent), and never sum the two tables together (that double counts). If you need a token whose USD price is missing from `dex.trades`, join `prices.minute` on the full key (`ON p.blockchain = t.blockchain AND p.contract_address = t.token_bought_address AND p.timestamp = DATE_TRUNC('minute', t.block_time)`), never on `symbol` alone.

### Protocol TVL (simplified, flow-based)
```sql
-- Cumulative net flow for a lending protocol. Aggregate to daily FIRST, then
-- run the running total over the daily grain (a window over raw rows gives a
-- per-row total, not per-day). See §6 for the balance-based caveat.
WITH daily AS (
    SELECT
        DATE_TRUNC('day', evt_block_time) AS day,
        SUM(CASE WHEN event_type = 'deposit' THEN amount_usd ELSE -amount_usd END) AS net_usd
    FROM protocol_events
    WHERE evt_block_time >= NOW() - INTERVAL '90' DAY
    GROUP BY 1
)
SELECT day, SUM(net_usd) OVER (ORDER BY day) AS cumulative_tvl
FROM daily
ORDER BY day;
```

### Whale Tracking
```sql
-- Large ERC-20 transfers (>$1M) in the last 24 hours, any token
SELECT
    tr.evt_block_time,
    tr."from",
    tr."to",
    tr.value / POWER(10, t.decimals)            AS amount,
    tr.value / POWER(10, t.decimals) * p.price  AS value_usd,
    t.symbol
FROM erc20_ethereum.evt_Transfer tr
JOIN tokens.erc20 t
    ON t.contract_address = tr.contract_address
   AND t.blockchain = 'ethereum'
-- price keyed on full (blockchain, contract, minute); INNER JOIN so untradeable
-- tokens with no price are excluded instead of producing NULL > 1e6 = false silently
JOIN prices.minute p
    ON p.blockchain = 'ethereum'
   AND p.contract_address = tr.contract_address
   AND p.timestamp = DATE_TRUNC('minute', tr.evt_block_time)
WHERE tr.evt_block_time >= NOW() - INTERVAL '24' HOUR
  AND tr.value / POWER(10, t.decimals) * p.price > 1000000
ORDER BY value_usd DESC
LIMIT 50;
```

> Note `prices.minute` is the current Spellbook minute-resolution price table (the older `prices.usd` alias may still resolve). Many "whale" transfers are exchange/bridge plumbing — join `labels.all` on `"from"`/`"to"` to filter out CEX, bridge, and known protocol addresses before calling a wallet a whale.

---
