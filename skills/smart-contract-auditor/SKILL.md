---
name: smart-contract-auditor
description: "Comprehensive smart contract security auditing skill. Covers static analysis tooling (Slither, Mythril, Aderyn), fuzz testing (Foundry, Echidna), vulnerability detection with Solidity code examples, proxy/upgrade safety, DeFi-specific audit patterns, gas optimization, and structured audit report generation."
---

# Smart Contract Auditor v2.0

## 1. Tooling Setup

### Slither (Static Analysis)
```bash
pip3 install slither-analyzer
slither . --filter-paths "node_modules|lib"
slither . --print human-summary
slither . --detect reentrancy-eth,reentrancy-no-eth,arbitrary-send-erc20
slither . --print contract-summary  # function visibility overview
```

### Mythril (Symbolic Execution)
```bash
pip3 install mythril
myth analyze contracts/Vault.sol --solv 0.8.20 --execution-timeout 300
myth analyze contracts/Vault.sol --max-depth 30 -o jsonv2
```

### Aderyn (Rust-based Analyzer)
```bash
cargo install aderyn
aderyn .  # outputs report.md by default
aderyn . --output aderyn-report.json
```

### Foundry Fuzzing
```bash
forge test --fuzz-runs 10000
forge test --fuzz-runs 50000 --match-test testFuzz
forge test --fuzz-seed 42 --fuzz-runs 10000  # reproducible
```

Foundry fuzz test example:
```solidity
function testFuzz_withdraw(uint256 amount) public {
    amount = bound(amount, 1, address(vault).balance);
    vault.deposit{value: amount}();
    uint256 pre = address(this).balance;
    vault.withdraw(amount);
    assertEq(address(this).balance, pre + amount);
}
```

### Echidna (Property-Based Fuzzing)
```bash
brew install echidna  # or download binary
echidna . --contract VaultEchidna --test-mode assertion --test-limit 50000
```

Echidna invariant example:
```solidity
contract VaultEchidna is Vault {
    function echidna_total_balance_matches() public view returns (bool) {
        return address(this).balance >= totalDeposited;
    }
}
```

---

## 2. Vulnerability Checklist

### 2.1 Reentrancy

**Vulnerable:**
```solidity
function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount);
    (bool ok, ) = msg.sender.call{value: amount}("");
    require(ok);
    balances[msg.sender] -= amount; // STATE AFTER CALL — reentrancy
}
```

**Fixed (CEI Pattern):**
```solidity
function withdraw(uint256 amount) external nonReentrant {
    require(balances[msg.sender] >= amount);
    balances[msg.sender] -= amount;       // EFFECTS first
    (bool ok, ) = msg.sender.call{value: amount}(""); // INTERACTION last
    require(ok);
}
```

Cross-function reentrancy: check if any two functions share state and one has an external call before state update.

### 2.2 Oracle Manipulation / Price Feed Attacks

**Vulnerable (spot price):**
```solidity
function getPrice() public view returns (uint256) {
    (uint112 r0, uint112 r1, ) = pair.getReserves();
    return (uint256(r1) * 1e18) / uint256(r0); // manipulable in same tx
}
```

**Fixed (Chainlink + staleness check):**
```solidity
function getPrice() public view returns (uint256) {
    (, int256 answer, , uint256 updatedAt, ) = priceFeed.latestRoundData();
    require(answer > 0, "invalid price");
    require(block.timestamp - updatedAt < 3600, "stale price");
    return uint256(answer);
}
```

Also consider TWAP for on-chain pricing:
```solidity
// Uniswap V3 TWAP — use OracleLibrary.consult(pool, twapInterval)
```

### 2.3 Flash Loan Attack Vectors

Audit checks:
- Can any single-tx deposit + action + withdraw exploit state?
- Are governance votes protected by minimum holding periods?
- Are liquidity-based calculations snapshottable in one block?

**Guard pattern:**
```solidity
mapping(address => uint256) public lastDepositBlock;

function deposit() external {
    lastDepositBlock[msg.sender] = block.number;
    // ...
}

function vote() external {
    require(block.number > lastDepositBlock[msg.sender], "same block");
    // ...
}
```

### 2.4 Storage Collisions in Proxies

**Problem:** Proxy and implementation share storage. Misaligned slots corrupt data.

```solidity
// Implementation V1
contract V1 {
    uint256 public value;    // slot 0
    address public owner;    // slot 1
}

// Implementation V2 — WRONG: inserted variable shifts slots
contract V2 {
    uint256 public value;    // slot 0
    uint256 public newVar;   // slot 1 — COLLISION with owner!
    address public owner;    // slot 2
}

// Implementation V2 — CORRECT: append only
contract V2 {
    uint256 public value;    // slot 0
    address public owner;    // slot 1
    uint256 public newVar;   // slot 2 — safe, appended
}
```

