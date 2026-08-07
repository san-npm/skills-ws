## Contents

- 8. Test Coverage & Fuzzing Strategy
- Coverage Assessment
- What to Fuzz
- Invariant Testing
- Fuzzing Strategies
- CI Integration

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
