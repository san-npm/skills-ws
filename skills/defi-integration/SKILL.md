---
name: defi-integration
description: "Integrate DeFi protocols — Uniswap, Aave, Compound, Curve. Swaps, lending, liquidity, flash loans, and yield strategies."
---

# DeFi Protocol Integration

## 1. Uniswap Integration

### Uniswap V3 — Exact Input Swap
```solidity
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SwapHelper {
    ISwapRouter public constant router =
        ISwapRouter(0xE592427A0AEce92De3Edee1F18E0157C05861564); // Mainnet

    /// @notice Swap exact amount of tokenIn for tokenOut
    function swapExactInput(
        address tokenIn,
        address tokenOut,
        uint24 fee,       // 500 (0.05%), 3000 (0.3%), 10000 (1%)
        uint256 amountIn,
        uint256 amountOutMin
    ) external returns (uint256 amountOut) {
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenIn).approve(address(router), amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: msg.sender,
                deadline: block.timestamp + 300,
                amountIn: amountIn,
                amountOutMinimum: amountOutMin, // slippage protection
                sqrtPriceLimitX96: 0
            });

        amountOut = router.exactInputSingle(params);
    }
}
```

### Uniswap V3 — Multi-Hop Swap
```solidity
function swapMultiHop(
    bytes memory path,     // abi.encodePacked(tokenA, fee1, tokenB, fee2, tokenC)
    uint256 amountIn,
    uint256 amountOutMin
) external returns (uint256) {
    IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
    IERC20(tokenIn).approve(address(router), amountIn);

    ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
        path: path,
        recipient: msg.sender,
        deadline: block.timestamp + 300,
        amountIn: amountIn,
        amountOutMinimum: amountOutMin
    });

    return router.exactInput(params);
}
```

### Uniswap V3 — Add Liquidity
```solidity
import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";

INonfungiblePositionManager public constant positionManager =
    INonfungiblePositionManager(0xC36442b4a4522E871399CD717aBDD847Ab11FE88);

function addLiquidity(
    address token0,
    address token1,
    uint24 fee,
    int24 tickLower,
    int24 tickUpper,
    uint256 amount0Desired,
    uint256 amount1Desired
) external returns (uint256 tokenId) {
    IERC20(token0).approve(address(positionManager), amount0Desired);
    IERC20(token1).approve(address(positionManager), amount1Desired);

    INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager
        .MintParams({
            token0: token0,
            token1: token1,
            fee: fee,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: 0,
            amount1Min: 0,
            recipient: msg.sender,
            deadline: block.timestamp + 300
        });

    (tokenId, , , ) = positionManager.mint(params);
}
```

### Uniswap V4 — Hooks Overview
V4 introduces hooks — custom logic at swap/liquidity lifecycle points:
```solidity
import {BaseHook} from "v4-periphery/BaseHook.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";

contract MyHook is BaseHook {
    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: true,        // Custom pre-swap logic
            afterSwap: true,         // Custom post-swap logic
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: false,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function beforeSwap(address, PoolKey calldata, IPoolManager.SwapParams calldata, bytes calldata)
        external override returns (bytes4, BeforeSwapDelta, uint24)
    {
        // Custom logic: dynamic fees, TWAP oracle, limit orders, etc.
        return (BaseHook.beforeSwap.selector, BeforeSwapDeltaLibrary.ZERO_DELTA, 0);
    }
}
```

### Key Addresses (Ethereum Mainnet)
```
Uniswap V3 Router:           0xE592427A0AEce92De3Edee1F18E0157C05861564
Uniswap V3 Factory:          0x1F98431c8aD98523631AE4a59f267346ea31F984
Uniswap V3 Position Manager: 0xC36442b4a4522E871399CD717aBDD847Ab11FE88
Uniswap V3 Quoter V2:        0x61fFE014bA17989E743c5F6cB21bF9697530B21e
Universal Router:             0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD
WETH:                         0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
USDC:                         0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
USDT:                         0xdAC17F958D2ee523a2206206994597C13D831ec7
DAI:                          0x6B175474E89094C44Da98b954EedeAC495271d0F
```

---

## 2. Aave V3

### Supply (Deposit)
```solidity
import {IPool} from "@aave/v3-core/contracts/interfaces/IPool.sol";

IPool constant POOL = IPool(0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2); // Mainnet

function supply(address asset, uint256 amount) external {
    IERC20(asset).transferFrom(msg.sender, address(this), amount);
    IERC20(asset).approve(address(POOL), amount);
    POOL.supply(asset, amount, msg.sender, 0);
    // msg.sender receives aTokens (interest-bearing)
}
```

