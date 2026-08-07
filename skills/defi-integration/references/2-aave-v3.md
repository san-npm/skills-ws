## Contents

- 2. Aave V3
- Supply (Deposit)
- Flash Loan
- Aave V3 Key Addresses (Mainnet)

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
