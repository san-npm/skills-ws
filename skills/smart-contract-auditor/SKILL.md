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

## Safety gate

Before executing commands or changing external systems, confirm scope, credentials, target environment, rollback, and required approval. Pin and verify third-party artifacts; never expose secrets to client code or logs.

## Reference guide

Read only the references needed for the current request:

- **1. Tooling Setup**: [references/1-tooling-setup.md](references/1-tooling-setup.md)
- **2. Vulnerability Checklist**: [references/2-vulnerability-checklist.md](references/2-vulnerability-checklist.md)
- **3. Proxy / Upgrade Safety**: [references/3-proxy-upgrade-safety.md](references/3-proxy-upgrade-safety.md)
- **4. DeFi-Specific Audit**: [references/4-defi-specific-audit.md](references/4-defi-specific-audit.md)
- **5. Gas Optimization Patterns**: [references/5-gas-optimization-patterns.md](references/5-gas-optimization-patterns.md)
- **6. Audit Report Template**: [references/6-audit-report-template.md](references/6-audit-report-template.md)
- **7. Tool Commands Reference**: [references/7-tool-commands-reference.md](references/7-tool-commands-reference.md)
- **8. Test Coverage & Fuzzing Strategy**: [references/8-test-coverage-fuzzing-strategy.md](references/8-test-coverage-fuzzing-strategy.md)
