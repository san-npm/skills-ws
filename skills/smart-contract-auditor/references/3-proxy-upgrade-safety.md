## Contents

- 3. Proxy / Upgrade Safety
- UUPS vs Transparent Proxy
- Initializer Pattern
- Storage Layout Rules

## 3. Proxy / Upgrade Safety

### UUPS vs Transparent Proxy

Both are first-class and actively supported in OpenZeppelin v5. Choose on tradeoffs, not on "newer = better":

| Aspect | UUPS | Transparent |
|--------|------|-------------|
| Upgrade logic | In the implementation (`_authorizeUpgrade`) | In the proxy, gated by `ProxyAdmin` |
| Gas (user calls) | Lower (no per-call admin check) | Slightly higher (admin selector check) |
| Main upgrade risk | A too-permissive `_authorizeUpgrade` lets an attacker upgrade to malicious logic; an implementation with no upgrade entrypoint reachable can become non-upgradeable | Extra proxy/`ProxyAdmin` surface; admin can't call non-admin functions (selector clash handling) |
| Bricking risk | If you deploy an implementation that *removes* `UUPSUpgradeable`/the upgrade path, the proxy is frozen at that logic forever | `ProxyAdmin` is a separate contract; losing its owner key freezes upgrades |
| Best for | Most new deployments where gas matters and upgrade auth is well-controlled | Systems wanting upgrade logic fully isolated from app logic |

> Note: missing the `_authorizeUpgrade` override does **not** silently brick a contract — `UUPSUpgradeable` is `abstract` and omitting the override fails to compile. The real severe bug is an `_authorizeUpgrade` that is empty/public or guarded by the wrong role, enabling **unauthorized upgrades**. Always confirm it is gated by a trusted role/owner.

**Upgrade governance to audit (both patterns):**
- Who can upgrade? `_authorizeUpgrade` modifier (UUPS) or `ProxyAdmin` owner (Transparent). Confirm it is a multisig/timelock, not an EOA.
- Is the upgrade behind a **timelock** (e.g., OZ `TimelockController`) so users can exit before a malicious upgrade lands?
- `ProxyAdmin` ownership: in OZ v5 `TransparentUpgradeableProxy` deploys its own `ProxyAdmin` owned by the initial-admin address — verify that address and its key custody.
- Is there an **emergency pause** independent of the upgrade path? An upgrade should not be the only incident response.
- Validate every upgrade with `@openzeppelin/upgrades-core` (`forge` users: `openzeppelin-foundry-upgrades` `Upgrades.upgradeProxy(...)` runs storage-layout safety checks in CI).

### Initializer Pattern
```solidity
contract VaultV1 is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    uint256 public fee;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(uint256 _fee) external initializer {
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();
        fee = _fee;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}
}
```

### Storage Layout Rules
1. **Never** reorder or remove existing storage variables
2. **Never** change variable types (uint128 → uint256 changes slot)
3. **Always** append new variables after existing ones
4. Run `forge inspect V1 storage-layout` vs `forge inspect V2 storage-layout` and diff (or let `openzeppelin-foundry-upgrades` enforce it in CI)

**Two storage patterns — know which the codebase uses:**

*Legacy (OpenZeppelin Contracts-Upgradeable v4.x): sequential slots + storage gaps.* Variables live in sequential slots, so each base contract reserves trailing slots for future fields:
```solidity
// v4 upgradeable base
uint256 public fee;
uint256[49] private __gap; // reserve slots so adding a field later doesn't collide with a child
```
Audit: gap size must shrink by exactly the number of slots newly added fields consume, or the next contract in the inheritance chain collides.

*Modern (OpenZeppelin Contracts v5, ERC-7201 "namespaced storage").* v5 upgradeable contracts no longer use `__gap`; each module stores state in a struct at a computed, collision-resistant slot. There is nothing to reorder across the inheritance tree, which removes the whole class of gap/collision bugs:
```solidity
/// @custom:storage-location erc7201:myapp.storage.Vault
struct VaultStorage { uint256 fee; mapping(address => uint256) balances; }

// slot = keccak256(abi.encode(uint256(keccak256("myapp.storage.Vault")) - 1)) & ~bytes32(uint256(0xff))
bytes32 private constant VAULT_STORAGE = 0x...; // precomputed
function _vault() private pure returns (VaultStorage storage $) {
    assembly { $.slot := VAULT_STORAGE }
}
```
Audit for v5/ERC-7201: each namespace string is unique; the `@custom:storage-location` annotation matches the computed constant; structs are only ever **extended** (append fields), never reordered; and `forge inspect <C> storage-layout` shows the expected namespaced roots. Mixing legacy `__gap` bases with v5 namespaced bases in one inheritance tree is a red flag — confirm the dependency versions agree.

---
