---
name: defi-integration
description: "Build Solidity/TypeScript DeFi integrations — Uniswap V3/V4, Aave V3, Compound V3, Curve, 1inch/Velora, ERC-4626 vaults: swaps, lending, liquidity, flash loans, yield. Use when writing contract or wallet code that swaps, LPs, borrows, or flash-loans; simulate, set slippage from a live quote, confirm with the user before mainnet."
---

# DeFi Protocol Integration

> **SAFETY — read first.** Every contract in this skill is an **unaudited teaching template**, not production code. Before any mainnet use you MUST: (1) add slippage bounds derived from a live quote/oracle (never `0`/`1`), (2) set real `deadline`s, (3) add reentrancy protection (`ReentrancyGuard` / checks-effects-interactions) on any function that calls external contracts and moves funds, (4) use `SafeERC20` for all token transfers/approvals, (5) dry-run via a fork or Tenderly simulation, (6) verify every address against the official deployment registry for the target chain, and (7) get an independent security **audit**. Do not broadcast a money-moving transaction without explicit user confirmation. See §7 (Slippage & MEV) and §11 (Pre-flight Safety Checklist).

## 1. Uniswap Integration

### Uniswap V3 — Exact Input Swap

`amountOutMin` is the caller's only protection against sandwich attacks and stale routes. **The caller MUST derive it from a fresh quote** (QuoterV2, see §7) times a slippage factor — never `0`, never `1`. We use `SafeERC20` because non-standard tokens (USDT, BNB) return no bool and revert plain `approve`/`transferFrom`. `deadline` is passed in by the caller (computed off-chain), not `block.timestamp`, which a validator can satisfy with an arbitrarily delayed inclusion.

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
> (`0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD`) with **Permit2**
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
Uniswap V3 Router (SwapRouter):  0xE592427A0AEce92De3Edee1F18E0157C05861564
Uniswap V3 Factory:              0x1F98431c8aD98523631AE4a59f267346ea31F984
Uniswap V3 Position Manager:     0xC36442b4a4522E871399CD717aBDD847Ab11FE88
Uniswap V3 Quoter V2:            0x61fFE014bA17989E743c5F6cB21bF9697530B21e
Universal Router:                0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD
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

## 2. Aave V3

### Supply (Deposit)
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract AaveHelper {
    using SafeERC20 for IERC20;

    IPool constant POOL = IPool(0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2); // Mainnet

    function supply(address asset, uint256 amount) external {
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(asset).forceApprove(address(POOL), amount);
        POOL.supply(asset, amount, msg.sender, 0); // onBehalfOf = user -> user gets aTokens
    }

    // Borrowing on behalf of the user requires the user to have delegated credit to this
    // contract (POOL.borrowAllowance via the debt token's approveDelegation). Otherwise call
    // POOL.borrow directly from the user's own account. interestRateMode: 2 = variable
    // (stable-rate borrowing has been disabled on Aave V3 mainnet markets).
    function borrow(address asset, uint256 amount, address user) external {
        POOL.borrow(asset, amount, 2, 0, user);
    }
}
```

### Flash Loan

Inherit Aave's `FlashLoanSimpleReceiverBase` — it wires up `POOL` and `ADDRESSES_PROVIDER`
for you, so you don't re-implement those getters. The two non-negotiable security checks in
`executeOperation`: **(1) `msg.sender == address(POOL)`** (only the Pool may call back) and
**(2) `initiator == address(this)`** (the loan was started by *this* contract, not griefed by a
third party). The premium is read from the callback (`premium`) — do not hardcode it; Aave's
`FLASHLOAN_PREMIUM_TOTAL` is governance-configurable per deployment and can change.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FlashLoanSimpleReceiverBase}
    from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider}
    from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract AaveFlashLoanReceiver is FlashLoanSimpleReceiverBase {
    using SafeERC20 for IERC20;

    // Mainnet PoolAddressesProvider. Resolve per-chain from Aave's address book.
    constructor()
        FlashLoanSimpleReceiverBase(
            IPoolAddressesProvider(0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e)
        )
    {}

    function executeFlashLoan(address asset, uint256 amount) external {
        POOL.flashLoanSimple(address(this), asset, amount, "", 0); // params, referralCode
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata /* params */
    ) external override returns (bool) {
        require(msg.sender == address(POOL), "caller != Aave Pool");
        require(initiator == address(this), "untrusted initiator");

        // --- YOUR ARBITRAGE / LIQUIDATION LOGIC HERE ---
        // You hold `amount` of `asset`. It MUST profitably return at least
        // amount + premium, or this whole transaction reverts (atomic).

        // Approve the Pool to pull repayment. premium comes from the callback,
        // NOT a hardcoded bps — the flash-loan fee is governance-configurable.
        uint256 totalDebt = amount + premium;
        IERC20(asset).forceApprove(address(POOL), totalDebt);
        return true;
    }
}
```

