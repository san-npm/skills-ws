---
name: solidity-dev
description: "Solidity smart contract development with Foundry & Hardhat — project setup, patterns, testing, deployment, security, and gas optimization. Use when writing, testing, auditing, deploying, or optimizing Solidity smart contracts, or configuring compiler/OpenZeppelin/EVM-version settings."
---

# Solidity Development — Foundry & Hardhat

## 1. Project Setup

### Foundry Setup
```bash
# Install Foundry
# Official installer (foundry.paradigm.xyz). To review before running:
#   curl -L https://foundry.paradigm.xyz -o foundryup-install.sh && less foundryup-install.sh && bash foundryup-install.sh
curl -L https://foundry.paradigm.xyz | bash
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

## 2. Foundry Commands Reference

```bash
# Build & Compile
forge build                          # Compile all contracts
forge build --sizes                  # Show contract sizes
forge build --via-ir                 # Compile with Yul IR pipeline

# Testing
forge test                           # Run all tests
forge test -vvvv                     # Verbose (show traces)
forge test --match-test testDeposit  # Run specific test
forge test --match-contract VaultTest # Run specific contract tests
forge test --fork-url $ETH_RPC_URL   # Fork mainnet tests
forge test --gas-report              # Gas usage report
forge test --fuzz-runs 50000         # Extended fuzz runs

# Coverage
forge coverage                       # Summary coverage
forge coverage --report lcov         # Generate lcov for HTML report

# Deployment
forge script script/Deploy.s.sol --rpc-url sepolia --broadcast --verify
forge script script/Deploy.s.sol --rpc-url mainnet --broadcast --verify --slow

# Cast (CLI interaction)
cast call $ADDR "balanceOf(address)" $USER --rpc-url mainnet
cast send $ADDR "transfer(address,uint256)" $TO $AMT --account deployer  # use keystore/--ledger, not --private-key on mainnet
cast abi-encode "constructor(address,uint256)" $ADDR 1000
cast sig "transfer(address,uint256)"           # → 0xa9059cbb
cast 4byte 0xa9059cbb                          # → transfer(address,uint256)
cast storage $ADDR 0 --rpc-url mainnet         # Read slot 0
cast estimate $ADDR "mint(uint256)" 5 --rpc-url mainnet
cast etherscan-source $ADDR --etherscan-api-key $KEY

# Anvil (local node)
anvil                                # Start local node (port 8545)
anvil --fork-url $ETH_RPC_URL        # Fork mainnet
anvil --fork-url $ETH_RPC_URL --fork-block-number <recent_block>  # pin a recent block for determinism
anvil --accounts 20 --balance 10000  # Custom accounts

# Chisel (Solidity REPL)
chisel                               # Interactive Solidity shell
# !source src/MyContract.sol         # Load contracts
# uint256 x = 42;
# x * 2                              # → 84
```

---

## 3. Common Solidity Patterns

### Factory Pattern
```solidity
contract VaultFactory {
    address[] public vaults;
    event VaultCreated(address indexed vault, address indexed owner);

    function createVault(address token) external returns (address) {
        Vault vault = new Vault(token, msg.sender);
        vaults.push(address(vault));
        emit VaultCreated(address(vault), msg.sender);
        return address(vault);
    }
}
```

### Minimal Proxy (Clones — EIP-1167)
```solidity
import "@openzeppelin/contracts/proxy/Clones.sol";

