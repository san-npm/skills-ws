## Contents

- 4. DeFi-Specific Audit
- AMM Invariants
- Lending Protocol Checks
- Flash Loan Guards
- ERC-4626 Vault Inflation / Donation Attack
- Permit2 / ERC-2612 Signature Replay
- L2 Sequencer & Oracle Liveness (Arbitrum/Optimism/Base)
- Cross-Chain Bridge / Message Replay
- Account Abstraction (ERC-4337) / Paymaster
- Restaking / Oracle & Yield Composition (LRT/LST)

## 4. DeFi-Specific Audit

### AMM Invariants
- Constant product: `k = reserveA * reserveB` must hold after every swap
- Check for rounding manipulation on small liquidity pools
- Verify fee calculations don't break invariant
- LP token mint/burn must be proportional to liquidity added/removed

### Lending Protocol Checks
Get the risk-parameter ordering right — this is a common source of "instantly liquidatable" bugs:
- **Max LTV / collateral factor < liquidation threshold < 100%.** A borrower may only draw up to *max LTV* of collateral value; a position becomes liquidatable once debt exceeds the (higher) *liquidation threshold*. If liquidation threshold ≤ collateral factor, a user can be liquidated the instant they borrow at the limit. (Aave-style example: collateral factor 75%, liquidation threshold 80%, leaving an 5% safety band.)
- **Liquidation bonus/penalty** is bounded so liquidations stay profitable but don't over-seize collateral (e.g., 5–10%); confirm it can't push the liquidated position into bad debt unnecessarily.
- **Health factor** `= (collateral * liquidationThreshold) / debt`; liquidatable when `< 1e18`. Audit the math for rounding direction (round against the user on solvency checks) and decimal scaling across assets.
- Collateral/borrow factor setter bounds (governance can't set manipulative values; ideally timelocked).
- Interest-rate model edge cases (0% and 100% utilization; kink behavior; no division-by-zero at empty reserves).
- Bad-debt socialization mechanism exists and is fair.
- **Oracle quality:** staleness/heartbeat checks, `updatedAt` staleness against the feed's documented heartbeat (`answeredInRound` is deprecated in the Chainlink API; flag code that still relies on it), min/max price bounds (Chainlink can return clamped extremes during flash crashes), and a fallback/pause path on feed failure.
- Borrow cap and supply cap enforcement.

### Flash Loan Guards
```solidity
modifier noFlashLoan() {
    require(lastActionBlock[msg.sender] < block.number, "same block");
    _;
    lastActionBlock[msg.sender] = block.number;
}
```

Check: Can a flash loan be used to manipulate governance, oracle prices, or collateral ratios within a single transaction?

### ERC-4626 Vault Inflation / Donation Attack
First depositor mints 1 wei of shares, then **donates** assets directly to the vault, inflating share price so a second depositor's deposit rounds down to 0 shares and is stolen. Audit for:
- A **virtual-share/asset offset** (`_decimalsOffset()` in OZ ERC4626, or seed/dead-shares on first deposit) — this is the standard mitigation.
- `convertToShares`/`previewDeposit` rounding direction (must round **down** for shares minted to depositor).
- `totalAssets()` based on internal accounting where appropriate, not raw `balanceOf`, so direct donations don't move the exchange rate.

### Permit2 / ERC-2612 Signature Replay
- ERC-2612 `permit`: confirm `nonces` increments and `deadline` is enforced; one signature must not be replayable. Beware front-running of `permit` (use try/catch around it so a griefer can't revert the tx).
- **Permit2** (Uniswap): check `SignatureTransfer` nonces are unordered-nonce bitmaps consumed exactly once, and `AllowanceTransfer` expirations are honored. Validate the EIP-712 domain (`chainId` bound) so signatures can't be replayed cross-chain or after a fork.

### L2 Sequencer & Oracle Liveness (Arbitrum/Optimism/Base)
On L2s, a down sequencer freezes price updates while users can't act. Gate price reads on Chainlink's L2 **sequencer uptime feed**:
```solidity
(, int256 up, uint256 startedAt, , ) = sequencerUptimeFeed.latestRoundData();
require(up == 0, "sequencer down");                 // 0 = up
require(block.timestamp - startedAt > 3600, "grace");// grace period after restart
```

### Cross-Chain Bridge / Message Replay
- Every cross-chain message must be **idempotent**: a `bytes32 messageId`/nonce marked consumed before effects (CEI), so a replayed or reordered message can't double-mint.
- Validate source chain id + source sender against an allowlist; never trust `msg.sender` of the local endpoint alone.
- Check finality assumptions (reorg on source chain), and that EIP-712 domains include `chainId` so signatures don't replay across chains/forks.

### Account Abstraction (ERC-4337) / Paymaster
- `validateUserOp` must not have side effects beyond paying the prefund and must respect storage-access rules (no banned opcodes/cross-account storage) or bundlers drop it.
- **Paymaster**: griefing/DoS where an attacker drains the paymaster's deposit via ops that pass validation but waste gas; enforce per-sender limits and validate the sponsored calldata.
- Replay across `entryPoint` versions/chains — confirm the UserOp hash binds `chainId` and the deployed EntryPoint address.

### Restaking / Oracle & Yield Composition (LRT/LST)
- LST/LRT exchange rates (e.g., stETH, weETH) are themselves oracles — using a manipulable or stale rate as collateral is a composition risk; prefer a rate with its own staleness guard.
- Slashing/withdrawal-queue delays mean redemptions aren't instant; audit assumptions that collateral is liquid on demand.
- Beware double-counting of rewards across stacked protocols and re-entrancy through reward-claim callbacks.

---
