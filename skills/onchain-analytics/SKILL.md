---
name: onchain-analytics
description: "On-chain data analysis — Dune Analytics, Etherscan APIs, The Graph, token flows, wallet profiling, and protocol metrics."
---

# On-Chain Analytics

## 1. Dune Analytics SQL Queries

### Token Holder Analysis
```sql
-- Top 100 holders of a token
SELECT
    "to" AS holder,
    SUM(CASE WHEN "to" = holder THEN value ELSE 0 END) -
    SUM(CASE WHEN "from" = holder THEN value ELSE 0 END) AS balance
FROM erc20_ethereum.evt_Transfer
WHERE contract_address = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 -- USDC
GROUP BY 1
HAVING balance > 0
ORDER BY balance DESC
LIMIT 100;
```

### Token Holder Distribution
```sql
-- Concentration analysis: what % of supply do top holders own?
WITH balances AS (
    SELECT
        "to" AS holder,
        SUM(CASE WHEN "to" = holder THEN value ELSE -value END) / 1e6 AS balance_usd
    FROM erc20_ethereum.evt_Transfer
    WHERE contract_address = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
    GROUP BY 1
    HAVING SUM(CASE WHEN "to" = holder THEN value ELSE -value END) > 0
),
ranked AS (
    SELECT holder, balance_usd,
        ROW_NUMBER() OVER (ORDER BY balance_usd DESC) AS rank,
        SUM(balance_usd) OVER () AS total_supply
    FROM balances
)
SELECT
    CASE
        WHEN rank <= 10 THEN 'Top 10'
        WHEN rank <= 50 THEN 'Top 11-50'
        WHEN rank <= 100 THEN 'Top 51-100'
        ELSE 'Rest'
    END AS tier,
    COUNT(*) AS holders,
    SUM(balance_usd) AS total_balance,
    SUM(balance_usd) / MAX(total_supply) * 100 AS pct_of_supply
FROM ranked
GROUP BY 1
ORDER BY MIN(rank);
```

### DEX Volume (Uniswap V3)
```sql
-- Daily Uniswap V3 volume on Ethereum
SELECT
    DATE_TRUNC('day', evt_block_time) AS day,
    COUNT(*) AS num_swaps,
    SUM(
        CASE
            WHEN token0 = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 -- WETH
            THEN ABS(amount0) / 1e18 * p.price
            ELSE ABS(amount1) / 1e18 * p.price
        END
    ) AS volume_usd
FROM uniswap_v3_ethereum.Pair_evt_Swap s
LEFT JOIN prices.usd p ON p.symbol = 'ETH' AND p.minute = DATE_TRUNC('minute', s.evt_block_time)
WHERE evt_block_time >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1;
```

### Protocol TVL
```sql
-- Simplified TVL tracking for a lending protocol
SELECT
    DATE_TRUNC('day', evt_block_time) AS day,
    SUM(CASE WHEN event_type = 'deposit' THEN amount_usd ELSE -amount_usd END)
        OVER (ORDER BY DATE_TRUNC('day', evt_block_time)) AS cumulative_tvl
FROM protocol_events
WHERE evt_block_time >= NOW() - INTERVAL '90 days'
ORDER BY 1;
```

### Whale Tracking
```sql
-- Large transfers (>$1M) in the last 24 hours
SELECT
    evt_block_time,
    "from",
    "to",
    value / POWER(10, t.decimals) AS amount,
    value / POWER(10, t.decimals) * p.price AS value_usd,
    t.symbol
FROM erc20_ethereum.evt_Transfer tr
JOIN tokens.erc20 t ON t.contract_address = tr.contract_address AND t.blockchain = 'ethereum'
LEFT JOIN prices.usd p ON p.contract_address = tr.contract_address
    AND p.minute = DATE_TRUNC('minute', tr.evt_block_time)
    AND p.blockchain = 'ethereum'
WHERE evt_block_time >= NOW() - INTERVAL '24 hours'
    AND value / POWER(10, t.decimals) * p.price > 1000000
ORDER BY value_usd DESC
LIMIT 50;
```

---

## 2. Etherscan API

