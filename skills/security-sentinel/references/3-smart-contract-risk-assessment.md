## Contents

- 3. Smart Contract Risk Assessment
- Honeypot Detection
- Rug Pull Indicators
- Automated Contract Scan Checklist

## 3. Smart Contract Risk Assessment

### Honeypot Detection

```bash
# Quick honeypot check (token contracts)
# A honeypot lets you buy but blocks selling

# Check with honeypot.is API
curl -s "https://api.honeypot.is/v2/IsHoneypot?address=$TOKEN_ADDRESS&chainID=1"
```

### Rug Pull Indicators

| Check | How | Red Flag |
|-------|-----|----------|
| Ownership | Read `owner()` or `Ownable` | Owner can mint unlimited tokens |
| Renounced | Check if owner is `0x0` | Not renounced = owner can rug |
| Liquidity lock | Check LP token holder | LP tokens not locked or short lock |
| Proxy contract | Check for `delegatecall` patterns | Owner can change logic at will |
| Hidden mint | Search for `_mint` outside constructor | Can inflate supply post-launch |
| Transfer restrictions | Check `_transfer` overrides | May block selling |
| Fee manipulation | Check `setFee`/`setTax` functions | Owner can set 100% sell tax |
| Blacklist function | Search for `blacklist`/`isBlacklisted` | Owner can freeze your tokens |

### Automated Contract Scan Checklist

```
1. Is source code verified on block explorer?          → No = HIGH RISK
2. Is ownership renounced (owner == 0x0)?              → No = CHECK FURTHER
3. Are there mint functions callable by owner?          → Yes = HIGH RISK
4. Are there blacklist/whitelist functions?              → Yes = MEDIUM RISK
5. Is there a max transaction/wallet limit?             → Check if owner-adjustable
6. Are LP tokens locked? For how long?                  → <30 days = HIGH RISK
7. Are there pausable functions?                        → Yes = MEDIUM RISK (could be legitimate)
8. Does the contract use upgradeable proxy?             → Yes = CHECK proxy admin
```

---
