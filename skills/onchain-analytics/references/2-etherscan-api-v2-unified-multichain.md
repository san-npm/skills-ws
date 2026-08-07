## Contents

- 2. Etherscan API (V2 — unified multichain)
- Setup
- Account Balance
- Transaction List (with pagination)
- Contract ABI
- Gas Tracker
- Rate Limits (as of Jun 2026 — verify at https://etherscan.io/apis)

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
| Pro Plus | 30 calls/sec | 1,500,000/day |

There is no "unlimited" consumer tier — paid plans raise the per-second and daily caps. Always implement the backoff shown in the Setup block; bursting past the per-second limit returns `NOTOK` with a rate-limit message, not an HTTP 429.

---