### Borrow
```solidity
function borrow(address asset, uint256 amount, uint256 interestRateMode) external {
    // interestRateMode: 1 = stable, 2 = variable
    // Must have sufficient collateral supplied first
    POOL.borrow(asset, amount, interestRateMode, 0, msg.sender);
}
```

### Flash Loan
```solidity
import {IFlashLoanSimpleReceiver} from "@aave/v3-core/contracts/flashloan/base/FlashLoanSimpleReceiver.sol";
import {IPoolAddressesProvider} from "@aave/v3-core/contracts/interfaces/IPoolAddressesProvider.sol";

contract FlashLoanReceiver is IFlashLoanSimpleReceiver {
    IPoolAddressesProvider public constant ADDRESSES_PROVIDER =
        IPoolAddressesProvider(0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e);

    function executeFlashLoan(address asset, uint256 amount) external {
        IPool(ADDRESSES_PROVIDER.getPool()).flashLoanSimple(
            address(this),
            asset,
            amount,
            "",    // params
            0      // referralCode
        );
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        // --- YOUR ARBITRAGE / LIQUIDATION LOGIC HERE ---
        // You have `amount` of `asset` available

        // Repay flash loan + premium (0.05% fee on Aave V3)
        uint256 totalDebt = amount + premium;
        IERC20(asset).approve(msg.sender, totalDebt); // msg.sender = Pool
        return true;
    }

    function POOL() public view override returns (IPool) {
        return IPool(ADDRESSES_PROVIDER.getPool());
    }

    function ADDRESSES_PROVIDER() public view override returns (IPoolAddressesProvider) {
        return ADDRESSES_PROVIDER;
    }
}
```

### Aave V3 Key Addresses (Mainnet)
```
Pool:                   0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
PoolAddressesProvider:  0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e
Oracle:                 0x54586bE62E3c3580375aE3723C145253060Ca0C2
Flash loan fee:         0.05% (5 bps)
```

---

## 3. Compound V3 (Comet)

```solidity
import {IComet} from "./interfaces/IComet.sol";

IComet constant COMET_USDC = IComet(0xc3d688B66703497DAA19211EEdff47f25384cdc3); // cUSDCv3

// Supply collateral
function supplyCollateral(address asset, uint256 amount) external {
    IERC20(asset).approve(address(COMET_USDC), amount);
    COMET_USDC.supply(asset, amount);
}

// Borrow base asset (USDC)
function borrow(uint256 amount) external {
    COMET_USDC.withdraw(COMET_USDC.baseToken(), amount);
}

// Check account health
function isLiquidatable(address account) external view returns (bool) {
    return COMET_USDC.isLiquidatable(account);
}
```

---

## 4. Curve Finance

### Swap on Curve Stable Pool
```solidity
interface ICurvePool {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256);
    function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256);
}

ICurvePool constant THREE_POOL = ICurvePool(0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7);
// 3pool indices: 0=DAI, 1=USDC, 2=USDT

function swapStables(uint256 amountIn, uint256 minOut) external {
    IERC20(DAI).approve(address(THREE_POOL), amountIn);
    uint256 amountOut = THREE_POOL.exchange(0, 1, amountIn, minOut); // DAI → USDC
}
```

---

## 5. DEX Aggregator Integration

### 1inch API Pattern
```typescript
// Frontend: fetch quote from 1inch API
const quote = await fetch(
  `https://api.1inch.dev/swap/v6.0/1/swap?` +
  `src=${tokenIn}&dst=${tokenOut}&amount=${amountIn}` +
  `&from=${userAddress}&slippage=0.5`,
  { headers: { Authorization: `Bearer ${API_KEY}` } }
);
const { tx } = await quote.json();

// Execute swap via returned tx data
await signer.sendTransaction({
  to: tx.to,
  data: tx.data,
  value: tx.value,
  gasLimit: tx.gas,
});
```

### Paraswap Pattern
```typescript
const priceRoute = await fetch(
  `https://apiv5.paraswap.io/prices?srcToken=${tokenIn}&destToken=${tokenOut}` +
  `&amount=${amountIn}&network=1&srcDecimals=18&destDecimals=6`
);
const route = await priceRoute.json();

