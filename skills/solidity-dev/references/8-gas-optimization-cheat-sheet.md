## Contents

- 8. Gas Optimization Cheat Sheet
- Storage Packing
- calldata vs memory
- Unchecked Math (safe loops)
- Custom Errors
- Cache Storage Reads
- Immutable & Constant
- Short-Circuit Evaluation
- Batch Operations
- Transient storage for reentrancy locks (Cancun+, use with care)
- EVM version targets (set evmversion explicitly — it changes available opcodes AND gas)
- Optimizer & viaIR tradeoffs (measure, don't guess)
- Gas measurement workflow (numbers beat intuition)

## 8. Gas Optimization Cheat Sheet

### Storage Packing
```solidity
// BAD: 3 slots (96 bytes)
uint256 amount;     // slot 0
uint128 timestamp;  // slot 1
bool active;        // slot 2

// GOOD: 2 slots (64 bytes)
uint128 timestamp;  // slot 0 (16 bytes)
bool active;        // slot 0 (packed — 1 byte)
uint256 amount;     // slot 1
```

### calldata vs memory
```solidity
// ~600 gas cheaper per call for read-only arrays
function process(uint256[] calldata ids) external { ... }  // GOOD
function process(uint256[] memory ids) external { ... }    // BAD for external
```

### Unchecked Math (safe loops)
```solidity
for (uint256 i; i < len; ) {
    // ... loop body
    unchecked { ++i; }  // saves ~80 gas per iteration
}
```

### Custom Errors
```solidity
error InsufficientBalance(uint256 available, uint256 required);
if (balance < amount) revert InsufficientBalance(balance, amount);
// Saves ~200+ gas vs require("Insufficient balance")
```

### Cache Storage Reads
```solidity
uint256 _totalSupply = totalSupply; // 1 SLOAD (~2100 gas)
// Use _totalSupply multiple times instead of re-reading storage
```

### Immutable & Constant
```solidity
uint256 public constant FEE_BPS = 30;           // Inlined at compile time — free
address public immutable FACTORY;                 // Set once in constructor — cheap read
constructor() { FACTORY = msg.sender; }
```

### Short-Circuit Evaluation
```solidity
require(amount > 0 && balances[msg.sender] >= amount);
// If amount == 0, SLOAD for balances is skipped
```

### Batch Operations
```solidity
// Instead of N separate transactions, batch into one
function batchTransfer(address[] calldata to, uint256[] calldata amounts) external {
    require(to.length == amounts.length, "len");
    for (uint256 i; i < to.length; ) {
        _transfer(msg.sender, to[i], amounts[i]);
        unchecked { ++i; }
    }
}
```

### Transient storage for reentrancy locks (Cancun+, use with care)
```solidity
// EVM must target cancun or later. Transient storage is auto-cleared at end of tx —
// cheaper than an SSTORE/SSTORE lock, but ONLY safe for data that must reset per-tx.
contract ReentrancyGuardTransient {
    // bytes32(uint256(keccak256("reentrancy.guard")) - 1)
    bytes32 private constant LOCK = 0x...;
    modifier nonReentrant() {
        require(_tload(LOCK) == 0, "reentrant");
        _tstore(LOCK, 1);
        _;
        _tstore(LOCK, 0); // cleared anyway at tx end, but explicit is clearer
    }
    function _tload(bytes32 s) private view returns (uint256 v) { assembly { v := tload(s) } }
    function _tstore(bytes32 s, uint256 v) private { assembly { tstore(s, v) } }
}
```
> OZ ships `ReentrancyGuardTransient` in v5 — prefer it over rolling your own. **Footgun:** never use transient storage for state that must persist across calls within different transactions, and remember a value set in one external call is still visible to re-entrant calls *within the same tx* — that's exactly what makes it a valid lock, but a bug if you treat it as permanent state.

### EVM version targets (set `evm_version` explicitly — it changes available opcodes AND gas)
| `evm_version` | Notable for gas/features | When to target |
|---------------|--------------------------|----------------|
| `paris` | Pre-PUSH0. Needed for chains/L2s that haven't shipped Shanghai. | Only legacy/non-Shanghai chains. |
| `shanghai` | Adds `PUSH0` (cheaper constant pushes, smaller bytecode). | Safe broad default if a chain lacks Cancun. |
| `cancun` | `TSTORE`/`TLOAD` (transient storage), `MCOPY` (cheap memory copy), `BLOBHASH`, blob (EIP-4844) data. **Default from solc 0.8.25 through 0.8.29** (0.8.30 defaults to `prague`, 0.8.31+ to `osaka`). | Conservative cross-chain floor; many L2s still lag mainnet. Mainnet itself is on osaka. |
| `prague` / pectra | Pectra-era opcodes/precompiles; supported by recent 0.8.28+ compilers. Mainnet ran Prague from May to Dec 2025, now superseded by osaka. | Chains still on the Prague hardfork; verify per-chain. |
| `osaka` | Fusaka-era opcodes/precompiles; compiler default since solc 0.8.31. | Ethereum mainnet (live since Dec 3, 2025); verify L2 support per chain. |
| L2-specific | Many L2s lag mainnet hardforks and price calldata/state differently. | **Check the chain's docs before targeting cancun/prague on an L2.** |

### Optimizer & viaIR tradeoffs (measure, don't guess)
- `optimizer_runs` is a **deploy-vs-runtime knob**, not a quality dial. Low runs (≈200) → smaller, cheaper-to-deploy bytecode; high runs (e.g. `1_000_000`) → bigger bytecode but cheaper repeated calls. Pick based on whether the contract is called millions of times or deployed many times.
- `via_ir = true` can unlock extra optimizations and fixes `Stack too deep`, but changes codegen — **always gas-diff and re-test** (see §1 note). Don't assume it's always cheaper.
- Watch the **24,576-byte runtime size limit** (EIP-170): `forge build --sizes`. If you're over, split logic, use libraries, or a proxy/diamond — not a higher optimizer setting.

### Gas measurement workflow (numbers beat intuition)
```bash
# 1. Per-function gas report from your tests
forge test --gas-report

# 2. Snapshot total gas of every test, commit it, and diff after a change
forge snapshot                       # writes .gas-snapshot
forge snapshot --diff .gas-snapshot  # shows +/- per test vs the committed baseline
forge snapshot --check               # CI gate: fail if gas regressed

# 3. Compare two configs cleanly (e.g. via_ir on vs off, or different runs)
FOUNDRY_PROFILE=default forge snapshot --snap .gas-default
forge build --via-ir && forge snapshot --snap .gas-ir
# diff .gas-default .gas-ir

# 4. Inspect deployed/runtime size against the EIP-170 limit
forge build --sizes
```
> Optimize against **measured** report/snapshot deltas on realistic inputs, not micro-rules. A change that saves 80 gas in a loop but adds 5k to deploy can be a net loss depending on usage.

---
