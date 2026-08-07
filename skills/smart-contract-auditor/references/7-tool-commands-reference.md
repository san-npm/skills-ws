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
