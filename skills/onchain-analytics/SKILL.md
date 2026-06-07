---
name: onchain-analytics
description: "On-chain EVM data analysis — Dune (DuneSQL/Trino), Etherscan V2 multichain API, The Graph, Alchemy/Infura RPC, token/holder/whale flows, DeFi & NFT metrics, mempool/MEV, dashboards. Use when querying blockchain data, building crypto dashboards, computing TVL/volume/holder distribution, or profiling wallets."
---

# On-Chain Analytics

Sibling skills: protocol integration patterns → `defi-integration`; contract review → `smart-contract-auditor`; on-chain trade execution → `wallet-integration`; prediction markets → `polymarket-trading`.

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
-- Daily Uniswap volume on Ethereum (all versions), de-double-counted by dex.trades
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

> `dex.trades` already deduplicates aggregator/router hops so you don't double-count a single user swap routed through 1inch/CoWSwap. If you need a token whose USD price is missing from `dex.trades`, join `prices.minute` on the full key — `ON p.blockchain = t.blockchain AND p.contract_address = t.token_bought_address AND p.timestamp = DATE_TRUNC('minute', t.block_time)` — never on `symbol` alone.

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

## 2. Etherscan API (V2 — unified multichain)

> **V1 is fully deprecated (since 15 Aug 2025).** Use the **V2 base `https://api.etherscan.io/v2/api`** with a `chainid` query param — one chain per call. A single API key now works across 60+ chains (Ethereum `1`, Base `8453`, Arbitrum `42161`, Optimism `10`, Polygon `137`, BSC `56`, …) on the *same* host — you no longer hit `api.basescan.org` etc. Verify the current chain list and limits at https://docs.etherscan.io/etherscan-v2 and https://etherscan.io/apis.

### Setup
```typescript
const ETHERSCAN_API = 'https://api.etherscan.io/v2/api';  // V2 unified endpoint
const API_KEY = process.env.ETHERSCAN_API_KEY;

// Etherscan returns 200 even on logical errors; status/result conventions differ
// by endpoint (some return status '1'/'0', proxy/stats endpoints return jsonrpc/result).
async function etherscanQuery(params: Record<string, string>, chainId = 1) {
  const url = `${ETHERSCAN_API}?${new URLSearchParams({
    chainid: String(chainId),
    ...params,
    apikey: API_KEY!,
  })}`;

  // Retry on rate-limit / transient errors with backoff (see rate-limit table below)
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url);
    const data = await res.json();

    // "NOTOK" + a rate-limit message → back off and retry
    if (data.message === 'NOTOK' && /rate limit/i.test(String(data.result))) {
      await new Promise(r => setTimeout(r, 250 * 2 ** attempt));
      continue;
    }
    // status '0' with "No transactions found" is an empty result, not an error
    if (data.status === '0' && data.message === 'No transactions found') return [];
    if (data.status !== '1' && data.message !== 'OK' && data.jsonrpc === undefined) {
      throw new Error(typeof data.result === 'string' ? data.result : data.message);
    }
    return data.result;
  }
  throw new Error('Etherscan: exhausted retries (rate limited)');
}

// Example: same key, different chain
const baseBalance = await etherscanQuery(
  { module: 'account', action: 'balance', address: '0xYourWalletAddress', tag: 'latest' },
  8453, // Base
);
```

### Account Balance
```typescript
// Single address ETH balance (returns wei as a string)
const balance = await etherscanQuery({
  module: 'account', action: 'balance',
  address: '0xYourWalletAddress', tag: 'latest',
});
console.log(`Balance: ${Number(balance) / 1e18} ETH`);

// Multi-address balance (up to 20 addresses)
const balances = await etherscanQuery({
  module: 'account', action: 'balancemulti',
  address: '0xAddr1,0xAddr2,0xAddr3', tag: 'latest',
});
```