contract VaultFactory {
    address public immutable implementation;

    constructor() {
        implementation = address(new Vault());
    }

    function createVault(address token, address owner) external returns (address) {
        address clone = Clones.clone(implementation);
        Vault(clone).initialize(token, owner);
        return clone;
    }
}
```
Gas: ~45k to deploy clone vs ~500k+ for full contract.

### UUPS Proxy (Recommended Upgrade Pattern) — OpenZeppelin 5.x
```solidity
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract VaultV1 is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    /// @custom:storage-location erc7201:myapp.storage.Vault
    struct VaultStorage { uint256 fee; }
    // keccak256(abi.encode(uint256(keccak256("myapp.storage.Vault")) - 1)) & ~bytes32(uint256(0xff))
    // solc 0.8.35+: the erc7201 builtin computes this base slot for you; keep the manual keccak formula only for older compilers.
    bytes32 private constant VAULT_STORAGE = 0x.../* compute per ERC-7201 */;
    function _s() private pure returns (VaultStorage storage $) { assembly { $.slot := VAULT_STORAGE } }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(uint256 _fee) external initializer {
        __Ownable_init(msg.sender);   // OZ v5: Ownable/OwnableUpgradeable take an explicit initialOwner
        __UUPSUpgradeable_init();
        _s().fee = _fee;
    }

    function _authorizeUpgrade(address newImpl) internal override onlyOwner {}
}
```
**OpenZeppelin 5.x upgrade-safety notes (mid-2026, Contracts v5.x / 5.4+):**
- **Namespaced storage (ERC-7201)** is the v5 way to lay out upgradeable storage — OZ's own upgradeable contracts use it, which makes the old `uint256[50] __gap` arrays largely unnecessary for *new* code. Annotate your struct with `@custom:storage-location erc7201:...` so the upgrades plugin can validate layout.
- Always validate layout across versions: `forge clean && forge inspect VaultV1 storageLayout` and diff vs the new impl, or use the Hardhat/Foundry **OpenZeppelin Upgrades plugin** (`upgradeProxy` runs `validateUpgrade` automatically).
- v5 constructors changed: `Ownable(initialOwner)` (no longer defaults to `msg.sender`), and most lifecycle logic moved into a single **`_update`** hook (see ERC20 note in §10) instead of the old `_beforeTokenTransfer`/`_afterTokenTransfer`.
- For multi-role systems prefer **`AccessManager` + `AccessManaged`** (v5's centralized, time-delayed authority) over scattering `AccessControl` roles across contracts.

### Diamond Pattern (EIP-2535)
Multiple facets share one storage via delegatecall. Use for large contracts exceeding 24KB limit.
```solidity
// Storage library (shared across facets)
library LibDiamond {
    bytes32 constant DIAMOND_STORAGE_POSITION = keccak256("diamond.storage");
    struct DiamondStorage {
        mapping(bytes4 => address) facets;
        address owner;
    }
    function ds() internal pure returns (DiamondStorage storage d) {
        bytes32 pos = DIAMOND_STORAGE_POSITION;
        assembly { d.slot := pos }
    }
}
```

---

## 4. Testing

### Unit Test (Foundry)
```solidity
// test/Vault.t.sol
import "forge-std/Test.sol";
import "../src/Vault.sol";

contract VaultTest is Test {
    Vault vault;
    address alice = makeAddr("alice");
    address bob = makeAddr("bob");

    function setUp() public {
        vault = new Vault();
        deal(alice, 10 ether);
    }

    function test_deposit() public {
        vm.prank(alice);
        vault.deposit{value: 1 ether}();
        assertEq(vault.balances(alice), 1 ether);
    }

    function test_withdraw_reverts_insufficient() public {
        vm.prank(alice);
        vm.expectRevert("Insufficient balance");
        vault.withdraw(1 ether);
    }

    function test_event_emitted() public {
        vm.prank(alice);
        vm.expectEmit(true, false, false, true);
        emit Vault.Deposited(alice, 1 ether);
        vault.deposit{value: 1 ether}();
    }
}
```

### Fuzz Testing
```solidity
function testFuzz_deposit(uint256 amount) public {
    amount = bound(amount, 0.01 ether, 100 ether);
    deal(alice, amount);
    vm.prank(alice);
    vault.deposit{value: amount}();
    assertEq(vault.balances(alice), amount);
}
```

### Invariant Testing
```solidity
// test/VaultInvariant.t.sol
contract VaultInvariant is Test {
    Vault vault;
    VaultHandler handler;

    function setUp() public {
        vault = new Vault();
        handler = new VaultHandler(vault);
        targetContract(address(handler));
    }

    function invariant_solvency() public view {
        assertGe(address(vault).balance, vault.totalDeposited());
    }
}

contract VaultHandler is Test {
    Vault vault;
    constructor(Vault _v) { vault = _v; }

    function deposit(uint256 amount) public {
        amount = bound(amount, 0, 10 ether);
        deal(address(this), amount);
        vault.deposit{value: amount}();
    }
}
```

### Fork Testing
```solidity
function testFork_uniswapSwap() public {
    // Pin a RECENT block for deterministic, cacheable forks (omit to use chain head).
    uint256 forkId = vm.createFork(vm.envString("ETH_RPC_URL"), vm.envUint("FORK_BLOCK"));
    vm.selectFork(forkId);

    address WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // mainnet WETH9
    address USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48; // mainnet USDC
    // Test real protocol interactions (verify addresses for your target chain)...
}
```

### Hardhat Testing (TypeScript: Hardhat 3, node:test + viem toolbox)
```typescript
// test/Vault.ts  (Hardhat 3: tests get clients from a network connection)
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { network } from "hardhat";
import { parseEther } from "viem";