### Aave V3 Key Addresses (Mainnet)
```
Pool:                   0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
PoolAddressesProvider:  0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e
Oracle:                 0x54586bE62E3c3580375aE3723C145253060Ca0C2
```
> **Flash-loan fee is NOT a constant.** `FLASHLOAN_PREMIUM_TOTAL` was historically 0.05%
> (5 bps) on mainnet but is a governance parameter and varies by deployment. Read it at
> runtime: `POOL.FLASHLOAN_PREMIUM_TOTAL()` (returns bps), and in `executeOperation` always
> repay `amount + premium` from the callback. Aave V3 addresses are chain-specific — resolve
> them per network from Aave's official address book, never reuse mainnet values on an L2.

---

## 3. Compound V3 (Comet)

Comet's `supply`/`withdraw` act on `msg.sender` — i.e. the *contract*, not the end user. A
user-facing wrapper must either (a) have the user call Comet directly, or (b) use
`supplyFrom`/`withdrawFrom` with the right account args. The snippet below pulls collateral
from the user and credits *the user's own Comet account* with `supplyFrom(address(this),
user, …)` — `from` is the contract (supplying its own freshly-pulled tokens) so this needs no
operator grant. To borrow, it pulls base out of the *user's* account with
`withdrawFrom(user, user, …)`; because `src` is the user, the user MUST first grant this
contract operator rights via `COMET.allow(wrapper, true)`. Note Comet is single-base-asset
(here USDC): you supply approved collateral assets and can only borrow the base asset.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IComet {
    function supplyFrom(address from, address dst, address asset, uint256 amount) external;
    function withdrawFrom(address src, address to, address asset, uint256 amount) external;
    function baseToken() external view returns (address);
    function isLiquidatable(address account) external view returns (bool);
    function allow(address manager, bool isAllowed) external;
}

contract CometWrapper {
    using SafeERC20 for IERC20;

    IComet constant COMET_USDC = IComet(0xc3d688B66703497DAA19211EEdff47f25384cdc3); // cUSDCv3

    // Supply path needs NO COMET_USDC.allow() grant: `from` below is this contract
    // (supplying tokens it just pulled in), so it acts only on its own Comet account.
    function supplyCollateral(address asset, uint256 amount) external {
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(asset).forceApprove(address(COMET_USDC), amount);
        // Credit the USER's account (dst = msg.sender), not the contract's.
        COMET_USDC.supplyFrom(address(this), msg.sender, asset, amount);
    }

    // Borrow base (USDC) out of the user's OWN Comet account and send it to the user.
    // src = the user, so the user MUST first call COMET_USDC.allow(address(this), true)
    // to make this contract an operator for their account; otherwise this reverts.
    function borrowBaseTo(uint256 amount) external {
        COMET_USDC.withdrawFrom(msg.sender, msg.sender, COMET_USDC.baseToken(), amount);
    }

    function isLiquidatable(address account) external view returns (bool) {
        return COMET_USDC.isLiquidatable(account);
    }
}
```

---

## 4. Curve Finance

### Swap on Curve Stable Pool

`min_dy` is the slippage floor — derive it from `get_dy(i, j, dx) * (1 - slippageBps/1e4)` and
never pass `0`. Pull the input token from the user first, then return the output. (The classic
3pool below is a plain-ERC20 pool; some Curve pools use native ETH or have a separate
`exchange_underlying` for wrapped assets — check the pool.)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
    function coins(uint256 i) external view returns (address);
}

contract CurveSwapHelper {
    using SafeERC20 for IERC20;

    ICurvePool constant THREE_POOL = ICurvePool(0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7);
    address constant DAI  = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    // 3pool indices: 0=DAI, 1=USDC, 2=USDT

    /// @param minOut  REQUIRED slippage floor from get_dy * (1 - bps/1e4); never 0.
    function swapDaiToUsdc(uint256 amountIn, uint256 minOut)
        external returns (uint256 amountOut)
    {
        require(minOut > 0, "slippage: minOut must be > 0");
        IERC20(DAI).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(DAI).forceApprove(address(THREE_POOL), amountIn);
        amountOut = THREE_POOL.exchange(0, 1, amountIn, minOut); // DAI -> USDC
        IERC20(USDC).safeTransfer(msg.sender, amountOut);
    }
}
```

---

## 5. DEX Aggregator Integration

Aggregators return calldata that targets *their* router, which pulls `tokenIn` from the user.
So the user must first approve that router (the aggregator exposes its spender address) — and
you should set a **minimal** allowance, not `MaxUint256`. Always simulate the returned `tx`
(`eth_call` / Tenderly) before signing, and pass a real `slippage`. Keep the API key in an
env var / server proxy, never inline.

```typescript
// 1inch — v6 (https://portal.1inch.dev). $ONEINCH_API_KEY from env; chainId in the path.
const chainId = 1;
const base = `https://api.1inch.dev/swap/v6.0/${chainId}`;
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