### Transaction List (with pagination)
```typescript
// Normal transactions — page through with page/offset; window with start/endblock.
// Hard limit: at most 10,000 records are returnable for a given query window, so
// for full history walk forward by block range, not by ever-larger page numbers.
const txs = await etherscanQuery({
  module: 'account', action: 'txlist',
  address: '0xYourWalletAddress',
  startblock: '0', endblock: '99999999',
  page: '1', offset: '100', sort: 'asc',   // asc + advancing startblock = stable paging
});

// To page a large history: keep the last block seen and re-query from there
async function allTxs(address: string, chainId = 1) {
  const out: any[] = [];
  let startblock = 0;
  for (;;) {
    const batch = await etherscanQuery({
      module: 'account', action: 'txlist', address,
      startblock: String(startblock), endblock: '99999999',
      page: '1', offset: '1000', sort: 'asc',
    }, chainId);
    if (!Array.isArray(batch) || batch.length === 0) break;
    out.push(...batch);
    const last = Number(batch[batch.length - 1].blockNumber);
    if (batch.length < 1000) break;
    startblock = last + 1;            // advance past the last block to avoid dupes
  }
  return out;
}

// ERC20 token transfers (tokentx), ERC-721 (tokennfttx), ERC-1155 (token1155tx)
const tokenTxs = await etherscanQuery({
  module: 'account', action: 'tokentx',
  address: '0xYourWalletAddress', startblock: '0', endblock: '99999999',
  page: '1', offset: '100', sort: 'desc',
});

// Internal transactions (value moved by contract execution; NOT in event logs)
const internalTxs = await etherscanQuery({
  module: 'account', action: 'txlistinternal',
  address: '0xYourWalletAddress', startblock: '0', endblock: '99999999',
});
```

> Etherscan is a convenience/lookup API, not an analytics warehouse: it caps results (~10k/window), has no aggregation, and historical-state endpoints (token balance at block, historical ETH balance) are paid-tier only. For aggregates use Dune; for full transfer history use Alchemy `getAssetTransfers` or your own indexer.

### Contract ABI
```typescript
const abi = await etherscanQuery({
  module: 'contract', action: 'getabi',
  address: '0xContractAddress',
});
const parsedAbi = JSON.parse(abi);
```

### Gas Tracker
```typescript
const gasPrice = await etherscanQuery({
  module: 'gastracker', action: 'gasoracle',
});
console.log(`Safe: ${gasPrice.SafeGasPrice} Gwei`);
console.log(`Propose: ${gasPrice.ProposeGasPrice} Gwei`);
console.log(`Fast: ${gasPrice.FastGasPrice} Gwei`);
```

### Rate Limits (as of Jun 2026 — verify at https://etherscan.io/apis)
A single key spans all V2 chains, but the per-second/daily limits are **shared across every chain**.

| Plan | Rate | Daily cap |
|------|------|-----------|
| Free | 3 calls/sec | 100,000/day |
| Lite | 5 calls/sec | 100,000/day |
| Standard | 10 calls/sec | 200,000/day |
| Advanced | 20 calls/sec | 500,000/day |
| Professional | 30 calls/sec | 1,000,000/day |
| Enterprise | unmetered | dedicated infra |

There is no "unlimited" consumer tier — paid plans raise the per-second and daily caps. Always implement the backoff shown in the Setup block; bursting past the per-second limit returns `NOTOK` with a rate-limit message, not an HTTP 429.

---

## 3. The Graph — Subgraph Queries (decentralized network)

> **The hosted service was sunset on 12 Jun 2024** — all queries now run on **The Graph Network**. You query `https://gateway.thegraph.com/api/<API_KEY>/subgraphs/id/<SUBGRAPH_ID>` using an API key created in **Subgraph Studio** (free tier ~100k queries/month; paid in GRT or card). Old `api.thegraph.com/subgraphs/name/...` hosted URLs no longer work. Keep the gateway key server-side. Decentralized subgraphs can be served by multiple Indexers, so allow for slight indexing-lag and occasional Indexer differences; check the subgraph's `_meta { block { number } hasIndexingErrors }` to know how fresh and healthy the data is.

