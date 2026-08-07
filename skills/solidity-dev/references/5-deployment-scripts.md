## Contents

- 5. Deployment Scripts
- Foundry Script
- Production deployment checklist (run top-to-bottom)
- Hardhat Ignition

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
