## Contents

- 5. Gas Optimization Patterns
- Storage Packing
- calldata vs memory
- Unchecked Arithmetic
- Custom Errors vs Require Strings
- Cache Storage Reads
- Short-Circuit Conditionals

## 5. Gas Optimization Patterns

### Storage Packing
Each storage slot is 32 bytes. Adjacent fields whose sizes sum to ≤ 32 bytes share a slot; a `uint256` always takes a full slot. Order fields so the sub-32-byte ones are adjacent.
```solidity
// BEFORE: 3 slots — the uint256 between the small fields breaks packing
uint128 timestamp;  // slot 0 (lower 16 bytes)
uint256 amount;     // slot 1 (full slot — forces a new slot)
uint96  reward;     // slot 2 (12 bytes) + ...
bool    active;     // slot 2 (1 byte) — packs with reward, but amount cost us a slot

// AFTER: 2 slots — group the packable fields, put the full-slot uint256 last
uint128 timestamp;  // slot 0 (bytes 0–15)
uint96  reward;     // slot 0 (bytes 16–27)  — packed
bool    active;     // slot 0 (byte  28)      — packed (16+12+1 = 29 ≤ 32)
uint256 amount;     // slot 1 (full slot)
```
Verify with `forge inspect <Contract> storage-layout` — confirm `slot` values and that small fields share a slot (same `slot`, increasing `offset`). Packing only saves gas when those fields are read/written together; a cold field that's rarely touched may not be worth packing.

### calldata vs memory
```solidity
// BEFORE: copies array to memory (~expensive)
function process(uint256[] memory ids) external { ... }

// AFTER: reads directly from calldata (~cheap, read-only)
function process(uint256[] calldata ids) external { ... }
```

### Unchecked Arithmetic
```solidity
// BEFORE
for (uint256 i = 0; i < len; i++) { ... } // overflow check on i each iteration

// AFTER
for (uint256 i = 0; i < len; ) {
    ...
    unchecked { ++i; } // safe: i < len guarantees no overflow
}
```

### Custom Errors vs Require Strings
```solidity
// BEFORE: stores string in bytecode
require(amount > 0, "Amount must be greater than zero"); // ~24 bytes

// AFTER: 4-byte selector only
error ZeroAmount();
if (amount == 0) revert ZeroAmount(); // 4 bytes
```

### Cache Storage Reads
```solidity
// BEFORE: reads the `totalStaked` storage slot on every loop iteration (N+1 SLOADs)
function rewardShare(address[] calldata users) external view returns (uint256 r) {
    for (uint256 i; i < users.length; ++i) {
        r += staked[users[i]] * 1e18 / totalStaked; // SLOAD of totalStaked each pass
    }
}

// AFTER: hoist the invariant storage read into a local (1 SLOAD)
function rewardShare(address[] calldata users) external view returns (uint256 r) {
    uint256 _total = totalStaked;            // cache once
    require(_total != 0, "no stake");        // guard the divisor
    for (uint256 i; i < users.length; ++i) {
        r += staked[users[i]] * 1e18 / _total;
    }
}
```
The same applies to repeated reads of `array.length` and struct fields in a loop — read once into a local.

### Short-Circuit Conditionals
```solidity
// Put cheap check first
require(amount > 0 && balances[msg.sender] >= amount); // SLOAD only if amount > 0
```

---
