---
name: smart-contract-auditor
description: "EVM/Solidity security auditing: static analysis (Slither, Aderyn, Mythril), fuzzing/formal verification (Foundry, Echidna, Medusa, Halmos), proxy/upgrade safety, DeFi attack patterns, gas, and audit reporting. Use when auditing Solidity contracts, hunting reentrancy/oracle/proxy/access-control bugs, or writing an audit report or PoC."
---

# Smart Contract Auditor

> Sibling skills: for entry-point enumeration use `entry-point-analyzer`; for differential PR review use `differential-review`; for property-based fuzzing depth see `property-based-testing`.

**Pin the compiler to the project, never to this doc.** Every `--solv` / symbolic-exec command below uses `$SOLC` as a placeholder. Read the real version from the project before running any tool:
```bash
# Foundry projects
SOLC=$(grep -E '^\s*solc(_version)?' foundry.toml | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)
# Hardhat projects: check the `solidity:` block in hardhat.config.{js,ts}
# Fallback: read the pragma of the file under audit
SOLC=$(grep -oE 'pragma solidity[^;]*[0-9]+\.[0-9]+\.[0-9]+' src/Vault.sol | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | tail -1)
echo "Auditing against solc $SOLC"
```

## 1. Tooling Setup

Version guidance below is **as of Jun 2026** — pin to the project's lockfile/CI and verify latest releases before shipping a report (Foundry: https://github.com/foundry-rs/foundry/releases, Slither: https://github.com/crytic/slither/releases, Aderyn: https://github.com/Cyfrin/aderyn/releases). Install Foundry tooling via `foundryup` so `forge`/`cast`/`anvil`/`chisel` match.

### Slither (Static Analysis — first pass, fast, low false-negative)
```bash
pipx install slither-analyzer   # pipx keeps it isolated; pip3 also works
slither . --filter-paths "node_modules|lib|test"
slither . --print human-summary          # contract/loc/issue overview
slither . --print contract-summary       # function visibility overview
slither . --detect reentrancy-eth,reentrancy-no-eth,arbitrary-send-erc20,unprotected-upgrade,unchecked-transfer
slither . --sarif slither.sarif          # machine-readable for CI / weAudit
```
Slither has 90+ detectors and is the workhorse for triage. Use `// slither-disable-next-line <detector>` sparingly and justify each in the report. Triage every High/Medium; most Informational/Optimization are noise but skim them.

### Aderyn (Rust static analyzer — fast, great Markdown report)
```bash
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/cyfrin/aderyn/releases/latest/download/aderyn-installer.sh | bash   # official installer; skim the script before piping
# or: brew install cyfrin/tap/aderyn    or: npm install @cyfrin/aderyn -g
aderyn .                       # writes report.md by default
aderyn . --output aderyn-report.json
```
Complements Slither (different detector set); run both and diff the findings. Auto-detects Foundry/Hardhat layout.

