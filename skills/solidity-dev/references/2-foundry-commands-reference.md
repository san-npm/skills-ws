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