const { viem, networkHelpers } = await network.create();

describe("Vault", () => {
  async function deployFixture() {
    const [owner, alice] = await viem.getWalletClients();
    const vault = await viem.deployContract("Vault");
    return { vault, owner, alice };
  }

  it("accepts deposits", async () => {
    const { vault, alice } = await networkHelpers.loadFixture(deployFixture);
    await vault.write.deposit({ value: parseEther("1"), account: alice.account });
    assert.equal(await vault.read.balances([alice.account.address]), parseEther("1"));
  });
});
```
> For the `mocha + ethers` toolbox equivalent (chai `expect`, `ethers.getSigners()`), see `hardhat.org/docs`. The old Hardhat 2 pattern (`import { ethers } from "hardhat"` + `loadFixture` from `@nomicfoundation/hardhat-toolbox/network-helpers`) only applies to legacy repos on the Hardhat 2 config in §1.

---

## 5. Deployment Scripts

### Foundry Script
```solidity
// script/Deploy.s.sol
import "forge-std/Script.sol";
import "../src/Vault.sol";

contract DeployScript is Script {
    function run() external {
        // No raw private key in source. `--account <keystore>` / `--ledger` supplies the signer;
        // vm.startBroadcast() (no arg) uses the sender configured on the CLI.
        address treasury = vm.envAddress("TREASURY");
        require(treasury != address(0), "TREASURY unset");

        vm.startBroadcast();
        Vault vault = new Vault(treasury);
        console.log("Vault deployed at:", address(vault));
        console.log("chainid:", block.chainid);
        vm.stopBroadcast();
    }
}
```

```bash
# 1. DRY RUN first — simulate WITHOUT --broadcast. Inspect the printed txns, gas, and addresses.
forge script script/Deploy.s.sol:DeployScript --rpc-url mainnet --account deployer --sender 0xYourDeployerAddress -vvvv

# 2. Testnet broadcast (verify as you go)
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url sepolia --account deployer --sender 0xYourDeployerAddress --broadcast --verify -vvvv

# 3. Mainnet: hardware wallet or keystore, --slow (wait for each receipt), explicit chain
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url mainnet --ledger --sender 0xYourDeployerAddress \
  --broadcast --slow --verify --chain 1
