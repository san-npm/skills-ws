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
