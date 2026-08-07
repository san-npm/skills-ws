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
import {IPoolAddressesProvider}
    from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
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

    constructor(IPoolAddressesProvider provider) FlashLoanSimpleReceiverBase(provider) {}

    // An executeFlashLoan entry function (encoding routers/paths/slippageBps/deadline into
    // params) follows the Section 2 pattern.

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