const txData = await fetch('https://apiv5.paraswap.io/transactions/1', {
  method: 'POST',
  body: JSON.stringify({
    srcToken: tokenIn, destToken: tokenOut,
    srcAmount: amountIn, slippage: 50, // 0.5%
    priceRoute: route.priceRoute,
    userAddress: userAddress,
  }),
});
```

---

## 6. Flash Loan Arbitrage Template

```solidity
contract FlashArbitrage is IFlashLoanSimpleReceiver {
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address,
        bytes calldata
    ) external override returns (bool) {
        // Step 1: Buy cheap on DEX A
        IERC20(asset).approve(address(routerA), amount);
        uint256 tokenBAmount = routerA.swapExactTokensForTokens(
            amount, 0, pathAtoB, address(this), block.timestamp
        )[1];

        // Step 2: Sell expensive on DEX B
        IERC20(tokenB).approve(address(routerB), tokenBAmount);
        uint256 profit = routerB.swapExactTokensForTokens(
            tokenBAmount, 0, pathBtoA, address(this), block.timestamp
        )[1];

        // Step 3: Repay flash loan
        uint256 totalDebt = amount + premium;
        require(profit >= totalDebt, "No profit");
        IERC20(asset).approve(msg.sender, totalDebt);
        return true;
    }
}
```

---

## 7. Slippage & MEV Protection

### Slippage Calculation
```solidity
// Calculate minimum output with slippage tolerance
uint256 expectedOut = quoter.quoteExactInputSingle(tokenIn, tokenOut, fee, amountIn, 0);
uint256 minOut = expectedOut * (10000 - slippageBps) / 10000; // e.g., 50 bps = 0.5%
```

### MEV Protection Strategies
1. **Flashbots Protect**: Submit txs via `https://rpc.flashbots.net` — private mempool
2. **Deadline parameter**: Always set `deadline = block.timestamp + 300` (5 min)
3. **Slippage bounds**: Never set `amountOutMin = 0` — sandwich attack guaranteed
4. **Private RPCs**: MEV Blocker (`https://rpc.mevblocker.io`), Flashbots
5. **EIP-1559 tips**: Use reasonable `maxPriorityFeePerGas` to avoid overpaying

---

## 8. Yield Strategy Patterns

### Simple Vault (ERC-4626)
```solidity
import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";

contract YieldVault is ERC4626 {
    constructor(IERC20 asset_) ERC4626(asset_) ERC20("Yield Vault", "yVault") {}

    function totalAssets() public view override returns (uint256) {
        // Return total value managed: deposited + yield earned
        return IERC20(asset()).balanceOf(address(this)) + _calculateYield();
    }

    function _afterDeposit(uint256 assets, uint256) internal override {
        // Deploy assets to yield source (Aave, Compound, etc.)
        _deployToAave(assets);
    }

    function _beforeWithdraw(uint256 assets, uint256) internal override {
        // Withdraw from yield source
        _withdrawFromAave(assets);
    }
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

| Protocol | Fee | Paid by |
|----------|-----|---------|
| Uniswap V3 | 0.01% / 0.05% / 0.3% / 1% (pool-specific) | Swapper |
| Aave V3 flash loan | 0.05% (5 bps) | Borrower |
| Aave V3 borrow | Variable APR (market-driven) | Borrower |
| Compound V3 | Variable APR | Borrower |
| Curve | 0.04% swap fee (most pools) | Swapper |
| 1inch | No protocol fee (aggregator) | — |
| Balancer V2 | Pool-specific (0.01-10%) | Swapper |

---

## 10. Fork Testing DeFi

```solidity
// test/DeFiFork.t.sol
contract DeFiForkTest is Test {
    uint256 mainnetFork;

    function setUp() public {
        mainnetFork = vm.createFork(vm.envString("ETH_RPC_URL"), 19500000);
        vm.selectFork(mainnetFork);
    }

    function test_aaveSupplyAndBorrow() public {
        address user = makeAddr("user");
        deal(USDC, user, 10_000e6);

        vm.startPrank(user);
        IERC20(USDC).approve(address(POOL), 10_000e6);
        POOL.supply(USDC, 10_000e6, user, 0);

        // Borrow ETH against USDC collateral
        POOL.borrow(WETH, 1e18, 2, 0, user);
        assertGt(IERC20(WETH).balanceOf(user), 0);
        vm.stopPrank();
    }

    function test_uniswapSwap() public {
        address user = makeAddr("user");
        deal(WETH, user, 10e18);

        vm.startPrank(user);
        IERC20(WETH).approve(address(router), 10e18);
        uint256 usdcOut = router.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: WETH, tokenOut: USDC, fee: 3000,
                recipient: user, deadline: block.timestamp,
                amountIn: 10e18, amountOutMinimum: 1, sqrtPriceLimitX96: 0
            })
        );
        assertGt(usdcOut, 0);
        vm.stopPrank();
    }
}
```

```bash
# Run fork tests
forge test --fork-url $ETH_RPC_URL --match-contract DeFiForkTest -vvv
```
