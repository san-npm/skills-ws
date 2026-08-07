## Contents

- 7. NFT Analytics
- Collection Stats (Dune)
- Holder Analysis — current owner = latest transfer per token

## 7. NFT Analytics

### Collection Stats (Dune)
```sql
-- Daily volume + robust "floor" for an NFT collection (BAYC)
SELECT
    DATE_TRUNC('day', block_time)                               AS day,
    COUNT(*)                                                    AS sales,
    SUM(amount_usd)                                             AS volume_usd,
    APPROX_PERCENTILE(amount_usd, 0.05)                         AS floor_proxy_usd,  -- 5th pct, not min
    APPROX_PERCENTILE(amount_usd, 0.50)                         AS median_price_usd,
    AVG(amount_usd)                                             AS avg_price_usd,
    MAX(amount_usd)                                             AS max_price_usd
FROM nft.trades
WHERE nft_contract_address = 0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d  -- BAYC
  AND block_time >= NOW() - INTERVAL '30' DAY
  AND amount_usd > 0
GROUP BY 1
ORDER BY 1;
```

> `MIN(amount_usd)` is **not** a floor price — a single wash trade, a sweep at a discount, or a 1-wei sale tanks it. The realtime floor is the lowest live ask in the order book (Blur/OpenSea/Magic Eden APIs), not a trade aggregate. As a backward-looking proxy use a low percentile (5th) of executed sales, and filter wash trades (same/looping buyer-seller, zero-royalty self-trades). Royalty/marketplace-fee handling differs across `nft.trades` rows — check `platform_fee_amount_usd` / `royalty_fee_amount_usd` when computing net proceeds.

### Holder Analysis — current owner = latest transfer per token

The original `"to" NOT IN (SELECT "from" ... AND token_id = nft.transfers.token_id ...)` was a broken correlated subquery: the inner reference to `nft.transfers.token_id` is ambiguous and it doesn't model "the most recent transfer of each token." The reliable pattern is to **rank every transfer per `(contract, token_id)` by recency and keep the latest** — its `"to"` is the current owner. Order by block number **and** a tiebreaker (`evt_index`/log index) because multiple transfers of one token can land in the same block.

```sql
-- Current holders and holdings for an NFT collection (BAYC)
WITH latest AS (
    SELECT
        token_id,
        "to" AS owner,
        ROW_NUMBER() OVER (
            PARTITION BY contract_address, token_id
            ORDER BY evt_block_number DESC, evt_index DESC   -- newest transfer wins
        ) AS rn
    FROM nft.transfers
    WHERE contract_address = 0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d  -- BAYC
)
SELECT
    owner AS holder,
    COUNT(*) AS nfts_held
FROM latest
WHERE rn = 1
  AND owner <> 0x0000000000000000000000000000000000000000  -- exclude burned tokens
GROUP BY owner
ORDER BY nfts_held DESC
LIMIT 50;
```

> Use `nft.transfers` (curated, multichain) and the matching trade table `nft.trades`. Column names may be `block_number`/`tx_index` rather than `evt_block_number`/`evt_index` depending on the table — check the schema panel; the ranking logic is identical either way. For ERC-1155 (semi-fungible) you must also sum `amount` per `(token_id, owner)` because one token_id can have many holders.

---
