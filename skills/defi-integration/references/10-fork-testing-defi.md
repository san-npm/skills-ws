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
// Interface imports and address constants (USDC, WETH, A_USDC, POOL, router, quoter)
// as declared in Sections 1-2.

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
