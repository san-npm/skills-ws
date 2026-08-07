## Contents

- 11. Security & Audit Toolchain (expected for paid work)
- Static analysis
- Fuzzing & invariants (Foundry + Echidna/Medusa)
- Vulnerability patterns to test explicitly
- CI example (GitHub Actions)

## 11. Security & Audit Toolchain (expected for paid work)

A production/audited Solidity codebase in 2026 is expected to run static analysis, fuzz/invariant tests, and storage-layout checks in CI — not just unit tests.

### Static analysis
```bash
pipx install slither-analyzer          # Slither (Trail of Bits) — fast, high-signal
slither . --exclude-dependencies       # triage findings; suppress with // slither-disable-next-line
slither . --print human-summary        # contract summary, modifiers, ext calls
slither-check-upgradeability . VaultV1 --new-contract-name VaultV2   # upgrade/storage safety
# Mythril (symbolic execution) — slower, good for deep arithmetic/path bugs:
pipx install mythril && myth analyze src/Vault.sol --solv 0.8.36
```

### Fuzzing & invariants (Foundry + Echidna/Medusa)
- **Foundry invariant tests** (built in): write a *handler* that performs bounded random actions, then assert system-wide invariants. Use `targetContract`/`targetSelector` to focus the fuzzer, and `bound()` (not raw `%`) to constrain inputs. See §4 — design invariants like "sum of balances == totalSupply", "vault solvency", "no user can withdraw more than deposited".
- **Echidna** (property/assertion fuzzer) and **Medusa** (parallel, coverage-guided, Go-based — Trail of Bits) run the *same* Solidity property contracts:
```bash
echidna . --contract VaultInvariant --config echidna.yaml   # property/assertion modes
medusa fuzz --target . --deployment-order VaultInvariant     # faster, multi-worker
```
```solidity
// Echidna/Medusa property: must always hold
function echidna_solvency() public view returns (bool) {
    return address(vault).balance >= vault.totalDeposited();
}
```

### Vulnerability patterns to test explicitly
| Class | What to write a test/invariant for |
|-------|-----------------------------------|
| Reentrancy (classic / cross-function / cross-contract / read-only) | Malicious receiver re-enters in `receive()`/ERC777 hooks; assert CEI holds and view functions can't be read mid-update. Use `ReentrancyGuard`/`...Transient`. |
| Oracle manipulation | Fork-test against a real oracle; assert behavior under a flash-loan-skewed spot price. Prefer TWAP/Chainlink with staleness + min-answer checks; never trust a single-block spot price. |
| Signature replay / EIP-712 | Test that a signature is rejected on a second use, after a nonce bump, on a different `chainid`, and after `deadline`. Build the digest with a domain separator (`name`, `version`, `chainid`, `verifyingContract`); use OZ `ECDSA.recover` (it rejects malleable `s`). |
| Access control | A test per privileged function asserting non-owner/non-role reverts; verify `_authorizeUpgrade`, pausers, and minters are gated. |
| Upgrade storage layout | `slither-check-upgradeability` or OZ Upgrades `validateUpgrade`; diff `forge inspect <C> storageLayout` across versions before every upgrade. |
| Integer / unit bugs | Fuzz arithmetic; check rounding direction (round *against* the user for protocol safety), decimals mismatches, and `unchecked` blocks. |

### CI example (GitHub Actions)
```yaml
# .github/workflows/ci.yml
name: ci
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { submodules: recursive }
      - uses: foundry-rs/foundry-toolchain@v1
      - run: forge fmt --check
      - run: forge build --sizes               # catches EIP-170 size regressions
      - run: forge test -vvv
      - run: FOUNDRY_PROFILE=ci forge test     # heavier fuzz/invariant runs
      - run: forge snapshot --check            # fail on gas regression (commit .gas-snapshot)
  slither:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { submodules: recursive }
      - uses: crytic/slither-action@v0          # Slither in CI; fails on new high/medium findings
```

> For larger audits, lean on the sibling Trail of Bits skills in this catalog (e.g. `audit-context-building`, `entry-point-analyzer`, `building-secure-contracts`, `property-based-testing`) for methodology; this section covers the day-to-day developer toolchain.