```

### Production deployment checklist (run top-to-bottom)
Money-moving deploys are irreversible. Do **not** broadcast to mainnet from a hot `PRIVATE_KEY` env var.

1. **Code frozen & audited** — tag the exact commit; bytecode you deploy must match the audited commit (same `solc_version`, `evm_version`, `optimizer_runs`, `via_ir`).
2. **Fork-simulate the full deploy** against a recent mainnet block: `forge script ... --fork-url $ETH_RPC_URL` (no `--broadcast`) and assert post-state. Optionally push the bundle through **Tenderly** for a visual simulation.
3. **Dry run on the real network without `--broadcast`** and read every queued tx: target, value, calldata, gas, and the deterministic deployment address.
4. **Verify constructor args** by decoding what you pass: `cast abi-decode "constructor(address)" <calldata>` — wrong args are the most common irreversible mistake.
5. **Confirm chain ID** (`--chain 1` for mainnet) and the **RPC endpoint** points where you think (`cast chain-id --rpc-url $ETH_RPC_URL`).
6. **Sign with a hardware wallet (`--ledger`/`--trezor`) or encrypted keystore (`--account`)** — never `--private-key`/`PRIVATE_KEY` on mainnet.
7. **Broadcast with `--slow`** so each tx is mined before the next (avoids nonce gaps / reordering); set sane gas via `--with-gas-price` or EIP-1559 flags if the mempool is hot.
8. **Verify on the explorer** with the *identical* compiler settings (`--verify`, or `forge verify-contract` after). Verification failing usually means a settings mismatch.
9. **Transfer ownership/admin to a multisig** (e.g. a Safe) immediately — `transferOwnership(safe)` / `AccessManager` admin, and for UUPS confirm `_authorizeUpgrade` is gated by it. Never leave a fresh EOA as owner.
10. **Post-deploy smoke tests** against the live address with `cast call`/a script: read invariants, do one tiny guarded write, confirm events. Record addresses + the broadcast file (`broadcast/<chainid>/run-latest.json`) in your deployment log.

### Hardhat Ignition
```typescript
// ignition/modules/Vault.ts
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const VaultModule = buildModule("VaultModule", (m) => {
  const vault = m.contract("Vault");
  return { vault };
});
export default VaultModule;
```

```bash
npx hardhat ignition deploy ignition/modules/Vault.ts --network sepolia
```

---

## 6. Environment & Key Management

### .env (NEVER commit this — add to `.gitignore`)
```bash
# RPC + API keys are fine in .env. Do NOT keep a mainnet PRIVATE_KEY here.
ETH_RPC_URL=https://eth-mainnet.example.com/v2/<YOUR_KEY>
SEPOLIA_RPC_URL=https://eth-sepolia.example.com/v2/<YOUR_KEY>
ETHERSCAN_API_KEY=<YOUR_ETHERSCAN_KEY>
TREASURY=0xYourTreasuryAddress
# DEPLOYER_PRIVATE_KEY only for throwaway testnet keys — prefer a keystore/HW wallet (below).
```

> **Key handling order of preference:** hardware wallet (mainnet) > encrypted keystore > env-var private key (testnet/throwaway only). A leaked deployer key drains everything it controls; treat it like cash.

### Foundry Keystore (encrypted, recommended for everyday signing)
```bash
cast wallet import deployer --interactive   # paste key once; it's stored encrypted under ~/.foundry/keystores
cast wallet list                            # confirm the account exists
# Use it (you'll be prompted for the password, key never touches disk in plaintext):
forge script script/Deploy.s.sol --account deployer --sender 0xYourDeployerAddress --broadcast
```

### Hardware Wallet (recommended for mainnet)
```bash
# Ledger / Trezor — the private key never leaves the device
forge script script/Deploy.s.sol --ledger  --sender 0xYourDeployerAddress --broadcast --slow
forge script script/Deploy.s.sol --trezor  --sender 0xYourDeployerAddress --broadcast --slow
cast send 0xContract "pause()" --ledger --from 0xYourDeployerAddress   # cast supports --ledger too
```

---

## 7. Verification

### Etherscan
```bash
# Foundry (auto with --verify during deployment)
forge verify-contract $ADDR src/Vault.sol:Vault \
  --etherscan-api-key $KEY --chain sepolia

# With constructor args
forge verify-contract $ADDR src/Vault.sol:Vault \
  --constructor-args $(cast abi-encode "constructor(address,uint256)" $TOKEN 100) \
  --etherscan-api-key $KEY --chain mainnet
```

### Sourcify
```bash
forge verify-contract $ADDR src/Vault.sol:Vault \
  --verifier sourcify --chain-id 1
```

### Hardhat
```bash
npx hardhat verify --network sepolia $ADDR "constructor_arg_1" "constructor_arg_2"
```

---

## 8. Gas Optimization Cheat Sheet

### Storage Packing
```solidity
// BAD: 3 slots (96 bytes)
uint256 amount;     // slot 0
uint128 timestamp;  // slot 1
bool active;        // slot 2

