## Contents

- 1. Uniswap Integration
- Uniswap V3 — Exact Input Swap
- Uniswap V3 — Multi-Hop Swap
- Uniswap V3 — Add Liquidity
- Uniswap V4 — Hooks Overview
- Key Addresses (Ethereum Mainnet)

## 1. Uniswap Integration

### Uniswap V3 — Exact Input Swap

`amountOutMin` is the caller's only protection against sandwich attacks and stale routes. **The caller MUST derive it from a fresh quote** (QuoterV2, see §7) times a slippage factor (never `0`, never `1`). The templates use `SafeERC20` because non-standard tokens (USDT, BNB) return no bool and revert plain `approve`/`transferFrom`. `deadline` is passed in by the caller (computed off-chain), not `block.timestamp`, which a validator can satisfy with an arbitrarily delayed inclusion.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SwapHelper is ReentrancyGuard {
    using SafeERC20 for IERC20;

    ISwapRouter public constant router =
        ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564); // Mainnet SwapRouter

    /// @notice Swap exact amount of tokenIn for tokenOut.
    /// @param amountOutMin  REQUIRED: quote * (1 - slippageBps/1e4). Reverts the tx
    ///                      if the pool can't deliver it. Passing 0 = guaranteed sandwich.
    /// @param deadline      Unix ts computed off-chain (e.g. now + 60s). Not block.timestamp.
    function swapExactInput(
        address tokenIn,
        address tokenOut,
        uint24 fee,       // 100 (0.01%), 500 (0.05%), 3000 (0.3%), 10000 (1%)
        uint256 amountIn,
        uint256 amountOutMin,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountOut) {
        require(amountOutMin > 0, "slippage: amountOutMin must be > 0");
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        // forceApprove resets to 0 first, so it is safe for USDT-style tokens
        // that revert on a non-zero -> non-zero approval change.
        IERC20(tokenIn).forceApprove(address(router), amountIn);

        amountOut = router.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: msg.sender,
                deadline: deadline,
                amountIn: amountIn,
                amountOutMinimum: amountOutMin, // slippage protection — see §7
                sqrtPriceLimitX96: 0
            })
        );
        // Revoke residual allowance (defense-in-depth; exact-input usually spends all).
        IERC20(tokenIn).forceApprove(address(router), 0);
    }
}
```

> **Permit2 / Universal Router:** New integrations should prefer the **Universal Router**
> (`0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af`) with **Permit2**
> (`0x000000000022D473030F116dDEE9F6B43aC78BA3`). Permit2 lets users sign a single
> gasless, time-bounded approval instead of one `approve` per token/spender, and supports
> batched/expiring allowances. `forceApprove(router, amount)` above is the minimal-allowance
> ERC-20 path for the legacy `SwapRouter`.

### Uniswap V3 — Multi-Hop Swap
```solidity
// Inside SwapHelper (uses SafeERC20 + ReentrancyGuard as above).
function swapMultiHop(
    address tokenIn,       // first token in the path
    bytes calldata path,   // abi.encodePacked(tokenA, fee1, tokenB, fee2, tokenC)
    uint256 amountIn,
    uint256 amountOutMin,  // REQUIRED quote-derived bound (see §7); never 0
    uint256 deadline       // off-chain Unix ts
) external nonReentrant returns (uint256 amountOut) {
    require(amountOutMin > 0, "slippage: amountOutMin must be > 0");
    IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
    IERC20(tokenIn).forceApprove(address(router), amountIn);

    amountOut = router.exactInput(ISwapRouter.ExactInputParams({
        path: path,
        recipient: msg.sender,
        deadline: deadline,
        amountIn: amountIn,
        amountOutMinimum: amountOutMin
    }));
    IERC20(tokenIn).forceApprove(address(router), 0);
}
```

### Uniswap V3 — Add Liquidity

Two things the original snippet got dangerously wrong and that you must always do:
1. **Pull the tokens in.** The position manager spends `token0`/`token1` from *this contract*, so the contract must first `safeTransferFrom` both tokens from the user. Approving without transferring just reverts (or, worse, spends a balance the contract happens to hold).
2. **Set real `amount0Min`/`amount1Min`.** `0`/`0` lets the pool consume your tokens at any ratio after a sandwich. Derive them from `amountDesired * (1 - slippageBps/1e4)`. `mint` returns the actually-used `amount0`/`amount1`; refund the remainder and revoke approvals.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract LiquidityHelper is ReentrancyGuard {
    using SafeERC20 for IERC20;

    INonfungiblePositionManager public constant positionManager =
        INonfungiblePositionManager(0xC36442b4a4522E871399CD717aBDD847Ab11FE88);

    /// @param amount0Min,amount1Min  REQUIRED slippage floors (e.g. desired * (1 - bps/1e4)).
    ///                               Never pass 0/0. token0 < token1 must hold.
    /// @param deadline               off-chain Unix ts.
    function addLiquidity(
        address token0,
        address token1,
        uint24 fee,
        int24 tickLower,
        int24 tickUpper,
        uint256 amount0Desired,
        uint256 amount1Desired,
        uint256 amount0Min,
        uint256 amount1Min,
        uint256 deadline
    ) external nonReentrant returns (uint256 tokenId, uint128 liquidity) {
        require(amount0Min > 0 && amount1Min > 0, "slippage: mins must be > 0");

        // 1. Pull both tokens from the user into this contract.
        IERC20(token0).safeTransferFrom(msg.sender, address(this), amount0Desired);
        IERC20(token1).safeTransferFrom(msg.sender, address(this), amount1Desired);

        // 2. Minimal approvals (forceApprove handles USDT-style tokens).
        IERC20(token0).forceApprove(address(positionManager), amount0Desired);
        IERC20(token1).forceApprove(address(positionManager), amount1Desired);

        uint256 used0;
        uint256 used1;
        (tokenId, liquidity, used0, used1) = positionManager.mint(
            INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: fee,
                tickLower: tickLower,
                tickUpper: tickUpper,
                amount0Desired: amount0Desired,
                amount1Desired: amount1Desired,
                amount0Min: amount0Min,   // slippage protection — never 0
                amount1Min: amount1Min,
                recipient: msg.sender,    // NFT goes to the user
                deadline: deadline
            })
        );

        // 3. Revoke approvals and refund unused tokens to the user.
        IERC20(token0).forceApprove(address(positionManager), 0);
        IERC20(token1).forceApprove(address(positionManager), 0);
        if (used0 < amount0Desired) {
            IERC20(token0).safeTransfer(msg.sender, amount0Desired - used0);
        }
        if (used1 < amount1Desired) {
            IERC20(token1).safeTransfer(msg.sender, amount1Desired - used1);
        }
    }
}
```

