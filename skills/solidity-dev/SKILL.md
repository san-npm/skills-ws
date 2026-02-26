---
name: solidity-dev
description: "Solidity smart contract development — Foundry & Hardhat workflows, patterns, testing, deployment, and gas optimization."
---

# Solidity Development — Foundry & Hardhat

## 1. Project Setup

### Foundry Setup
```bash
# Install Foundry
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
solc_version = "0.8.24"
optimizer = true
optimizer_runs = 200
via_ir = false
ffi = false

[profile.default.fuzz]
runs = 10000
max_test_rejects = 65536
seed = "0x1"

[profile.ci.fuzz]
runs = 50000

[etherscan]
mainnet = { key = "${ETHERSCAN_API_KEY}" }
sepolia = { key = "${ETHERSCAN_API_KEY}" }

[rpc_endpoints]
mainnet = "${ETH_RPC_URL}"
sepolia = "${SEPOLIA_RPC_URL}"
```

### Hardhat Setup
```bash
mkdir my-project && cd my-project
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npx hardhat init  # Choose TypeScript project

# Project structure
# ├── contracts/     — Solidity source files
# ├── test/          — Test files (.ts)
# ├── scripts/       — Deployment scripts (.ts)
# ├── ignition/      — Hardhat Ignition modules
# └── hardhat.config.ts
```

### hardhat.config.ts
```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: false,
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.ETH_RPC_URL || "",
        blockNumber: 19000000, // pin block for deterministic tests
      },
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    mainnet: {
      url: process.env.ETH_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
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
cast send $ADDR "transfer(address,uint256)" $TO $AMT --private-key $PK
cast abi-encode "constructor(address,uint256)" $ADDR 1000
cast sig "transfer(address,uint256)"           # → 0xa9059cbb
cast 4byte 0xa9059cbb                          # → transfer(address,uint256)
cast storage $ADDR 0 --rpc-url mainnet         # Read slot 0
cast estimate $ADDR "mint(uint256)" 5 --rpc-url mainnet
cast etherscan-source $ADDR --etherscan-api-key $KEY

# Anvil (local node)
anvil                                # Start local node (port 8545)
anvil --fork-url $ETH_RPC_URL        # Fork mainnet
anvil --fork-url $ETH_RPC_URL --fork-block-number 19000000
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

### UUPS Proxy (Recommended Upgrade Pattern)
```solidity
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract VaultV1 is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    uint256 public fee;
    uint256[50] private __gap; // storage gap for future upgrades

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
    // Fork mainnet in foundry.toml or via --fork-url
    uint256 forkId = vm.createFork(vm.envString("ETH_RPC_URL"), 19000000);
    vm.selectFork(forkId);

    address WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    // Test real protocol interactions...
}
```

### Hardhat Testing (TypeScript)
```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("Vault", () => {
  async function deployFixture() {
    const [owner, alice] = await ethers.getSigners();
    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy();
    return { vault, owner, alice };
  }

  it("accepts deposits", async () => {
    const { vault, alice } = await loadFixture(deployFixture);
    await vault.connect(alice).deposit({ value: ethers.parseEther("1") });
    expect(await vault.balances(alice.address)).to.equal(ethers.parseEther("1"));
  });
});
```

---

## 5. Deployment Scripts

### Foundry Script
```solidity
// script/Deploy.s.sol
import "forge-std/Script.sol";
import "../src/Vault.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        Vault vault = new Vault();
        console.log("Vault deployed at:", address(vault));

        vm.stopBroadcast();
    }
}
```

```bash
# Deploy to sepolia
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url sepolia --broadcast --verify -vvvv

# Deploy to mainnet (with confirmation)
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url mainnet --broadcast --verify --slow
```

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

### .env (NEVER commit this)
```bash
PRIVATE_KEY=0x...
ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
ETHERSCAN_API_KEY=YOUR_KEY
```

### Foundry Keystore (encrypted, recommended)
```bash
cast wallet import deployer --interactive  # Enter private key + password
# Then use:
forge script Deploy.s.sol --account deployer --sender 0xYourAddr --broadcast
```

### Hardware Wallet
```bash
# Foundry supports Ledger/Trezor via --ledger flag
forge script Deploy.s.sol --ledger --sender 0xYourAddr --broadcast
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
    for (uint256 i; i < to.length; ) {
        _transfer(msg.sender, to[i], amounts[i]);
        unchecked { ++i; }
    }
}
```

---

## 9. Solidity Style Guide

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title MyToken — A custom ERC20 token
/// @author Your Name
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
| Floating pragma | `^0.8.0` allows untested compiler versions | Pin: `pragma solidity 0.8.24;` |
| Front-running | Pending tx visible in mempool | Commit-reveal, private mempools, slippage limits |
| Block.timestamp | Miners can manipulate ±15s | Don't use for precise timing |
| Selector collision | Proxy + impl share selector space | Check with `forge selectors collision` |
| ERC20 approve race | approve(0) then approve(new) needed for some tokens | Use increaseAllowance or permit |

### Foundry Cheat Codes Quick Reference
```solidity
vm.prank(alice);             // Next call from alice
vm.startPrank(alice);        // All calls from alice until stopPrank
vm.deal(alice, 1 ether);     // Set ETH balance
deal(address(token), alice, 1000e18); // Set ERC20 balance
vm.warp(block.timestamp + 1 days);   // Time travel
vm.roll(block.number + 100);         // Block number travel
vm.expectRevert("message");          // Expect next call reverts
vm.expectEmit(true, true, false, true); // Expect event
vm.record();                          // Start recording storage
vm.accesses(addr);                    // Get storage reads/writes
skip(1 hours);                        // Skip time forward
rewind(1 hours);                      // Rewind time
makeAddr("name");                     // Deterministic address from label
```