### Setup
```typescript
const ETHERSCAN_API = 'https://api.etherscan.io/api';
const API_KEY = process.env.ETHERSCAN_API_KEY;

async function etherscanQuery(params: Record<string, string>) {
  const url = `${ETHERSCAN_API}?${new URLSearchParams({ ...params, apikey: API_KEY! })}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status !== '1' && data.message !== 'OK') throw new Error(data.result);
  return data.result;
}
```

### Account Balance
```typescript
// Single address ETH balance
const balance = await etherscanQuery({
  module: 'account', action: 'balance',
  address: '0x...', tag: 'latest',
});
console.log(`Balance: ${Number(balance) / 1e18} ETH`);

// Multi-address balance (up to 20)
const balances = await etherscanQuery({
  module: 'account', action: 'balancemulti',
  address: '0xAddr1,0xAddr2,0xAddr3', tag: 'latest',
});
```

### Transaction List
```typescript
// Normal transactions
const txs = await etherscanQuery({
  module: 'account', action: 'txlist',
  address: '0x...', startblock: '0', endblock: '99999999',
  page: '1', offset: '100', sort: 'desc',
});

// ERC20 token transfers
const tokenTxs = await etherscanQuery({
  module: 'account', action: 'tokentx',
  address: '0x...', startblock: '0', endblock: '99999999',
  page: '1', offset: '100', sort: 'desc',
});

// Internal transactions (contract calls)
const internalTxs = await etherscanQuery({
  module: 'account', action: 'txlistinternal',
  address: '0x...', startblock: '0', endblock: '99999999',
});
```

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

### Rate Limits
```
Free tier: 5 calls/second, 100k calls/day
Pro tier: 10 calls/second, unlimited calls
```

---

## 3. The Graph — Subgraph Queries

### Uniswap V3 Subgraph
```typescript
const UNISWAP_SUBGRAPH = 'https://gateway.thegraph.com/api/[api-key]/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV';

