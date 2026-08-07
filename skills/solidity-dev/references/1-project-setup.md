## Contents

- 1. Project Setup
- Foundry Setup
- foundry.toml Configuration
- Choosing a compiler version (mid-2026)
- Hardhat Setup — Hardhat 3 (current, mid-2026)
- Legacy: Hardhat 2 (only when maintaining an older repo)
- Installing Dependencies

## 1. Project Setup

### Foundry Setup
```bash
# Install Foundry
# Official installer (foundry.paradigm.xyz). To review before running:
#   curl -L https://foundry.paradigm.xyz -o foundryup-install.sh && less foundryup-install.sh && bash foundryup-install.sh
installer_1="$(mktemp)"
curl -L https://foundry.paradigm.xyz -o "$installer_1"
less "$installer_1"  # Review before execution; verify the release checksum/signature when published.
bash "$installer_1"
rm -f "$installer_1"
foundryup

# Create new project
forge init my-project
cd my-project

# Project structure
# ├── src/          — Solidity source files
# ├── test/         — Test files (.t.sol)
# ├── script/       — Deployment scripts (.s.sol)
# ├── lib/          — Dependencies (git submodules)
# └── foundry.toml  — Configuration
```

### foundry.toml Configuration
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc_version = "0.8.36"   # pin EXACTLY; see compiler version table below. Check latest at github.com/ethereum/solidity/releases
evm_version = "cancun"    # pin the target EVM hardfork explicitly; cancun is a safe cross-chain floor, mainnet supports osaka (see EVM version table in §8)
optimizer = true
optimizer_runs = 200      # low = cheaper deploy; high (e.g. 1_000_000) = cheaper runtime calls
via_ir = false            # opt-in only; changes codegen/optimizer path — re-audit + gas-diff before flipping (see note)
ffi = false               # keep false unless a test genuinely needs to shell out; ffi can execute arbitrary commands
fs_permissions = [{ access = "read", path = "./" }]

[profile.default.fuzz]
runs = 10000
max_test_rejects = 65536
seed = "0x1"

[profile.ci.fuzz]
runs = 50000

[profile.ci.invariant]
runs = 512
depth = 50

[etherscan]
mainnet = { key = "${ETHERSCAN_API_KEY}" }
sepolia = { key = "${ETHERSCAN_API_KEY}" }

[rpc_endpoints]
mainnet = "${ETH_RPC_URL}"
sepolia = "${SEPOLIA_RPC_URL}"
```

### Choosing a compiler version (mid-2026)

**Pin an exact version (no `^`) and test in lockstep** — a floating pragma lets CI and auditors compile different bytecode than production. Solidity 0.8.x is still the production line in 2026 (0.9 not released; check `github.com/ethereum/solidity/releases` for the current patch).

| Version | What it actually adds / why it matters | When to use |
|---------|----------------------------------------|-------------|
| `0.8.24` | First release supporting `evm_version = "cancun"` (it became the default in 0.8.25); enables `tstore`/`tload` builtins, `mcopy`, and `blobhash` *when targeting Cancun*. Note: `MCOPY` is a Cancun opcode; it is gated by `evm_version`, not just compiler version. | Conservative floor; widely audited; safe on chains that support Cancun. |
| `0.8.26` | Stabilized the `transient` storage keyword for declaring transient state variables (earlier versions only had inline `tstore`/`tload` assembly). | If you want first-class `transient` variables for reentrancy locks. |
| `0.8.28`-`0.8.29` | Bugfixes, `--via-ir` improvements, Prague/Pectra `evm_version` support added in this range. EOF existed only behind **experimental flags** here (and through 0.8.35) before being removed entirely in 0.8.36; never production-ready. | General current use. |
| `0.8.31`-`0.8.36` | 0.8.31 adds Fusaka support and sets default `evm_version` to `osaka`; 0.8.35 adds an `erc7201` builtin for namespaced storage slots; 0.8.36 (current, released 2026-07-09) adds Amsterdam EVM support and removes the experimental EOF backend. **Always set `evm_version` explicitly** rather than relying on the default. | New projects: pin the exact latest patch (0.8.36 as of July 2026); verify at the releases page above. |

> **Correction vs. common myths:** `MCOPY` and `BLOBHASH` are unlocked by targeting the **Cancun** EVM (`evm_version = "cancun"`), available since 0.8.24, not by some "≥0.8.27" rule. Transient-storage *assembly* (`tstore`/`tload`) also arrived with Cancun in 0.8.24; the high-level `transient` keyword landed in 0.8.26. **EOF never stabilized: the experimental EOF backend was removed from the compiler in 0.8.36 (July 2026). Do not target EOF or describe it as production-ready; on 0.8.28-0.8.35 it existed only behind experimental flags.**

> **`via_ir` is opt-in, not required.** No mainstream language feature *requires* the IR pipeline. Turn it on mainly to (a) escape `Stack too deep` errors or (b) chase extra optimizer wins. It selects a different codegen + optimizer path, so flipping it **changes your deployed bytecode and gas profile**. If you enable it: re-run the full test/invariant suite, regenerate `forge snapshot` and diff gas, re-verify on the explorer (verification must use the *same* `via_ir`/optimizer settings), and ideally re-audit. Never flip it between audit and deploy.

### Hardhat Setup — Hardhat 3 (current, mid-2026)

**Foundry is the faster default for pure-Solidity work; reach for Hardhat when you need a TypeScript app/deploy layer, viem, or Hardhat Ignition.** Hardhat 3 is the stable line in 2026. Key changes vs Hardhat 2: it is **ESM-first**, ships native **Solidity unit tests** (run alongside Mocha/`node:test`), uses a `hardhat-toolbox-viem` (viem-based) or `hardhat-toolbox-mocha-ethers` toolbox, and configures networks under a typed `networks` block with **build profiles**.

```bash
mkdir my-project && cd my-project
npm init -y
npm install --save-dev hardhat@^3
npx hardhat --init                       # scaffolds an ESM TypeScript project (Hardhat 3)
# Pick the "node:test + viem" or "mocha + ethers" template when prompted.

