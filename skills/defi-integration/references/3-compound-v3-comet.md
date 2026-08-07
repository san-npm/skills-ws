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