```graphql
# Always check freshness/health alongside your data
{
  _meta { block { number timestamp } hasIndexingErrors }
}
```

### Querying a subgraph (gateway + error handling)
```typescript
// Subgraph IDs are looked up in The Graph Explorer; keep the key in env, server-side.
const SUBGRAPH_ID = process.env.UNISWAP_V3_SUBGRAPH_ID!;        // e.g. from explorer
const GATEWAY = `https://gateway.thegraph.com/api/${process.env.GRAPH_API_KEY}/subgraphs/id/${SUBGRAPH_ID}`;

async function querySubgraph<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(GATEWAY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Graph gateway HTTP ${res.status}`);
  const json = await res.json();
  // GraphQL returns 200 with an `errors` array on query errors — surface them
  if (json.errors?.length) throw new Error(json.errors.map((e: any) => e.message).join('; '));
  return json.data as T;
}
```

> The Graph also exposes **decentralized indexer Substreams** and Substreams-powered subgraphs for high-throughput backfills. For app back-ends that need sub-second latency or non-EVM/exotic schemas, compare against Envio HyperIndex, Goldsky, and Ponder (see §0) — they often index history far faster than a classic subgraph.

### Top Pools by TVL
```graphql
{
  pools(first: 10, orderBy: totalValueLockedUSD, orderDirection: desc) {
    id
    token0 { symbol decimals }
    token1 { symbol decimals }
    feeTier
    totalValueLockedUSD
    volumeUSD
    txCount
  }
}
```

### Token Price and Volume
```graphql
query TokenData($address: String!) {
  token(id: $address) {
    symbol
    name
    decimals
    totalSupply
    volumeUSD
    totalValueLockedUSD
    tokenDayData(first: 30, orderBy: date, orderDirection: desc) {
      date
      priceUSD
      volumeUSD
      totalValueLockedUSD
    }
  }
}
```

### Recent Swaps
```graphql
{
  swaps(first: 20, orderBy: timestamp, orderDirection: desc,
    where: { pool: "0x8ad599c3a0ff1de082011efddc58f1908eb6e6d8" }) {
    timestamp
    sender
    recipient
    amount0
    amount1
    amountUSD
    tick
  }
}
```

### Aave V3 Subgraph
```graphql
# Markets overview
{
  markets(first: 10, orderBy: totalValueLockedUSD, orderDirection: desc) {
    id
    name
    inputToken { symbol }
    totalValueLockedUSD
    totalBorrowBalanceUSD
    rates {
      side
      rate
      type
    }
  }
}
```

---

## 4. Alchemy / Infura Enhanced APIs

> JSON-RPC POSTs **must** send `Content-Type: application/json` — without it some gateways reject the body or treat it as form data. Always check the JSON-RPC envelope for `error` before reading `result`.

```typescript
const alchemyUrl = `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`;

async function alchemyRpc<T>(method: string, params: unknown[]): Promise<T> {
  const res = await fetch(alchemyUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },   // required
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${method}: ${json.error.message}`);
  return json.result as T;
}

// All ERC-20 balances for an address (paginate via pageKey when present)
const tokenBalances = await alchemyRpc('alchemy_getTokenBalances', ['0xYourWalletAddress', 'erc20']);

// Token metadata (decimals, symbol, name, logo)
const metadata = await alchemyRpc('alchemy_getTokenMetadata', ['0xTokenAddress']);

