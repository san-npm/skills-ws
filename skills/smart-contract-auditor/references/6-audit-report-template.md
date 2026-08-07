## Contents

- 6. Audit Report Template
- Severity Levels
- Finding Format
- [H-01] Title of Finding
- Report Structure

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