# Project structure
# ├── contracts/     — Solidity sources (can also hold *.t.sol Solidity tests)
# ├── test/          — TS tests (node:test or mocha) + Solidity tests
# ├── scripts/       — Deployment / ops scripts (.ts)
# ├── ignition/      — Hardhat Ignition deployment modules
# └── hardhat.config.ts  (ESM — package.json should have "type": "module")
```

```typescript
// hardhat.config.ts  (Hardhat 3, ESM, viem toolbox)
import type { HardhatUserConfig } from "hardhat/config";
import hardhatToolboxViem from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable } from "hardhat/config";

const config: HardhatUserConfig = {
  plugins: [hardhatToolboxViem],
  solidity: {
    profiles: {
      default: {
        version: "0.8.36",
        settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun", viaIR: false }, // cancun = safe cross-chain floor; mainnet supports osaka (§8)
      },
      production: { // higher runs for cheaper runtime in deployed code
        version: "0.8.36",
        settings: { optimizer: { enabled: true, runs: 1_000_000 }, evmVersion: "cancun" },
      },
    },
  },
  networks: {
    // EDR simulated chain for tests/forking
    hardhatMainnet: { type: "edr-simulated", chainType: "l1", forking: { url: configVariable("ETH_RPC_URL") } },
    sepolia: {
      type: "http",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("DEPLOYER_PRIVATE_KEY")], // prefer a keystore/HW wallet for mainnet (see §6)
    },
  },
  verify: { etherscan: { apiKey: configVariable("ETHERSCAN_API_KEY") } },
};
export default config;
```

> `configVariable(...)` resolves secrets from Hardhat 3's encrypted keystore / env at runtime instead of baking them into config — never paste a raw private key here. Check current plugin names and the EDR network API at `hardhat.org/docs`.

### Legacy: Hardhat 2 (only when maintaining an older repo)
Hardhat 2 is CommonJS and uses the older `@nomicfoundation/hardhat-toolbox` with a flat `solidity.version`/`networks` shape. Only use this for repos that have not migrated:
```typescript
// hardhat.config.ts  (Hardhat 2 — legacy)
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: { version: "0.8.36", settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" } }, // cancun = safe cross-chain floor; mainnet supports osaka (§8)
  networks: {
    hardhat: { forking: { url: process.env.ETH_RPC_URL || "", blockNumber: 22000000 } },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
  },
  etherscan: { apiKey: process.env.ETHERSCAN_API_KEY },
};
export default config;
```

### Installing Dependencies

**Foundry (git submodules):**
```bash
forge install OpenZeppelin/openzeppelin-contracts
forge install OpenZeppelin/openzeppelin-contracts-upgradeable
forge install transmissions11/solmate
# Remappings in foundry.toml or remappings.txt:
# @openzeppelin/=lib/openzeppelin-contracts/
# solmate/=lib/solmate/src/
```

**Hardhat (npm):**
```bash
npm install @openzeppelin/contracts @openzeppelin/contracts-upgradeable
npm install --save-dev @openzeppelin/hardhat-upgrades
```

---
