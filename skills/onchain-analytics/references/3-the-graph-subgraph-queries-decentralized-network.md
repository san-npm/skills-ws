## Contents

- 3. The Graph — Subgraph Queries (decentralized network)
- Querying a subgraph (gateway + error handling)
- Top Pools by TVL
- Token Price and Volume
- Recent Swaps
- Aave V3 Subgraph

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