Use `forge inspect ContractName storage-layout` to verify slot alignment between versions.

### 2.5 Front-Running / Sandwich Attacks / MEV

**Vulnerable swap:**
```solidity
function swap(uint256 amountIn) external {
    router.swapExactTokensForTokens(amountIn, 0, path, msg.sender, block.timestamp);
    // amountOutMin = 0 allows sandwich
}
```

**Fixed:**
```solidity
function swap(uint256 amountIn, uint256 minOut, uint256 deadline) external {
    require(block.timestamp <= deadline, "expired");
    router.swapExactTokensForTokens(amountIn, minOut, path, msg.sender, deadline);
}
```

For sensitive operations, use commit-reveal:
```solidity
mapping(bytes32 => uint256) public commits;

function commit(bytes32 hash) external { commits[hash] = block.number; }

function reveal(uint256 value, bytes32 salt) external {
    bytes32 h = keccak256(abi.encodePacked(value, salt, msg.sender));
    require(commits[h] > 0 && block.number > commits[h] + 1, "too early");
    delete commits[h];
    _execute(value);
}
```

### 2.6 Access Control Issues

**Vulnerable (tx.origin):**
```solidity
function withdraw() external {
    require(tx.origin == owner); // phishing attack via malicious contract
}
```

**Fixed:**
```solidity
function withdraw() external {
    require(msg.sender == owner); // or use OpenZeppelin Ownable/AccessControl
}
```

Check for:
- Missing access modifiers on admin functions
- Single-step ownership transfer (use Ownable2Step)
- DEFAULT_ADMIN_ROLE granted too broadly
- Functions that should be `onlyOwner` but are `public`

### 2.7 Integer Overflow/Underflow

**Pre-0.8.0 (vulnerable):**
```solidity
// Solidity <0.8.0
uint8 balance = 255;
balance += 1; // wraps to 0 silently

// Fix: use SafeMath
balance = balance.add(1); // reverts on overflow
```

**Post-0.8.0:** Built-in overflow checks. But `unchecked {}` blocks bypass them:
```solidity
unchecked {
    uint8 x = 255;
    x += 1; // wraps to 0 — intentional? Audit this.
}
```

Audit every `unchecked` block. Verify the math genuinely cannot overflow.

### 2.8 Unchecked External Calls

**Vulnerable:**
```solidity
payable(to).send(amount); // return value ignored — funds may not arrive
token.transfer(to, amount); // non-standard tokens may return false
```

**Fixed:**
```solidity
(bool ok, ) = payable(to).call{value: amount}("");
require(ok, "ETH transfer failed");

// For ERC20:
SafeERC20.safeTransfer(token, to, amount);
```

Also check: `delegatecall` return values, low-level `call` without length check.

### 2.9 Denial of Service Patterns

**Unbounded loop (gas griefing):**
```solidity
// VULNERABLE: attacker adds thousands of entries
function distributeRewards() external {
    for (uint i = 0; i < recipients.length; i++) {
        token.transfer(recipients[i], rewards[i]); // OOG if array is huge
    }
}
```

**Fixed (pull pattern):**
```solidity
mapping(address => uint256) public pendingRewards;

function claimReward() external {
    uint256 amount = pendingRewards[msg.sender];
    pendingRewards[msg.sender] = 0;
    token.safeTransfer(msg.sender, amount);
}
```

Other DoS vectors:
- External call in loop (one revert blocks all)
- Block gas limit reached via large array iteration
- Griefing via forced revert in `receive()` / `fallback()`

---

## 3. Proxy / Upgrade Safety

### UUPS vs Transparent Proxy

| Aspect | UUPS | Transparent |
|--------|------|-------------|
| Upgrade logic | In implementation | In proxy |
| Gas (user calls) | Lower | Higher (admin check) |
| Risk | Forgetting `_authorizeUpgrade` = bricked | More complex proxy |
| Recommended | Yes (OpenZeppelin default) | Legacy |

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
4. Use storage gaps for future-proofing:
```solidity
uint256[50] private __gap; // reserve 50 slots for future vars
```
5. Run `forge inspect V1 storage-layout` vs `forge inspect V2 storage-layout` and diff

---

## 4. DeFi-Specific Audit

### AMM Invariants
- Constant product: `k = reserveA * reserveB` must hold after every swap
- Check for rounding manipulation on small liquidity pools
- Verify fee calculations don't break invariant
- LP token mint/burn must be proportional to liquidity added/removed