async function querySubgraph(query: string, variables?: Record<string, any>) {
  const res = await fetch(UNISWAP_SUBGRAPH, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  return (await res.json()).data;
}
```

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

### Alchemy — Token Balances
```typescript
const alchemyUrl = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`;

// Get all token balances for an address
const tokenBalances = await fetch(alchemyUrl, {
  method: 'POST',
  body: JSON.stringify({
    jsonrpc: '2.0', id: 1,
    method: 'alchemy_getTokenBalances',
    params: ['0xAddress', 'erc20'],
  }),
}).then(r => r.json());

// Get token metadata
const metadata = await fetch(alchemyUrl, {
  method: 'POST',
  body: JSON.stringify({
    jsonrpc: '2.0', id: 1,
    method: 'alchemy_getTokenMetadata',
    params: ['0xTokenAddress'],
  }),
}).then(r => r.json());

// Get NFTs owned by address
const nfts = await fetch(
  `${alchemyUrl}/getNFTs?owner=0xAddress&withMetadata=true`
).then(r => r.json());

// Get asset transfers (token movements)
const transfers = await fetch(alchemyUrl, {
  method: 'POST',
  body: JSON.stringify({
    jsonrpc: '2.0', id: 1,
    method: 'alchemy_getAssetTransfers',
    params: [{
      fromBlock: '0x0',
      toBlock: 'latest',
      fromAddress: '0xAddress',
      category: ['erc20', 'erc721', 'erc1155', 'external'],
      maxCount: '0x64',
    }],
  }),
}).then(r => r.json());
```

---

## 5. Wallet Profiling

### Activity Pattern Analysis
```sql
-- Dune: wallet activity fingerprint
WITH activity AS (
    SELECT
        "from" AS wallet,
        DATE_TRUNC('hour', block_time) AS hour,
        COUNT(*) AS tx_count,
        SUM(gas_used * gas_price) / 1e18 AS gas_spent_eth
    FROM ethereum.transactions
    WHERE "from" = 0xWalletAddress
        AND block_time >= NOW() - INTERVAL '90 days'
    GROUP BY 1, 2
)
SELECT
    EXTRACT(DOW FROM hour) AS day_of_week,
    EXTRACT(HOUR FROM hour) AS hour_of_day,
    SUM(tx_count) AS total_txs,
    AVG(tx_count) AS avg_txs_per_hour,
    SUM(gas_spent_eth) AS total_gas_eth
FROM activity
GROUP BY 1, 2
ORDER BY total_txs DESC;
```

### Protocol Interaction Map
```sql
-- Which protocols does a wallet interact with?
SELECT
    t."to" AS contract,
    COALESCE(l.name, CONCAT('0x', SUBSTR(CAST(t."to" AS VARCHAR), 3, 8), '...')) AS protocol,
    COUNT(*) AS interactions,
    MIN(block_time) AS first_seen,
    MAX(block_time) AS last_seen,
    SUM(value / 1e18) AS total_eth_sent
FROM ethereum.transactions t
LEFT JOIN labels.all l ON l.address = t."to" AND l.blockchain = 'ethereum'
WHERE t."from" = 0xWalletAddress
    AND block_time >= NOW() - INTERVAL '365 days'
    AND t."to" IS NOT NULL
GROUP BY 1, 2
ORDER BY interactions DESC
LIMIT 20;
```

---

## 6. DeFi Metrics

### TVL Calculation
```sql
-- Protocol TVL from deposit/withdraw events
SELECT
    DATE_TRUNC('day', evt_block_time) AS day,
    SUM(SUM(deposit_usd) - SUM(withdraw_usd)) OVER (ORDER BY DATE_TRUNC('day', evt_block_time)) AS tvl
FROM (
    SELECT evt_block_time, amount * price AS deposit_usd, 0 AS withdraw_usd
    FROM protocol.deposits d
    JOIN prices.usd p ON p.contract_address = d.asset AND p.minute = DATE_TRUNC('minute', d.evt_block_time)
    UNION ALL
    SELECT evt_block_time, 0, amount * price
    FROM protocol.withdrawals w
    JOIN prices.usd p ON p.contract_address = w.asset AND p.minute = DATE_TRUNC('minute', w.evt_block_time)
) combined
GROUP BY 1
ORDER BY 1;
```

### Protocol Revenue
```sql
-- Fee revenue for a DEX
SELECT
    DATE_TRUNC('day', evt_block_time) AS day,
    SUM(fee_amount_usd) AS daily_fees,
    SUM(protocol_fee_usd) AS protocol_revenue,   -- goes to treasury
    SUM(lp_fee_usd) AS lp_revenue                 -- goes to LPs
FROM dex_trades
WHERE project = 'uniswap'
    AND blockchain = 'ethereum'
    AND block_time >= NOW() - INTERVAL '30 days'
GROUP BY 1
ORDER BY 1;
```

### Key DeFi Metrics Reference
| Metric | Formula | Source |
|--------|---------|--------|
| TVL | Sum of all deposited assets | On-chain events |
| Volume (24h) | Sum of trade amounts in 24h | Swap events |
| Fees (24h) | Volume × fee rate | Swap events |
| Revenue | Protocol's share of fees | Fee split config |
| P/F ratio | FDV / annualized fees | Token price + fees |
| P/S ratio | FDV / annualized revenue | Token price + revenue |

---

## 7. NFT Analytics

### Collection Stats (Dune)
```sql
-- Floor price and volume for an NFT collection
SELECT
    DATE_TRUNC('day', block_time) AS day,
    COUNT(*) AS sales,
    SUM(amount_usd) AS volume_usd,
    MIN(amount_usd) AS floor_price_usd,
    AVG(amount_usd) AS avg_price_usd,
    MAX(amount_usd) AS max_price_usd
FROM nft.trades
WHERE nft_contract_address = 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D -- BAYC
    AND block_time >= NOW() - INTERVAL '30 days'
    AND amount_usd > 0
GROUP BY 1
ORDER BY 1;
```

### Holder Analysis
```sql
-- Current NFT holders and their holding counts
SELECT
    "to" AS holder,
    COUNT(DISTINCT token_id) AS nfts_held
FROM nft.transfers
WHERE contract_address = 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D
    AND "to" NOT IN (SELECT "from" FROM nft.transfers WHERE contract_address = 0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D AND token_id = nft.transfers.token_id AND evt_block_number > nft.transfers.evt_block_number)
GROUP BY 1
ORDER BY nfts_held DESC
LIMIT 50;
```

---

## 8. Mempool Monitoring

### Using WebSocket
```typescript
import { createPublicClient, webSocket } from 'viem';
import { mainnet } from 'viem/chains';

const client = createPublicClient({
  chain: mainnet,
  transport: webSocket('wss://eth-mainnet.g.alchemy.com/v2/KEY'),
});

// Watch pending transactions
const unwatch = client.watchPendingTransactions({
  onTransactions: (hashes) => {
    for (const hash of hashes) {
      // Fetch full tx to inspect
      client.getTransaction({ hash }).then((tx) => {
        if (tx && tx.to === UNISWAP_ROUTER) {
          console.log('Uniswap swap detected:', {
            from: tx.from,
            value: tx.value,
            input: tx.input.slice(0, 10), // function selector
          });
        }
      });
    }
  },
});
```

### Flashbots Mempool (Protect API)
```typescript
// Subscribe to Flashbots MEV-Share event stream
const eventSource = new EventSource('https://mev-share.flashbots.net');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('MEV-Share event:', data);
};
```

---

## 9. Building Dashboards

### Architecture
```
Data sources → ETL/Indexer → Database → API → Frontend
  │                                              │
  ├── Dune API (SQL queries, scheduled)          ├── Next.js + Chart.js/Recharts
  ├── Etherscan API (real-time)                  ├── TanStack Query for caching
  ├── The Graph (GraphQL subscriptions)          └── Tailwind for styling
  └── RPC nodes (custom indexing)
```

### Dune API Integration
```typescript
const DUNE_API_KEY = process.env.DUNE_API_KEY;

// Execute a query
async function executeDuneQuery(queryId: number, params?: Record<string, any>) {
  const res = await fetch(`https://api.dune.com/api/v1/query/${queryId}/execute`, {
    method: 'POST',
    headers: {
      'X-Dune-API-Key': DUNE_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query_parameters: params }),
  });
  const { execution_id } = await res.json();

  // Poll for results
  let result;
  do {
    await new Promise((r) => setTimeout(r, 2000));
    const statusRes = await fetch(
      `https://api.dune.com/api/v1/execution/${execution_id}/results`,
      { headers: { 'X-Dune-API-Key': DUNE_API_KEY! } }
    );
    result = await statusRes.json();
  } while (result.state === 'QUERY_STATE_PENDING' || result.state === 'QUERY_STATE_EXECUTING');

  return result.result.rows;
}