## 6. Flash Loan Arbitrage Template

> Each leg below uses a **quote-derived `minOut`**, not `0`. A flash-arb is atomic — if a leg
> underdelivers, the final `require(... >= totalDebt)` reverts the whole tx and you only lose
> gas. But during execution a sandwich can still skim value between your two legs, so set per-
> leg `minOut` from a fresh `getAmountsOut` and submit via a private relay (§7). `0` minimums
> here would directly contradict the rule in §7 ("Never set `amountOutMin = 0`").

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FlashLoanSimpleReceiverBase}
    from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IUniV2Router {
    function swapExactTokensForTokens(
        uint256 amountIn, uint256 amountOutMin, address[] calldata path,
        address to, uint256 deadline
    ) external returns (uint256[] memory amounts);
    function getAmountsOut(uint256 amountIn, address[] calldata path)
        external view returns (uint256[] memory amounts);
}

contract FlashArbitrage is FlashLoanSimpleReceiverBase {
    using SafeERC20 for IERC20;

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(POOL), "caller != Aave Pool");
        require(initiator == address(this), "untrusted initiator");

        // Routers, paths, slippage and an off-chain deadline are passed in by executeFlashLoan.
        (
            IUniV2Router routerA, IUniV2Router routerB,
            address[] memory pathAtoB, address[] memory pathBtoA,
            uint256 slippageBps, uint256 deadline
        ) = abi.decode(params, (IUniV2Router, IUniV2Router, address[], address[], uint256, uint256));

        // Step 1: Buy on DEX A with a quote-derived floor (NEVER 0).
        IERC20(asset).forceApprove(address(routerA), amount);
        uint256 minB = _minOut(routerA, amount, pathAtoB, slippageBps);
        uint256 tokenBAmount =
            routerA.swapExactTokensForTokens(amount, minB, pathAtoB, address(this), deadline)[1];

        // Step 2: Sell on DEX B with a quote-derived floor.
        address tokenB = pathAtoB[pathAtoB.length - 1];
        IERC20(tokenB).forceApprove(address(routerB), tokenBAmount);
        uint256 minBack = _minOut(routerB, tokenBAmount, pathBtoA, slippageBps);
        uint256 received =
            routerB.swapExactTokensForTokens(tokenBAmount, minBack, pathBtoA, address(this), deadline)[1];

        // Step 3: Profitability gate + repay (atomic — reverts on loss).
        uint256 totalDebt = amount + premium;
        require(received >= totalDebt, "No profit after fees");
        IERC20(asset).forceApprove(address(POOL), totalDebt);
        return true;
    }

    function _minOut(IUniV2Router r, uint256 amtIn, address[] memory path, uint256 bps)
        internal view returns (uint256)
    {
        uint256[] memory q = r.getAmountsOut(amtIn, path);
        return q[q.length - 1] * (10_000 - bps) / 10_000;
    }
}
```

---

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

## 8. Yield Strategy Patterns

### Simple Vault (ERC-4626)

OpenZeppelin **Contracts 5.x** has no `_afterDeposit`/`_beforeWithdraw` hooks — those are
Solmate. The current extension points are the internal **`_deposit`** and **`_withdraw`**
(call `super` first, then move funds to/from the strategy). Two correctness musts: (1) keep
`totalAssets()` consistent with where the assets actually are (idle + deployed + accrued), and
(2) defend against the **inflation/donation attack** — override `_decimalsOffset()` to return a
virtual-shares offset (e.g. `6`), which makes the first-depositor share-price manipulation
economically infeasible. Also account for withdrawal liquidity: if assets are deployed in a
strategy, `_withdraw` must pull enough back, and `maxWithdraw` should reflect available
liquidity.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract YieldVault is ERC4626 {
    constructor(IERC20 asset_) ERC4626(asset_) ERC20("Yield Vault", "yVault") {}

    // Virtual shares/assets offset -> mitigates the first-deposit inflation attack.
    function _decimalsOffset() internal pure override returns (uint8) {
        return 6;
    }

    function totalAssets() public view override returns (uint256) {
        // Idle balance + assets currently deployed in the strategy (incl. accrued yield).
        return IERC20(asset()).balanceOf(address(this)) + _deployedAssets();
    }

    // OZ 5.x: hook into _deposit/_withdraw, not _afterDeposit/_beforeWithdraw.
    function _deposit(address caller, address receiver, uint256 assets, uint256 shares)
        internal override
    {
        super._deposit(caller, receiver, assets, shares); // pulls assets, mints shares
        _deployToStrategy(assets);                          // e.g. supply to Aave/Compound
    }

    function _withdraw(
        address caller, address receiver, address owner, uint256 assets, uint256 shares
    ) internal override {
        _redeemFromStrategy(assets); // ensure liquidity before super burns/transfers
        super._withdraw(caller, receiver, owner, assets, shares);
    }

    // --- strategy stubs: implement against your yield source ---
    function _deployedAssets() internal view virtual returns (uint256) {}
    function _deployToStrategy(uint256 assets) internal virtual {}
    function _redeemFromStrategy(uint256 assets) internal virtual {}
}
```

