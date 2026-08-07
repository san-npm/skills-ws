## Contents

- 10. Common Gotchas
- Foundry Cheat Codes Quick Reference

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