// Full transfer history — the right tool for "everything a wallet ever sent/received".
// Walk `pageKey` until it is absent; `external` = native ETH, `internal` needs a trace-enabled tier.
async function getAllTransfers(address: string) {
  const out: any[] = [];
  let pageKey: string | undefined;
  do {
    const page: any = await alchemyRpc('alchemy_getAssetTransfers', [{
      fromBlock: '0x0', toBlock: 'latest',
      fromAddress: address,
      category: ['erc20', 'erc721', 'erc1155', 'external'],
      withMetadata: true, excludeZeroValue: true,
      maxCount: '0x3e8',                  // 1000 per page
      ...(pageKey ? { pageKey } : {}),
    }]);
    out.push(...page.transfers);
    pageKey = page.pageKey;
  } while (pageKey);
  return out;
}

// NFTs owned by an address (Alchemy NFT API v3 — REST, not JSON-RPC)
const nfts = await fetch(
  `https://eth-mainnet.g.alchemy.com/nft/v3/${process.env.ALCHEMY_KEY}/getNFTsForOwner?owner=0xYourWalletAddress&withMetadata=true`
).then(r => r.json());
```

> Infura/QuickNode/Moralis expose similar enhanced methods, and Alchemy mirrors this API across L2s (Base, Arbitrum, Optimism, Polygon) by swapping the subdomain. Free compute-unit quotas and CU-per-method pricing change frequently and differ per provider — treat them as **verify-before-relying**, not constants (see §10).

---

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
    -- label if known, else a short hex prefix; to_hex on varbinary, not CAST-to-varchar
    COALESCE(l.name, '0x' || bytearray_substring(to_hex(t."to"), 1, 8) || '…') AS protocol,
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
-- Fee revenue for a DEX (curated dex.trades, not a raw dex_trades table)
SELECT
    DATE_TRUNC('day', block_time) AS day,
    SUM(fee_amount_usd)           AS daily_fees,        -- total swap fees paid by traders
    SUM(protocol_fee_usd)         AS protocol_revenue,  -- share routed to treasury
    SUM(lp_fee_usd)               AS lp_revenue         -- share paid to LPs
FROM dex.trades
WHERE project = 'uniswap'
  AND blockchain = 'ethereum'
  AND block_time >= NOW() - INTERVAL '30' DAY
GROUP BY 1
ORDER BY 1;
```

> Fee columns vary by protocol and may be NULL where the fee split isn't decoded — verify the column exists for your project in the schema panel, or use Token Terminal/Artemis for standardized, cross-protocol fee & revenue series.

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

## 8. Mempool Monitoring

> **Reality check first.** The "public mempool" is increasingly *not* where value-bearing transactions live. A large and growing share of Ethereum flow is private — sent via Flashbots Protect / MEV-Share, direct builder relays, or order-flow auctions — and never appears as a pending tx. So mempool monitoring sees a biased subset, gives **no execution guarantee** (txs can be dropped/replaced/reordered by builders), and on most fast L2s there is no meaningful pending mempool at all (centralized sequencer). Use it for signal, not as a source of truth, and never as a front-running edge you rely on.

### Watching pending transactions — with batching, filtering, and backpressure
The naive pattern (fire one `getTransaction` per hash inside the callback) floods your RPC: a busy mempool emits thousands of hashes/sec, so you instantly exceed per-second compute-unit limits and build an unbounded promise backlog. Batch, bound concurrency, and drop on overload.

```typescript
import { createPublicClient, webSocket, getAddress } from 'viem';
import { mainnet } from 'viem/chains';

const UNISWAP_ROUTER = getAddress('0xUniswapRouterAddress'); // checksum-normalize before comparing

const client = createPublicClient({
  chain: mainnet,
  transport: webSocket(`wss://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_KEY}`),
});

const MAX_INFLIGHT = 20;     // cap concurrent getTransaction calls
let inflight = 0;
let dropped = 0;