// Get latest results (cached, no re-execution)
async function getLatestResults(queryId: number) {
  const res = await fetch(
    `https://api.dune.com/api/v1/query/${queryId}/results`,
    { headers: { 'X-Dune-API-Key': DUNE_API_KEY! } }
  );
  return (await res.json()).result.rows;
}
```

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

| Service | Endpoint | Free tier |
|---------|----------|-----------|
| Etherscan | api.etherscan.io | 5 req/s, 100k/day |
| Dune | api.dune.com | 2,500 credits/month |
| The Graph (decentralized) | gateway.thegraph.com | 100k queries/month |
| Alchemy | eth-mainnet.g.alchemy.com | 300M compute units/month |
| Infura | mainnet.infura.io | 100k req/day |
| DefiLlama | api.llama.fi | Unlimited (no key) |
| CoinGecko | api.coingecko.com | 10-30 req/min |
| Moralis | deep-index.moralis.io | 40k compute units/day |

### DefiLlama (No API Key!)
```typescript
// Protocol TVL
const tvl = await fetch('https://api.llama.fi/tvl/aave').then(r => r.json());

// All protocols
const protocols = await fetch('https://api.llama.fi/protocols').then(r => r.json());

// Historical chain TVL
const chainTvl = await fetch('https://api.llama.fi/v2/historicalChainTvl/Ethereum').then(r => r.json());

// Token prices
const prices = await fetch(
  'https://coins.llama.fi/prices/current/ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'
).then(r => r.json());
```