### Lending Protocol Checks
- Collateral factor bounds (can't be set to manipulative values)
- Liquidation threshold < collateral factor
- Interest rate model edge cases (100% utilization)
- Bad debt socialization mechanism exists
- Oracle failure handling (pause markets, fallback feeds)
- Borrow cap and supply cap enforcement

### Flash Loan Guards
```solidity
modifier noFlashLoan() {
    require(lastActionBlock[msg.sender] < block.number, "same block");
    _;
    lastActionBlock[msg.sender] = block.number;
}
```

Check: Can a flash loan be used to manipulate governance, oracle prices, or collateral ratios within a single transaction?

---

## 5. Gas Optimization Patterns

### Storage Packing
```solidity
// BEFORE: 3 slots (96 bytes)
uint256 amount;     // slot 0
uint128 timestamp;  // slot 1
bool active;        // slot 2

// AFTER: 2 slots (64 bytes)
uint128 timestamp;  // slot 0 (16 bytes)
bool active;        // slot 0 (1 byte) — packed!
uint256 amount;     // slot 1
```

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
// BEFORE: 3 SLOAD operations
function calc() external view returns (uint256) {
    return baseRate + baseRate * multiplier / baseRate;
}

// AFTER: 1 SLOAD
function calc() external view returns (uint256) {
    uint256 _baseRate = baseRate;
    return _baseRate + _baseRate * multiplier / _baseRate;
}
```

### Short-Circuit Conditionals
```solidity
// Put cheap check first
require(amount > 0 && balances[msg.sender] >= amount); // SLOAD only if amount > 0
```

---

## 6. Audit Report Template

### Severity Levels

| Severity | Definition |
|----------|-----------|
| **Critical** | Direct loss of funds or permanent contract bricking. Exploit requires no special permissions. |
| **High** | Indirect fund loss, significant protocol disruption, or privilege escalation. |
| **Medium** | Limited fund risk, griefing potential, or state inconsistency under specific conditions. |
| **Low** | Best practice violation, informational, minor gas inefficiency. |
| **Gas** | Gas optimization opportunity with no functional impact. |

### Finding Format
```markdown
### [S-01] Title of Finding

**Severity:** Critical / High / Medium / Low / Gas
**Status:** Open / Acknowledged / Fixed
**File:** src/Vault.sol#L42-L58

**Description:**
One paragraph explaining the vulnerability and root cause.

**Impact:**
What can go wrong. Quantify if possible (e.g., "attacker drains all ETH in contract").

**Proof of Concept:**
```solidity
// Foundry test demonstrating the exploit
function test_exploit() public {
    // setup
    // attack
    // assert funds stolen
}
```

**Recommendation:**
Specific code fix with diff or replacement code.

**Team Response:**
(filled by the audited team)
```

### Report Structure
1. Executive Summary (scope, duration, findings count by severity)
2. Scope (contracts, commit hash, lines of code)
3. Methodology (tools used, manual review areas)
4. Findings (ordered by severity)
5. Gas Optimizations
6. Informational / Best Practices
7. Appendix (tool output, coverage report)

---

## 7. Tool Commands Reference

```bash
# Static analysis
slither .
slither . --detect reentrancy-eth,unprotected-upgrade
slither . --print human-summary

# Symbolic execution
myth analyze src/Contract.sol --solv 0.8.24 --execution-timeout 600

# Aderyn
aderyn . --output report.md

# Foundry
forge test --fuzz-runs 10000
forge test --fuzz-runs 50000 -vvvv --match-test testFuzz
forge coverage --report lcov
forge inspect Contract storage-layout
forge selectors list

# Echidna
echidna . --contract TestContract --test-mode assertion --test-limit 100000

# Coverage
forge coverage --report summary
forge coverage --report lcov && genhtml lcov.info -o coverage/
```

---

## 8. Test Coverage & Fuzzing Strategy

### Coverage Assessment
```bash
forge coverage --report summary
# Target: >95% line coverage, >90% branch coverage
# Critical paths (withdraw, liquidate, upgrade): 100% branch coverage
```

### What to Fuzz
Priority targets for fuzz testing:
1. **Math functions** — arithmetic with user-supplied inputs
2. **Token amounts** — deposits, withdrawals, swaps, fees
3. **Access boundaries** — role transitions, timelocks
4. **Edge values** — 0, 1, type(uint256).max, empty arrays

### Invariant Testing
Define protocol invariants that must always hold:
```solidity
function invariant_totalSupplyMatchesBalances() public view {
    uint256 sum = 0;
    for (uint i = 0; i < holders.length; i++) {
        sum += token.balanceOf(holders[i]);
    }
    assert(sum == token.totalSupply());
}

function invariant_vaultSolvent() public view {
    assert(address(vault).balance >= vault.totalDeposited());
}
```

### Fuzzing Strategies
- **Random:** Default — good for broad coverage
- **Guided:** Use `bound()` to constrain inputs to realistic ranges
- **Stateful (invariant testing):** Foundry calls random sequences of functions, checks invariants after each
- **Corpus-based:** Echidna saves interesting inputs, replays and mutates them

### CI Integration
```yaml
# .github/workflows/audit.yml
- run: forge test --fuzz-runs 10000
- run: forge coverage --report summary
- run: slither . --sarif output.sarif
- run: aderyn .
```