### Mythril (Symbolic Execution — narrow, slow, use selectively)
```bash
pipx install mythril
myth analyze src/Vault.sol --solv "$SOLC" --execution-timeout 300
myth analyze src/Vault.sol --max-depth 30 -o jsonv2
```
Maintained but largely in maintenance mode and slow on modern codebases; symbolic execution struggles with loops/large state, so treat it as a supplement, not a gate. In the 2026 stack, prefer **Halmos** (symbolic, reuses Foundry tests) and **Medusa**/**Echidna** (coverage-guided fuzzing) for deep bug-finding, and **Certora Prover** / **Kontrol** / **SMTChecker** for formal verification of critical invariants.

### Foundry Fuzzing (primary dynamic tool)
```bash
foundryup                                 # install/update forge, cast, anvil, chisel
forge test --fuzz-runs 10000
forge test --fuzz-runs 50000 --match-test testFuzz
forge test --fuzz-seed 42 --fuzz-runs 10000   # reproducible
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

### Echidna / Medusa (Property-Based Fuzzing)
```bash
brew install echidna   # or download a release binary from crytic/echidna
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

**Medusa** (Trail of Bits, Go-based, parallel) is the current go-to coverage-guided fuzzer and reuses the same invariant harnesses; prefer it for long campaigns and multi-core machines:
```bash
go install github.com/crytic/medusa@latest   # or download a release binary
medusa init                                   # writes medusa.json
medusa fuzz --test-limit 100000 --workers 8   # target read from medusa.json; override with --compilation-target <file.sol> or --target-contracts "ContractName"
```

### Halmos (Symbolic test runner — reuses Foundry tests)
```bash
pipx install halmos
halmos --function check_ --solver-timeout-assertion 0   # prove `check_*` tests for ALL inputs
```
Halmos runs Foundry-style tests symbolically: a `check_*` test that passes is proven for the entire input domain (subject to loop unrolling limits), which is far stronger than fuzzing for bounded properties like access control and arithmetic bounds.

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

## 4. DeFi-Specific Audit

### AMM Invariants
- Constant product: `k = reserveA * reserveB` must hold after every swap
- Check for rounding manipulation on small liquidity pools
- Verify fee calculations don't break invariant
- LP token mint/burn must be proportional to liquidity added/removed

### Lending Protocol Checks
Get the risk-parameter ordering right — this is a common source of "instantly liquidatable" bugs:
- **Max LTV / collateral factor < liquidation threshold < 100%.** A borrower may only draw up to *max LTV* of collateral value; a position becomes liquidatable once debt exceeds the (higher) *liquidation threshold*. If liquidation threshold ≤ collateral factor, a user can be liquidated the instant they borrow at the limit. (Aave-style example: collateral factor 75%, liquidation threshold 80%, leaving an 5% safety band.)
- **Liquidation bonus/penalty** is bounded so liquidations stay profitable but don't over-seize collateral (e.g., 5–10%); confirm it can't push the liquidated position into bad debt unnecessarily.
- **Health factor** `= (collateral * liquidationThreshold) / debt`; liquidatable when `< 1e18`. Audit the math for rounding direction (round against the user on solvency checks) and decimal scaling across assets.
- Collateral/borrow factor setter bounds (governance can't set manipulative values; ideally timelocked).
- Interest-rate model edge cases (0% and 100% utilization; kink behavior; no division-by-zero at empty reserves).
- Bad-debt socialization mechanism exists and is fair.
- **Oracle quality:** staleness/heartbeat checks, `updatedAt` staleness against the feed's documented heartbeat (`answeredInRound` is deprecated in the Chainlink API; flag code that still relies on it), min/max price bounds (Chainlink can return clamped extremes during flash crashes), and a fallback/pause path on feed failure.
- Borrow cap and supply cap enforcement.

### Flash Loan Guards
```solidity
modifier noFlashLoan() {
    require(lastActionBlock[msg.sender] < block.number, "same block");
    _;
    lastActionBlock[msg.sender] = block.number;
}
```

Check: Can a flash loan be used to manipulate governance, oracle prices, or collateral ratios within a single transaction?

### ERC-4626 Vault Inflation / Donation Attack
First depositor mints 1 wei of shares, then **donates** assets directly to the vault, inflating share price so a second depositor's deposit rounds down to 0 shares and is stolen. Audit for:
- A **virtual-share/asset offset** (`_decimalsOffset()` in OZ ERC4626, or seed/dead-shares on first deposit) — this is the standard mitigation.
- `convertToShares`/`previewDeposit` rounding direction (must round **down** for shares minted to depositor).
- `totalAssets()` based on internal accounting where appropriate, not raw `balanceOf`, so direct donations don't move the exchange rate.

### Permit2 / ERC-2612 Signature Replay
- ERC-2612 `permit`: confirm `nonces` increments and `deadline` is enforced; one signature must not be replayable. Beware front-running of `permit` (use try/catch around it so a griefer can't revert the tx).
- **Permit2** (Uniswap): check `SignatureTransfer` nonces are unordered-nonce bitmaps consumed exactly once, and `AllowanceTransfer` expirations are honored. Validate the EIP-712 domain (`chainId` bound) so signatures can't be replayed cross-chain or after a fork.

### L2 Sequencer & Oracle Liveness (Arbitrum/Optimism/Base)
On L2s, a down sequencer freezes price updates while users can't act. Gate price reads on Chainlink's L2 **sequencer uptime feed**:
```solidity
(, int256 up, uint256 startedAt, , ) = sequencerUptimeFeed.latestRoundData();
require(up == 0, "sequencer down");                 // 0 = up
require(block.timestamp - startedAt > 3600, "grace");// grace period after restart
```

### Cross-Chain Bridge / Message Replay
- Every cross-chain message must be **idempotent**: a `bytes32 messageId`/nonce marked consumed before effects (CEI), so a replayed or reordered message can't double-mint.
- Validate source chain id + source sender against an allowlist; never trust `msg.sender` of the local endpoint alone.
- Check finality assumptions (reorg on source chain), and that EIP-712 domains include `chainId` so signatures don't replay across chains/forks.

### Account Abstraction (ERC-4337) / Paymaster
- `validateUserOp` must not have side effects beyond paying the prefund and must respect storage-access rules (no banned opcodes/cross-account storage) or bundlers drop it.
- **Paymaster**: griefing/DoS where an attacker drains the paymaster's deposit via ops that pass validation but waste gas; enforce per-sender limits and validate the sponsored calldata.
- Replay across `entryPoint` versions/chains — confirm the UserOp hash binds `chainId` and the deployed EntryPoint address.

### Restaking / Oracle & Yield Composition (LRT/LST)
- LST/LRT exchange rates (e.g., stETH, weETH) are themselves oracles — using a manipulable or stale rate as collateral is a composition risk; prefer a rate with its own staleness guard.
- Slashing/withdrawal-queue delays mean redemptions aren't instant; audit assumptions that collateral is liquid on demand.
- Beware double-counting of rewards across stacked protocols and re-entrancy through reward-claim callbacks.

---

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

## 6. Audit Report Template

### Severity Levels

Derive severity from **impact × likelihood** (the convention used by Code4rena, Sherlock, and Trail of Bits), then state both in the finding so the rating is auditable rather than asserted.

| Impact \ Likelihood | High | Medium | Low |
|---------------------|------|--------|-----|
| **High** (fund loss / bricking) | Critical | High | Medium |
| **Medium** (limited loss / griefing) | High | Medium | Low |
| **Low** (state inconsistency, no loss) | Medium | Low | Low / Info |

| Severity | Definition |
|----------|-----------|
| **Critical** | Direct loss of funds or permanent contract bricking; exploit is practical with no special permissions. |
| **High** | Indirect fund loss, major protocol disruption, or privilege escalation; likely under realistic conditions. |
| **Medium** | Limited/conditional fund risk, griefing, or state inconsistency requiring specific preconditions. |
| **Low** | Best-practice violation or edge case with no meaningful fund impact. |
| **Info / Gas** | No functional impact; documentation, style, or gas optimization. |

### Finding Format
Pin every code link to the **exact audited commit** so line references don't drift as the repo changes. Use a full GitHub permalink (`/blob/<commit-sha>/...#Lx-Ly`), not a branch-relative `file#Lx` reference.
````markdown
### [H-01] Title of Finding

**Severity:** High — Impact: High (theft of all vault assets) · Likelihood: Medium (requires being first depositor)
**Status:** Open / Acknowledged / Fixed
**Target:** `src/Vault.sol#L42-L58` @ commit `a1b2c3d`
**Link:** https://github.com/<org>/<repo>/blob/a1b2c3d4e5f6.../src/Vault.sol#L42-L58

**Description:**
One paragraph explaining the vulnerability and root cause.

**Impact:**
What can go wrong, and under what conditions (the likelihood). Quantify if possible (e.g., "attacker drains all ETH in contract").

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
````

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

`$SOLC` = the project's pinned compiler (see top of file); never hardcode a version here.

```bash
# Static analysis
slither .
slither . --detect reentrancy-eth,unprotected-upgrade
slither . --print human-summary
aderyn . --output report.md

# Symbolic execution / formal
myth analyze src/Contract.sol --solv "$SOLC" --execution-timeout 600
halmos --function check_                 # prove Foundry check_* tests symbolically

# Foundry
forge test --fuzz-runs 10000
forge test --fuzz-runs 50000 -vvvv --match-test testFuzz
forge coverage --report lcov
forge inspect Contract storage-layout
forge selectors list

# Coverage-guided fuzzing
echidna . --contract TestContract --test-mode assertion --test-limit 100000
medusa fuzz --test-limit 100000 --workers 8

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
- run: slither . --sarif slither.sarif   # upload to GitHub code scanning
- run: aderyn .
- run: halmos --function check_          # symbolic proofs of check_* tests
# For upgradeable contracts, also run the storage-layout safety check
# (openzeppelin-foundry-upgrades) so a bad upgrade fails CI, not mainnet.
```