// GOOD: 2 slots (64 bytes)
uint128 timestamp;  // slot 0 (16 bytes)
bool active;        // slot 0 (packed — 1 byte)
uint256 amount;     // slot 1
```

### calldata vs memory
```solidity
// ~600 gas cheaper per call for read-only arrays
function process(uint256[] calldata ids) external { ... }  // GOOD
function process(uint256[] memory ids) external { ... }    // BAD for external
```

### Unchecked Math (safe loops)
```solidity
for (uint256 i; i < len; ) {
    // ... loop body
    unchecked { ++i; }  // saves ~80 gas per iteration
}
```

### Custom Errors
```solidity
error InsufficientBalance(uint256 available, uint256 required);
if (balance < amount) revert InsufficientBalance(balance, amount);
// Saves ~200+ gas vs require("Insufficient balance")
```

### Cache Storage Reads
```solidity
uint256 _totalSupply = totalSupply; // 1 SLOAD (~2100 gas)
// Use _totalSupply multiple times instead of re-reading storage
```

### Immutable & Constant
```solidity
uint256 public constant FEE_BPS = 30;           // Inlined at compile time — free
address public immutable FACTORY;                 // Set once in constructor — cheap read
constructor() { FACTORY = msg.sender; }
```

### Short-Circuit Evaluation
```solidity
require(amount > 0 && balances[msg.sender] >= amount);
// If amount == 0, SLOAD for balances is skipped
```

### Batch Operations
```solidity
// Instead of N separate transactions, batch into one
function batchTransfer(address[] calldata to, uint256[] calldata amounts) external {
    require(to.length == amounts.length, "len");
    for (uint256 i; i < to.length; ) {
        _transfer(msg.sender, to[i], amounts[i]);
        unchecked { ++i; }
    }
}
```

### Transient storage for reentrancy locks (Cancun+, use with care)
```solidity
// EVM must target cancun or later. Transient storage is auto-cleared at end of tx —
// cheaper than an SSTORE/SSTORE lock, but ONLY safe for data that must reset per-tx.
contract ReentrancyGuardTransient {
    // bytes32(uint256(keccak256("reentrancy.guard")) - 1)
    bytes32 private constant LOCK = 0x...;
    modifier nonReentrant() {
        require(_tload(LOCK) == 0, "reentrant");
        _tstore(LOCK, 1);
        _;
        _tstore(LOCK, 0); // cleared anyway at tx end, but explicit is clearer
    }
    function _tload(bytes32 s) private view returns (uint256 v) { assembly { v := tload(s) } }
    function _tstore(bytes32 s, uint256 v) private { assembly { tstore(s, v) } }
}
```
> OZ ships `ReentrancyGuardTransient` in v5 — prefer it over rolling your own. **Footgun:** never use transient storage for state that must persist across calls within different transactions, and remember a value set in one external call is still visible to re-entrant calls *within the same tx* — that's exactly what makes it a valid lock, but a bug if you treat it as permanent state.

### EVM version targets (set `evm_version` explicitly — it changes available opcodes AND gas)
| `evm_version` | Notable for gas/features | When to target |
|---------------|--------------------------|----------------|
| `paris` | Pre-PUSH0. Needed for chains/L2s that haven't shipped Shanghai. | Only legacy/non-Shanghai chains. |
| `shanghai` | Adds `PUSH0` (cheaper constant pushes, smaller bytecode). | Safe broad default if a chain lacks Cancun. |
| `cancun` | `TSTORE`/`TLOAD` (transient storage), `MCOPY` (cheap memory copy), `BLOBHASH`, blob (EIP-4844) data. **Default from solc 0.8.25 through 0.8.29** (0.8.30 defaults to `prague`, 0.8.31+ to `osaka`). | Conservative cross-chain floor; many L2s still lag mainnet. Mainnet itself is on osaka. |
| `prague` / pectra | Pectra-era opcodes/precompiles; supported by recent 0.8.28+ compilers. Mainnet ran Prague from May to Dec 2025, now superseded by osaka. | Chains still on the Prague hardfork; verify per-chain. |
| `osaka` | Fusaka-era opcodes/precompiles; compiler default since solc 0.8.31. | Ethereum mainnet (live since Dec 3, 2025); verify L2 support per chain. |
| L2-specific | Many L2s lag mainnet hardforks and price calldata/state differently. | **Check the chain's docs before targeting cancun/prague on an L2.** |

### Optimizer & viaIR tradeoffs (measure, don't guess)
- `optimizer_runs` is a **deploy-vs-runtime knob**, not a quality dial. Low runs (≈200) → smaller, cheaper-to-deploy bytecode; high runs (e.g. `1_000_000`) → bigger bytecode but cheaper repeated calls. Pick based on whether the contract is called millions of times or deployed many times.
- `via_ir = true` can unlock extra optimizations and fixes `Stack too deep`, but changes codegen — **always gas-diff and re-test** (see §1 note). Don't assume it's always cheaper.
- Watch the **24,576-byte runtime size limit** (EIP-170): `forge build --sizes`. If you're over, split logic, use libraries, or a proxy/diamond — not a higher optimizer setting.

### Gas measurement workflow (numbers beat intuition)
```bash
# 1. Per-function gas report from your tests
forge test --gas-report

# 2. Snapshot total gas of every test, commit it, and diff after a change
forge snapshot                       # writes .gas-snapshot
forge snapshot --diff .gas-snapshot  # shows +/- per test vs the committed baseline
forge snapshot --check               # CI gate: fail if gas regressed