const unwatch = client.watchPendingTransactions({
  onTransactions: (hashes) => {
    for (const hash of hashes) {
      if (inflight >= MAX_INFLIGHT) { dropped++; continue; }  // backpressure: shed load
      inflight++;
      client.getTransaction({ hash })
        .then((tx) => {
          // tx is null if it was already mined/dropped between notify and fetch — skip
          if (tx?.to && getAddress(tx.to) === UNISWAP_ROUTER) {
            console.log('Router tx pending:', {
              from: tx.from, value: tx.value,
              selector: tx.input.slice(0, 10),  // 4-byte function selector
            });
          }
        })
        .catch(() => { /* dropped/replaced tx, or RPC hiccup — ignore */ })
        .finally(() => { inflight--; });
    }
  },
  onError: (e) => console.error('pending sub error (will need re-subscribe):', e.message),
});
```

> Even better: many providers expose a **filtered** subscription (e.g. Alchemy `alchemy_pendingTransactions` with `toAddress`/`fromAddress` filters) so the server only streams txs you care about — far cheaper than fetching every hash. WebSocket subscriptions also silently die; add reconnect-with-backoff and re-subscribe on `onError`/close. Most providers meter pending-tx streams heavily, so confirm your plan supports the volume before relying on it.

### Flashbots MEV-Share event stream (SSE)
```typescript
// Hints about pending transactions/bundles (intentionally partial — privacy-preserving).
// You receive HINTS, not full calldata, so you cannot reconstruct or front-run the original.
const es = new EventSource('https://mev-share.flashbots.net'); // verify current URL in Flashbots docs
es.onmessage = (event) => {
  try {
    const hint = JSON.parse(event.data);   // { hash, logs?, txs?, functionSelector?, ... } — fields are optional
    console.log('MEV-Share hint:', hint.hash);
  } catch { /* keepalive/non-JSON line */ }
};
es.onerror = () => { /* EventSource auto-reconnects; log + monitor */ };
```

> MEV-Share deliberately exposes only *hints*, so do not treat it as a full mempool feed. For backtesting MEV, analyze **landed** transactions historically (Dune `dex.trades` / sandwich-detection spells, or block-builder datasets) rather than racing the live stream.

---

## 9. Building Dashboards

### Architecture
```
Data sources → ETL/Indexer → Database → API → Frontend
  │                                              │
  ├── Dune API (SQL queries, scheduled)          ├── Next.js + Chart.js/Recharts
  ├── Etherscan V2 API (lookups)                 ├── TanStack Query for caching
  ├── The Graph (GraphQL queries/polling)        └── Tailwind for styling
  └── RPC nodes / indexer (custom indexing)
```

> Don't hammer Dune's execute endpoint from the browser on every page load — executions cost credits and take seconds-to-minutes. Pattern: **schedule** the query on Dune (or run it server-side on a cron), then have the frontend read **cached latest results** through your own API route. Keep the Dune key server-side only.

### Dune API Integration (robust: terminal states, HTTP errors, pagination, rate limits)
The common failing pattern only loops while `PENDING`/`EXECUTING` and then blindly reads `result.result.rows` — so a `FAILED`/`CANCELLED`/`EXPIRED` execution either throws an opaque `undefined` error or silently returns nothing, and large result sets are truncated at the first page. Handle all terminal states, check HTTP status, respect 429s, and page via `next_uri`.

```typescript
const DUNE_API_KEY = process.env.DUNE_API_KEY!;
const DUNE = 'https://api.dune.com/api/v1';
const H = { 'X-Dune-API-Key': DUNE_API_KEY };

const TERMINAL_OK = 'QUERY_STATE_COMPLETED';
const TERMINAL_FAIL = new Set([
  'QUERY_STATE_FAILED', 'QUERY_STATE_CANCELLED', 'QUERY_STATE_EXPIRED',
]);

