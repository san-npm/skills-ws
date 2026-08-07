## Contents

- 8. Mempool Monitoring
- Watching pending transactions — with batching, filtering, and backpressure
- Flashbots MEV-Share event stream (SSE)

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
