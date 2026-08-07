## 5. DEX Aggregator Integration

Aggregators return calldata that targets *their* router, which pulls `tokenIn` from the user.
So the user must first approve that router (the aggregator exposes its spender address) — and
you should set a **minimal** allowance, not `MaxUint256`. Always simulate the returned `tx`
(`eth_call` / Tenderly) before signing, and pass a real `slippage`. Keep the API key in an
env var / server proxy, never inline.

```typescript
// 1inch Classic Swap v6.1 (docs: https://business.1inch.com/portal). $ONEINCH_API_KEY from env; chainId in the path.
const chainId = 1;
const base = `https://api.1inch.dev/swap/v6.1/${chainId}`;
const auth = { headers: { Authorization: `Bearer ${process.env.ONEINCH_API_KEY}` } };

// 1) Ensure the user has approved 1inch's router as spender (minimal allowance).
const { address: spender } = await (
  await fetch(`${base}/approve/spender`, auth)
).json();
// ...check IERC20(tokenIn).allowance(user, spender) and prompt an approve tx if too low...

// 2) Build the swap tx (server-side; never expose the key to the browser).
const res = await fetch(
  `${base}/swap?src=${tokenIn}&dst=${tokenOut}&amount=${amountIn}` +
    `&from=${userAddress}&origin=${userAddress}&slippage=0.5`, // slippage in %, not 0
  auth,
);
const { tx } = await res.json();

// 3) Simulate, then let the USER confirm before broadcasting.
await provider.call({ to: tx.to, data: tx.data, value: tx.value, from: userAddress });
await signer.sendTransaction({ to: tx.to, data: tx.data, value: tx.value, gas: tx.gas });
```

```typescript
// Velora (formerly ParaSwap). ParaSwap rebranded to Velora and the v5 API
// (apiv5.paraswap.io) is deprecated — use the current v6.2+ API. Confirm the exact
// host/paths and required fields at the live docs (https://developers.velora.xyz) since
// the surface evolves; the flow is: price -> build tx -> simulate -> sign.
const API = "https://api.paraswap.io"; // current host serves the v6.2 API; verify in docs

const priceRoute = await (
  await fetch(
    `${API}/prices?srcToken=${tokenIn}&destToken=${tokenOut}` +
      `&amount=${amountIn}&srcDecimals=18&destDecimals=6&side=SELL&network=1`,
  )
).json();

const txData = await (
  await fetch(`${API}/transactions/1?ignoreChecks=false`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      srcToken: tokenIn,
      destToken: tokenOut,
      srcAmount: priceRoute.priceRoute.srcAmount,
      // slippage-protected min received; derive from the route, do not send 0
      destAmount: priceRoute.priceRoute.destAmount,
      priceRoute: priceRoute.priceRoute,
      userAddress,
      slippage: 50, // 0.5% in bps
    }),
  })
).json();
// The user must approve Velora's TokenTransferProxy (in priceRoute.tokenTransferProxy)
// before this tx; simulate, then have the user confirm.
```

---
