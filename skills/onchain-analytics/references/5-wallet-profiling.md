## Contents

- 5. Wallet Profiling
- Activity Pattern Analysis
- Protocol Interaction Map

## 5. Wallet Profiling

> **Privacy, compliance & accuracy guardrails — read before profiling.**
> On-chain data is pseudonymous, not anonymous, but linking an address to a real person/entity is a serious claim with legal and safety consequences.
> - **No unsupported identity claims.** Never assert "address X is person Y" without a cited, verifiable source (a public ENS/Twitter self-link, an exchange's own published label, a court/OFAC record). Heuristic clustering (common-input, timing, funding-source) yields *hypotheses*, not facts.
> - **Attach confidence + source to every label.** Emit `{ label, confidence: 0..1, source }` and surface it in the UI. Distinguish protocol/contract labels (high confidence, from `labels.*`/Etherscan verified tags) from behavioral inferences (low).
> - **One address ≠ one human.** Smart-contract wallets, multisigs, shared custody, and MEV bots break the "one wallet = one user" assumption. Mixers/privacy tools and CEX omnibus wallets defeat naive clustering.
> - **Sanctions/compliance:** screening against OFAC SDN / sanctioned-address lists is a regulated activity — use a licensed provider (Chainalysis, TRM, Elliptic) and qualified counsel; do not roll your own AML determinations.
> - **Aggregate, don't dox.** For research/marketing, prefer cohort-level aggregates (e.g. "23% of LPs also hold token Z") over per-individual dossiers. Don't republish a private individual's full financial history because it happens to be on-chain.

### Activity Pattern Analysis
```sql
-- Dune: wallet activity fingerprint (timezone of EXTRACT is UTC — state it)
WITH activity AS (
    SELECT
        "from" AS wallet,
        DATE_TRUNC('hour', block_time) AS hour,
        COUNT(*) AS tx_count,
        -- gas_used (receipt) × gas_price (effective price), wei → ETH
        SUM(CAST(gas_used AS DOUBLE) * gas_price) / 1e18 AS gas_spent_eth
    FROM ethereum.transactions
    WHERE "from" = 0xWalletAddress   -- replace with the address under study
        AND block_time >= NOW() - INTERVAL '90' DAY
    GROUP BY 1, 2
)
SELECT
    EXTRACT(DOW  FROM hour) AS day_of_week,   -- UTC
    EXTRACT(HOUR FROM hour) AS hour_of_day,   -- UTC; a tight active-hours band hints at timezone/automation
    SUM(tx_count)           AS total_txs,
    AVG(tx_count)           AS avg_txs_per_active_hour,
    SUM(gas_spent_eth)      AS total_gas_eth
FROM activity
GROUP BY 1, 2
ORDER BY total_txs DESC;
```

> Timing fingerprints are **weak heuristics**, not identity. A consistent UTC active-hours window suggests a likely timezone or, if 24/7 and regular, automation/bot behavior — never an identity. Label such conclusions with low confidence (see §5 guardrails).

### Protocol Interaction Map
```sql
-- Which contracts/protocols does a wallet interact with?
SELECT
    t."to"                                       AS contract,
    -- label if known, else a short hex prefix (to_hex returns varchar, so slice with substr)
    COALESCE(l.name, '0x' || substr(to_hex(t."to"), 1, 8) || '…') AS protocol,
    l.category                                   AS label_category,   -- e.g. dex, lending, cex
    COUNT(*)                                     AS interactions,
    MIN(t.block_time)                            AS first_seen,
    MAX(t.block_time)                            AS last_seen,
    SUM(t.value / 1e18)                          AS total_eth_sent
FROM ethereum.transactions t
LEFT JOIN labels.all l
    ON l.address = t."to" AND l.blockchain = 'ethereum'
WHERE t."from" = 0xWalletAddress
    AND t.block_time >= NOW() - INTERVAL '365' DAY
    AND t."to" IS NOT NULL
GROUP BY 1, 2, 3
ORDER BY interactions DESC
LIMIT 20;
```

> `labels.all` is community-curated and incomplete — an unlabeled `"to"` is "unknown," not "suspicious." Surface `l.category`/source so a reader can judge label trustworthiness, per the §5 guardrails.

---
