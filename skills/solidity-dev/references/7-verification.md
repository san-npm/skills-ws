## Contents

- 7. Verification
- Etherscan
- Sourcify
- Hardhat

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
