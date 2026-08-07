## Contents

- 6. Environment & Key Management
- .env (NEVER commit this — add to .gitignore)
- Foundry Keystore (encrypted, recommended for everyday signing)
- Hardware Wallet (recommended for mainnet)

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
