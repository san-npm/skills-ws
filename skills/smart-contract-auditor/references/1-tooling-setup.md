## Contents

- 1. Tooling Setup
- Slither (Static Analysis — first pass, fast, low false-negative)
- Aderyn (Rust static analyzer — fast, great Markdown report)
- Mythril (Symbolic Execution — narrow, slow, use selectively)
- Foundry Fuzzing (primary dynamic tool)
- Echidna / Medusa (Property-Based Fuzzing)
- Halmos (Symbolic test runner — reuses Foundry tests)

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
installer_1="$(mktemp)"
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/cyfrin/aderyn/releases/latest/download/aderyn-installer.sh -o "$installer_1"
less "$installer_1"  # Review before execution; verify the release checksum/signature when published.
bash "$installer_1"   # official installer; skim the script before piping
rm -f "$installer_1"
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