async function duneFetch(url: string, init?: RequestInit, attempt = 0): Promise<any> {
  const res = await fetch(url, init);
  if (res.status === 429) {                       // rate limited → backoff + retry
    if (attempt >= 5) throw new Error('Dune: rate limited, retries exhausted');
    const retryAfter = Number(res.headers.get('retry-after')) || 2 ** attempt;
    await new Promise(r => setTimeout(r, retryAfter * 1000));
    return duneFetch(url, init, attempt + 1);
  }
  if (!res.ok) throw new Error(`Dune HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

// Trigger a fresh execution and wait for a terminal state
async function executeDuneQuery(queryId: number, params?: Record<string, unknown>) {
  const { execution_id } = await duneFetch(`${DUNE}/query/${queryId}/execute`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify(params ? { query_parameters: params } : {}),
  });

  // Poll status (cheap) — not the full results endpoint — until terminal
  for (;;) {
    await new Promise(r => setTimeout(r, 2000));
    const { state } = await duneFetch(`${DUNE}/execution/${execution_id}/status`, { headers: H });
    if (state === TERMINAL_OK) break;
    if (TERMINAL_FAIL.has(state)) throw new Error(`Dune execution ${execution_id} ended in ${state}`);
    // else PENDING / EXECUTING → keep polling
  }
  return fetchAllRows(`${DUNE}/execution/${execution_id}/results?limit=1000`);
}

// Page through every result via next_uri (or next_offset)
async function fetchAllRows(firstUrl: string) {
  const rows: any[] = [];
  let url: string | undefined = firstUrl;
  while (url) {
    const page = await duneFetch(url, { headers: H });
    rows.push(...(page.result?.rows ?? []));
    // Dune returns an absolute next_uri when more pages exist
    url = page.next_uri;
  }
  return rows;
}

// Cached latest results (no credits, no re-execution) — preferred for dashboards
async function getLatestResults(queryId: number) {
  return fetchAllRows(`${DUNE}/query/${queryId}/results?limit=1000`);
}
```

> Parameter typing: Dune `query_parameters` are typed (`text`, `number`, `date` as `YYYY-MM-DD HH:mm:ss`, `enum`). Pass them as the correct JS type or the execution fails validation. There's also a one-shot `POST /query/{id}/execute` + `GET /execution/{id}/results` flow shown here, plus a higher-level "run query" convenience endpoint — check current limits and credit costs at https://docs.dune.com.

### Dashboard Data Patterns
```typescript
// React component with TanStack Query
import { useQuery } from '@tanstack/react-query';

function TVLChart({ queryId }: { queryId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ['tvl', queryId],
    queryFn: () => getLatestResults(queryId),
    staleTime: 5 * 60 * 1000, // 5 min cache
    refetchInterval: 10 * 60 * 1000, // refresh every 10 min
  });

  if (isLoading) return <Skeleton />;

  return (
    <ResponsiveContainer width="100%" height={400}>
      <AreaChart data={data}>
        <XAxis dataKey="day" />
        <YAxis tickFormatter={(v) => `$${(v / 1e6).toFixed(0)}M`} />
        <Tooltip formatter={(v: number) => `$${v.toLocaleString()}`} />
        <Area type="monotone" dataKey="tvl" stroke="#8884d8" fill="#8884d8" fillOpacity={0.3} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

---

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

## 11. Verification & reproducibility checklist
Before you publish any on-chain figure:
1. **State the source and as-of block/time** ("USDC holders as of block N / 2026-06-01 UTC"). On-chain numbers are only meaningful with a timestamp.
2. **Reconcile across ≥2 independent sources** (Dune vs DefiLlama vs your subgraph). Investigate any >5–10% gap before shipping.
3. **Confirm decimals and price keys** (`blockchain` + `contract_address` + `minute`), not symbols.
4. **Cut off at a finalized block** for balances; flag the last ~2 finalized epochs (L1) / recent minutes (L2) as mutable.
5. **Label, don't dox** for wallet work; every wallet label carries `confidence` + `source`; no identity claims without a verifiable citation (see §5).
6. **Note the methodology** for fees vs revenue, FDV vs circulating cap, floor proxy vs live floor — conflating these is the most common way an on-chain analysis misleads.
