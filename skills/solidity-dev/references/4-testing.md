## Contents

- 4. Testing
- Unit Test (Foundry)
- Fuzz Testing
- Invariant Testing
- Fork Testing
- Hardhat Testing (TypeScript: Hardhat 3, node:test + viem toolbox)

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
