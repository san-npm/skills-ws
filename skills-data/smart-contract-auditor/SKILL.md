---
name: smart-contract-auditor
description: "Solidity smart contract security audit. Common vulnerabilities (reentrancy, integer overflow, front-running, access control, flash loan attacks), gas optimization patterns, OpenZeppelin best practices, audit checklist. Use when auditing smart contracts, reviewing Solidity code for vulnerabilities, optimizing gas usage, checking access control patterns, or performing security reviews of DeFi protocols."
---

# Smart Contract Auditor

## Audit Checklist

### 1. Access Control
- [ ] `onlyOwner` / role-based access on sensitive functions
- [ ] No unprotected `selfdestruct`
- [ ] No unprotected proxy upgrade functions
- [ ] Ownership transfer is two-step (propose + accept)
- [ ] No default public visibility on state variables

### 2. Reentrancy
- [ ] External calls are last (checks-effects-interactions pattern)
- [ ] ReentrancyGuard on functions with external calls + state changes
- [ ] No cross-function reentrancy via shared state

### 3. Integer Safety
- [ ] Solidity 0.8+ (built-in overflow protection) or SafeMath
- [ ] Checked division (no divide by zero)
- [ ] Casting between types checked for truncation

### 4. Input Validation
- [ ] All user inputs validated (address != 0, amount > 0)
- [ ] Array bounds checked
- [ ] Ether values validated

### 5. Token Handling
- [ ] SafeERC20 for all token transfers (handles non-standard returns)
- [ ] Check return values of `transfer` / `transferFrom`
- [ ] Handle fee-on-transfer tokens if applicable
- [ ] Handle rebasing tokens if applicable

### 6. Flash Loan Protection
- [ ] Price oracles use TWAP (not spot price)
- [ ] Critical functions have minimum time delays
- [ ] Governance votes have sufficient voting periods

### 7. Front-Running Protection
- [ ] Commit-reveal for sensitive operations
- [ ] Maximum slippage parameters on swaps
- [ ] Deadline parameters on transactions

### 8. Gas Optimization
- Use `uint256` instead of smaller types (EVM operates on 256-bit)
- Pack storage variables (multiple small vars in one slot)
- Use `calldata` instead of `memory` for read-only function params
- Cache storage reads in local variables
- Use `++i` instead of `i++`
- Use custom errors instead of require strings

Full vulnerability catalog: [references/vulnerability-catalog.md](references/vulnerability-catalog.md)
Gas optimization guide: [references/gas-optimization.md](references/gas-optimization.md)
Complete audit process: [references/audit-checklist.md](references/audit-checklist.md)

## References

- [references/vulnerability-catalog.md](references/vulnerability-catalog.md) — Top 20 vulnerabilities with examples
- [references/gas-optimization.md](references/gas-optimization.md) — Gas saving patterns
- [references/audit-checklist.md](references/audit-checklist.md) — Step-by-step audit process
