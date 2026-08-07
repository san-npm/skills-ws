## Contents

- 11. Pre-flight Safety Checklist (money-moving transactions)
- Frontend simulation (ethers/viem) before signing

## 11. Pre-flight Safety Checklist (money-moving transactions)

These contracts are **unaudited templates**. Before any mainnet transaction — from a contract
or a wallet/frontend — confirm every item below. Do not broadcast a fund-moving tx without
**explicit user confirmation**.

- [ ] **Chain ID guard.** Assert the connected `chainId` matches the addresses you're using; a mainnet router address on an L2 is a different (possibly malicious) contract.
- [ ] **Verified addresses.** Every router/pool/token resolved from the official deployment registry for that chain and checked on the block explorer (verified source). Never trust an address from user input or an unpinned API field without validation.
- [ ] **Quote-derived slippage.** `amountOutMin` / `amount*Min` come from a fresh quote × `(1 - slippageBps/1e4)` — never `0`/`1`. Cross-check against a Chainlink feed or TWAP; reject if price impact exceeds a cap (e.g. > 1–3%).
- [ ] **Off-chain deadline.** Computed client-side (`now + 60s`), not `block.timestamp`.
- [ ] **Minimal allowances.** Approve the exact `amountIn` (or use Permit2 with an expiry); revoke residual allowance after. Avoid `MaxUint256` approvals to routers.
- [ ] **Simulate first.** Dry-run with `eth_call`/`callStatic`, a Foundry fork, or a Tenderly simulation, and surface the expected output + token-balance diff to the user.
- [ ] **Private submission.** Route money-moving txs through a private relay (Flashbots Protect / MEV Blocker) rather than the public mempool.
- [ ] **Reentrancy + CEI.** Any function making external calls and moving funds uses `nonReentrant` and checks-effects-interactions.
- [ ] **No secrets in client code.** API keys (1inch/Velora, RPC) live in env vars / a server proxy — never shipped to the browser. Use placeholders like `$ONEINCH_API_KEY`, `<your-key>`, `0xYourWalletAddress` in examples.
- [ ] **Audit.** Get an independent security review before handling real user funds, and add invariant/fuzz tests for vault accounting and arbitrage profitability.

### Frontend simulation (ethers/viem) before signing
```typescript
// 1) Right chain?
const net = await provider.getNetwork();
if (net.chainId !== 1n) throw new Error(`Wrong chain: ${net.chainId}`);

// 2) Static-call the exact tx to catch reverts + see the output, BEFORE prompting to sign.
try {
  await provider.call({ to: tx.to, data: tx.data, value: tx.value ?? 0n, from: userAddress });
} catch (e) {
  throw new Error("Swap would revert (slippage/allowance/liquidity) — not broadcasting");
}

// 3) Optional: Tenderly simulation for a full asset-diff the user can review.
// POST https://api.tenderly.co/api/v1/account/<acct>/project/<proj>/simulate
//   { network_id, from, to, input, value, save: true }  // returns balance changes + trace

// 4) Only now, with user confirmation, send via a private RPC.
await signer.sendTransaction({ to: tx.to, data: tx.data, value: tx.value });
```
