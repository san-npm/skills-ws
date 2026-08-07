## Contents

- 4. Curve Finance
- Swap on Curve Stable Pool

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