# 3. Compare two configs cleanly (e.g. via_ir on vs off, or different runs)
FOUNDRY_PROFILE=default forge snapshot --snap .gas-default
forge build --via-ir && forge snapshot --snap .gas-ir
# diff .gas-default .gas-ir

# 4. Inspect deployed/runtime size against the EIP-170 limit
forge build --sizes
```
> Optimize against **measured** report/snapshot deltas on realistic inputs, not micro-rules. A change that saves 80 gas in a loop but adds 5k to deploy can be a net loss depending on usage.

---

## 9. Solidity Style Guide

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.36;   // pin EXACTLY (matches foundry.toml/§1); no floating caret in production

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MyToken — A custom ERC20 token
/// @author <Your Name>
/// @notice Use this for demonstration purposes
contract MyToken is ERC20, Ownable {
    // Type declarations
    struct UserInfo { uint128 balance; uint128 lastClaim; }
    enum Status { Active, Paused, Deprecated }

    // State variables (constants → immutables → storage)
    uint256 public constant MAX_SUPPLY = 1_000_000e18;
    address public immutable treasury;
    mapping(address => UserInfo) public users;
    uint256 public totalClaimed;

    // Events
    event Claimed(address indexed user, uint256 amount);

    // Errors
    error ExceedsMaxSupply();
    error AlreadyClaimed();

    // State
    Status public status;

    // Modifiers
    modifier whenActive() {
        require(status == Status.Active, "Not active");
        _;
    }

    constructor(address _treasury) ERC20("MyToken", "MTK") Ownable(msg.sender) {
        treasury = _treasury;
    }

    // External functions
    // Public functions
    // Internal functions
    // Private functions
    // View/pure functions last
}
```

---

## 10. Common Gotchas

| Gotcha | Description | Fix |
|--------|------------|-----|
| Re-entrancy | External call before state update | CEI pattern + ReentrancyGuard |
| tx.origin auth | Phishable via malicious contract | Always use msg.sender |
| Unchecked return | ERC20 transfer may return false silently | Use SafeERC20 |
| Storage vs memory | Modifying memory struct doesn't update storage | Be explicit about data location |
| Uninitialized proxy | Implementation not initialized | Call _disableInitializers() in constructor |
| Floating pragma | `^0.8.0` allows untested compiler versions | Pin the EXACT version you audit/deploy, e.g. `pragma solidity 0.8.36;` |
| Front-running | Pending tx visible in mempool | Commit-reveal, private mempools/MEV-protect RPC, slippage limits |
| Block.timestamp | Proposers can nudge it (seconds) | Don't use for precise timing/randomness |
| Selector collision | Proxy + impl share selector space | Check with `forge selectors collision` |
| ERC20 approve race | approve(0)→approve(new) needed for some tokens | OZ v5 **removed `increaseAllowance`/`decreaseAllowance` from base ERC20**. Use `SafeERC20.safeIncreaseAllowance`/`forceApprove`, or `permit` (EIP-2612). Don't call the removed base methods. |
| `_update` override (OZ v5) | v5 replaced `_beforeTokenTransfer`/`_afterTokenTransfer` with one `_update(from,to,value)` hook | Override `_update` for mint/burn/transfer hooks; call `super._update(...)` |
| `transfer`/`send` 2300 gas | Hard-coded stipend breaks with proxies/multisigs (gas repricing) | Use `call{value:...}("")` + check return, with CEI/reentrancy guard |

### Foundry Cheat Codes Quick Reference
```solidity
vm.prank(alice);             // Next call from alice
vm.startPrank(alice);        // All calls from alice until stopPrank
vm.deal(alice, 1 ether);     // Set ETH balance
deal(address(token), alice, 1000e18); // Set ERC20 balance
vm.warp(block.timestamp + 1 days);   // Time travel
vm.roll(block.number + 100);         // Block number travel
vm.expectRevert(MyError.selector);   // Expect next call reverts (prefer selector over string)
vm.expectEmit(true, true, false, true); // Expect event (indexed1, indexed2, indexed3, data)
vm.record();                          // Start recording storage
vm.accesses(addr);                    // Get storage reads/writes
vm.expectPartialRevert(MyError.selector); // Match custom-error selector ignoring args
skip(1 hours);                        // Skip time forward
rewind(1 hours);                      // Rewind time
makeAddr("name");                     // Deterministic address from label
```

---

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