### Uniswap V4 — Hooks Overview
V4 introduces hooks — custom logic at swap/liquidity lifecycle points. In current
`v4-periphery`, you inherit `BaseHook`, pass the `IPoolManager` to its constructor, and
override the **internal** callbacks (`_beforeSwap`, `_afterSwap`, …) — `BaseHook` exposes the
public `beforeSwap`/`afterSwap` and enforces `onlyPoolManager` + permission checks for you.
`SwapParams` now lives in `v4-core/.../types/PoolOperation.sol` (it was previously
`IPoolManager.SwapParams`). A hook's **deployed address encodes its permissions**, so you must
mine a salt (e.g. `HookMiner.find`) and deploy via CREATE2 to a matching address — see the
deploy/test notes below.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseHook} from "v4-periphery/src/utils/BaseHook.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {SwapParams} from "v4-core/src/types/PoolOperation.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "v4-core/src/types/BeforeSwapDelta.sol";

contract MyHook is BaseHook {
    constructor(IPoolManager _manager) BaseHook(_manager) {}

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,        // Custom pre-swap logic
            afterSwap: false,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    // Override the INTERNAL callback; BaseHook's public beforeSwap calls this
    // after applying onlyPoolManager + permission-flag checks.
    function _beforeSwap(address, PoolKey calldata, SwapParams calldata, bytes calldata)
        internal override returns (bytes4, BeforeSwapDelta, uint24)
    {
        // Custom logic: dynamic fees, TWAP oracle, limit orders, etc.
        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }
}
```

**Deploy & test:** because the low bits of the hook address must match the permission flags,
deploy with CREATE2 using a mined salt:
```solidity
// In a Foundry script/test, using v4-periphery's HookMiner:
uint160 flags = uint160(Hooks.BEFORE_SWAP_FLAG);
(address hookAddr, bytes32 salt) =
    HookMiner.find(CREATE2_DEPLOYER, flags, type(MyHook).creationCode, abi.encode(manager));
MyHook hook = new MyHook{salt: salt}(manager);
require(address(hook) == hookAddr, "hook address mismatch");
```
Verify against the official `IPoolManager` deployment for your chain (the addresses differ per
network and are published in the Uniswap v4 deployments docs — do not hardcode mainnet values
on an L2). Always run the hook through a fork test before mainnet.

### Key Addresses (Ethereum Mainnet)

Mainnet only. **For L2s (Base, Arbitrum, Optimism, Polygon) and V4 contracts the addresses differ** — resolve them at build time from the official Uniswap deployments docs and your chain config; do not assume a mainnet address is valid elsewhere. Always verify on the chain's block explorer before use.
```
Uniswap V3 Router (SwapRouter, deprecated; used in the teaching template above):
                                 0xE592427A0AEce92De3Edee1F18E0157C05861564
Uniswap V3 Factory:              0x1F98431c8aD98523631AE4a59f267346ea31F984
Uniswap V3 Position Manager:     0xC36442b4a4522E871399CD717aBDD847Ab11FE88
Uniswap V3 Quoter V2:            0x61fFE014bA17989E743c5F6cB21bF9697530B21e
Universal Router (current):      0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af
Permit2 (all chains, CREATE2):   0x000000000022D473030F116dDEE9F6B43aC78BA3
WETH:                            0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
USDC:                            0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
USDT:                            0xdAC17F958D2ee523a2206206994597C13D831ec7
DAI:                             0x6B175474E89094C44Da98b954EedeAC495271d0F
```
> V4 `PoolManager`, `PositionManager`, `Universal Router`, and `V4Quoter` addresses are
> chain-specific and listed in the Uniswap v4 deployments docs — fetch them at integration
> time rather than hardcoding.

---