### Strategy Pattern
```
User deposits → Vault → Strategy A (60% Aave)
                      → Strategy B (40% Curve)
Harvest → Compound rewards → Rebalance
```

---

## 9. Protocol Fee Reference

All fees below are governance-/pool-configurable and can change — read them on-chain or from current docs rather than hardcoding.

| Protocol | Fee | Paid by |
|----------|-----|---------|
| Uniswap V3 | 0.01% / 0.05% / 0.3% / 1% (pool-specific) | Swapper |
| Uniswap V4 | Static or dynamic per pool (hook-set) | Swapper |
| Aave V3 flash loan | ~0.05% historically; **read `POOL.FLASHLOAN_PREMIUM_TOTAL()`** | Borrower |
| Aave V3 borrow | Variable APR (market-driven) | Borrower |
| Compound V3 | Variable APR | Borrower |
| Curve | ~0.01–0.04% swap fee (pool-specific) | Swapper |
| 1inch / Velora | No protocol fee (aggregator; positive-slippage policy varies) | — |
| Balancer V2 | Pool-specific (0.01–10%) | Swapper |

---

## 10. Fork Testing DeFi

Pin the fork to a **recent** block via an env var (`$FORK_BLOCK`) rather than a hardcoded
2024-era number — old blocks miss protocol upgrades, new routers, and changed liquidity.
Leaving it unset forks the latest block. Note these tests use a realistic `amountOutMinimum`
computed from the quote rather than `1`, mirroring production.

```solidity
// test/DeFiFork.t.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";

contract DeFiForkTest is Test {
    uint256 mainnetFork;

    function setUp() public {
        // FORK_BLOCK: a recent block (set in CI/env). Unset -> latest block.
        string memory rpc = vm.envString("ETH_RPC_URL");
        uint256 blockNo = vm.envOr("FORK_BLOCK", uint256(0));
        mainnetFork = blockNo == 0 ? vm.createFork(rpc) : vm.createFork(rpc, blockNo);
        vm.selectFork(mainnetFork);
    }

    function test_aaveSupplyAndBorrow() public {
        address user = makeAddr("user");
        deal(USDC, user, 10_000e6);

        vm.startPrank(user);
        IERC20(USDC).approve(address(POOL), 10_000e6);
        POOL.supply(USDC, 10_000e6, user, 0);
        assertGt(IERC20(A_USDC).balanceOf(user), 0, "no aTokens minted");

        // Borrow ETH against USDC collateral (variable rate = 2).
        POOL.borrow(WETH, 1e18, 2, 0, user);
        assertEq(IERC20(WETH).balanceOf(user), 1e18, "borrowed WETH mismatch");
        vm.stopPrank();
    }

    function test_uniswapSwap() public {
        address user = makeAddr("user");
        deal(WETH, user, 10e18);

        // Size minOut from the live quote (callStatic off-chain; here via the quoter iface).
        (uint256 expectedOut, , , ) = quoter.quoteExactInputSingle(
            IQuoterV2.QuoteExactInputSingleParams(WETH, USDC, 10e18, 3000, 0)
        );
        uint256 minOut = expectedOut * 9950 / 10_000; // 0.5% slippage

        vm.startPrank(user);
        IERC20(WETH).approve(address(router), 10e18);
        uint256 usdcOut = router.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: WETH, tokenOut: USDC, fee: 3000,
                recipient: user, deadline: block.timestamp + 60,
                amountIn: 10e18, amountOutMinimum: minOut, sqrtPriceLimitX96: 0
            })
        );
        assertGe(usdcOut, minOut, "slippage breached");
        vm.stopPrank();
    }
}
```

```bash
# Run fork tests against a recent block
export ETH_RPC_URL=https://mainnet.infura.io/v3/<your-key>
export FORK_BLOCK=<recent-block-number>   # omit to fork the latest block
forge test --match-contract DeFiForkTest -vvv
```

---

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

## Related skills
For deeper coverage see the sibling skills: `solidity-dev` (language/Foundry patterns),
`smart-contract-auditor` (security review), `wallet-integration` (connect/sign/UX), and
`onchain-analytics` (reading positions/prices).
