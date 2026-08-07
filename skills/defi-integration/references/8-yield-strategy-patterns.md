## Contents

- 8. Yield Strategy Patterns
- Simple Vault (ERC-4626)
- Strategy Pattern

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
