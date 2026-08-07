## Contents

- 3. Common Solidity Patterns
- Factory Pattern
- Minimal Proxy (Clones — EIP-1167)
- UUPS Proxy (Recommended Upgrade Pattern) — OpenZeppelin 5.x
- Diamond Pattern (EIP-2535)

## 3. Common Solidity Patterns

### Factory Pattern
```solidity
contract VaultFactory {
    address[] public vaults;
    event VaultCreated(address indexed vault, address indexed owner);

    function createVault(address token) external returns (address) {
        Vault vault = new Vault(token, msg.sender);
        vaults.push(address(vault));
        emit VaultCreated(address(vault), msg.sender);
        return address(vault);
    }
}
```

### Minimal Proxy (Clones — EIP-1167)
```solidity
import "@openzeppelin/contracts/proxy/Clones.sol";

contract VaultFactory {
    address public immutable implementation;

    constructor() {
        implementation = address(new Vault());
    }

    function createVault(address token, address owner) external returns (address) {
        address clone = Clones.clone(implementation);
        Vault(clone).initialize(token, owner);
        return clone;
    }
}
```
Gas: ~45k to deploy clone vs ~500k+ for full contract.

### UUPS Proxy (Recommended Upgrade Pattern) — OpenZeppelin 5.x
```solidity
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract VaultV1 is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    /// @custom:storage-location erc7201:myapp.storage.Vault
    struct VaultStorage { uint256 fee; }
    // keccak256(abi.encode(uint256(keccak256("myapp.storage.Vault")) - 1)) & ~bytes32(uint256(0xff))
    // solc 0.8.35+: the erc7201 builtin computes this base slot for you; keep the manual keccak formula only for older compilers.
    bytes32 private constant VAULT_STORAGE = 0x.../* compute per ERC-7201 */;
    function _s() private pure returns (VaultStorage storage $) { assembly { $.slot := VAULT_STORAGE } }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(uint256 _fee) external initializer {
        __Ownable_init(msg.sender);   // OZ v5: Ownable/OwnableUpgradeable take an explicit initialOwner
        __UUPSUpgradeable_init();
        _s().fee = _fee;
    }

    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}
}
```
**OpenZeppelin 5.x upgrade-safety notes (mid-2026, Contracts v5.x / 5.4+):**
- **Namespaced storage (ERC-7201)** is the v5 way to lay out upgradeable storage — OZ's own upgradeable contracts use it, which makes the old `uint256[50] __gap` arrays largely unnecessary for *new* code. Annotate your struct with `@custom:storage-location erc7201:...` so the upgrades plugin can validate layout.
- Always validate layout across versions: `forge clean && forge inspect VaultV1 storageLayout` and diff vs the new impl, or use the Hardhat/Foundry **OpenZeppelin Upgrades plugin** (`upgradeProxy` runs `validateUpgrade` automatically).
- v5 constructors changed: `Ownable(initialOwner)` (no longer defaults to `msg.sender`), and most lifecycle logic moved into a single **`_update`** hook (see ERC20 note in §10) instead of the old `_beforeTokenTransfer`/`_afterTokenTransfer`.
- For multi-role systems prefer **`AccessManager` + `AccessManaged`** (v5's centralized, time-delayed authority) over scattering `AccessControl` roles across contracts.

### Diamond Pattern (EIP-2535)
Multiple facets share one storage via delegatecall. Use for large contracts exceeding 24KB limit.
```solidity
// Storage library (shared across facets)
library LibDiamond {
    bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("diamond.storage");
    struct DiamondStorage {
        mapping(bytes4 => address) facets;
        address owner;
    }
    function ds() internal pure returns (DiamondStorage storage d) {
        bytes32 pos = DIAMOND_STORAGE_POSITION;
        assembly { d.slot := pos }
    }
}
```

---
