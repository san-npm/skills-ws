## Contents

- 7. Slippage & MEV Protection
- Slippage Calculation
- MEV Protection Strategies

## 7. Slippage & MEV Protection

### Slippage Calculation

QuoterV2 takes a **params struct** and returns **multiple values** (not the old positional
single return). It is **not** a `view` function (it reverts internally and decodes the revert),
so call it off-chain via `staticCall`/`callStatic` to size `minOut`, then pass that `minOut`
into the swap. Prefer an independent price source (Chainlink / a TWAP) as a sanity check —
QuoterV2 reads the same pool an attacker can move.

```solidity
import {IQuoterV2} from "@uniswap/v3-periphery/contracts/interfaces/IQuoterV2.sol";

IQuoterV2 constant quoter = IQuoterV2(0x61fFE014bA17989E743c5F6cB21bF9697530B21e);

// Off-chain (ethers/viem): const { amountOut } = await quoter.callStatic
//   .quoteExactInputSingle({ tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0 });
(uint256 expectedOut, , , ) = quoter.quoteExactInputSingle(
    IQuoterV2.QuoteExactInputSingleParams({
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        amountIn: amountIn,
        fee: fee,
        sqrtPriceLimitX96: 0
    })
);
uint256 minOut = expectedOut * (10_000 - slippageBps) / 10_000; // e.g. 50 bps = 0.5%
```

### MEV Protection Strategies
1. **Flashbots Protect**: submit txs via `https://rpc.flashbots.net` — private mempool, no public sandwiching.
2. **Deadline parameter**: compute the deadline **off-chain** (e.g. `Math.floor(Date.now()/1000) + 60`) and pass it in. Inside a contract, `block.timestamp + N` is a no-op against censorship — a validator can satisfy any future timestamp by simply delaying inclusion.
3. **Slippage bounds**: Never set `amountOutMin = 0` (or `1`, or `amount0Min/amount1Min = 0`) — a sandwich is then guaranteed. Always derive the bound from a fresh quote (QuoterV2 / `getAmountsOut`) times `(1 - slippageBps/1e4)`.
4. **Private RPCs**: MEV Blocker (`https://rpc.mevblocker.io`), Flashbots Protect — route money-moving txs through one rather than the public mempool.
5. **Independent price check**: validate the quoted price against a Chainlink feed or a Uniswap TWAP before trusting a single-pool quote (the pool you quote is the pool an attacker moves).
6. **EIP-1559 tips**: use a reasonable `maxPriorityFeePerGas` to avoid overpaying.

---
