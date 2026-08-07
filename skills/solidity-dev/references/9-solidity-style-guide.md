## 9. Solidity Style Guide

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;   // pin EXACTLY (matches foundry.toml/§1); no floating caret in production

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MyToken — A custom ERC20 token
/// @author <Your Name>
/// @notice Use this for demonstration purposes
contract MyToken is ERC20, Ownable {
    // Type declarations
    struct UserInfo { uint128 balance; uint128 lastClaim; }
    enum Status { Active, Paused, Deprecated }

    // State variables (constants → immutables → storage)
    uint256 public constant MAX_SUPPLY = 1_000_000e18;
    address public immutable treasury;
    mapping(address => UserInfo) public users;
    uint256 public totalClaimed;

    // Events
    event Claimed(address indexed user, uint256 amount);

    // Errors
    error ExceedsMaxSupply();
    error AlreadyClaimed();

    // State
    Status public status;

    // Modifiers
    modifier whenActive() {
        require(status == Status.Active, "Not active");
        _;
    }

    constructor(address _treasury) ERC20("MyToken", "MTK") Ownable(msg.sender) {
        treasury = _treasury;
    }

    // External functions
    // Public functions
    // Internal functions
    // Private functions
    // View/pure functions last
}
```

---
