---
name: polymarket
description: >
  Sports betting on Polymarket prediction markets. Scan bookmaker odds via The Odds API,
  find high-conviction favorites (>70% implied probability), match to Polymarket markets,
  and execute trades for better payouts than traditional bookmakers. Use when asked about
  "polymarket", "sports betting", "place a bet", "scan for bets", "check my positions",
  "redeem bets", "NBA odds", "football odds", "betting picks", or "what should I bet on".
---

# Polymarket Sports Betting

## ⚠️ CRITICAL RULES (Non-Negotiable)

1. **SPORTS ONLY** — Never bet on crypto, politics, or geopolitics. Crypto markets are manipulated by insiders.
2. **Favorites only** — Minimum **70% implied probability on bookmakers** (averaged across 20+ books via The Odds API).
3. **No long shots** — Ever. Long shots = money pit.
4. **The best trade is sometimes no trade** — If nothing qualifies, say so.
5. **Every bet must be high conviction** — Target 70%+ win rate across all bets.
6. **Verify Polymarket availability** — Many matches aren't listed on PM. Never recommend a bet without confirming the PM market exists and resolving the token ID.
7. **Football 3-way markets are harder** — PM splits win/draw/lose probability differently than bookmakers. Flag this to the user.

## Wallet & Keys

- **Address:** `0xCa5e2a326DE9544EAe2810E3f0E4e1d4Cef1847b`
- **Chain:** Polygon (USDC.e)
- **Positions API:** `https://data-api.polymarket.com/positions?user=0xCa5e2a326DE9544EAe2810E3f0E4e1d4Cef1847b`
- **Keys:** macOS Keychain, account `stuart`:
  - `polymarket-wallet-key`, `polymarket-api-key`, `polymarket-api-secret`, `polymarket-api-passphrase`
  - `odds-api-key` (The Odds API)

## Supported Sports

| The Odds API Key | Sport |
|---|---|
| `basketball_nba` | NBA |
| `soccer_epl` | English Premier League |
| `soccer_spain_la_liga` | La Liga |
| `soccer_italy_serie_a` | Serie A |
| `soccer_germany_bundesliga` | Bundesliga |
| `soccer_france_ligue_one` | Ligue 1 |
| `soccer_efl_champ` | EFL Championship |

## Scripts

All scripts are in the skill directory: `~/.agents/skills/polymarket/`

| Script | Purpose | Auth Required |
|---|---|---|
| `scripts/scan.mjs` | Scan odds → filter → match PM → present picks | No (read-only) |
| `polymarket.mjs` | Query PM markets (search, price, book, spread) | No |
| `trade.mjs` | Place buy/sell orders on PM | Yes |
| `redeem.mjs` | Redeem resolved winning positions | Yes |

---

## Workflow

### Step 1: SCAN — Fetch Bookmaker Odds

Run the scan script to find qualifying bets:

```bash
# Scan all sports
node ~/.agents/skills/polymarket/scripts/scan.mjs --all-sports

# Single sport
node ~/.agents/skills/polymarket/scripts/scan.mjs --sport=basketball_nba

# Custom probability threshold
node ~/.agents/skills/polymarket/scripts/scan.mjs --all-sports --min-prob=0.75
```

The script:
1. Fetches odds from The Odds API (h2h market, EU region, decimal format)
2. Calculates implied probability per team (average of `1/decimal_odds` across all bookmakers)
3. Filters to favorites above the threshold (default 70%)
4. Searches Polymarket for matching moneyline markets
5. Resolves the correct token ID for each favorite outcome
6. Fetches current PM price
7. Outputs a table with: Game, Favorite, Book Prob, PM Price, Edge, Token ID, Kickoff

**Validation gate:** If the script returns no picks, stop. Tell the user "No qualifying bets today." Do not lower the threshold.

### Step 2: REVIEW — Validate Picks

Before presenting to the user, validate each pick:

1. **Book probability ≥ 70%** — Reconfirm the threshold is met
2. **PM market exists** — Token ID was resolved (not `N/A`)
3. **Edge is reasonable** — `Edge = Book Probability - PM Price`. Positive edge means PM is cheaper than books. Near-zero or negative edge is still fine (PM has better payouts than bookmakers regardless).
4. **Game hasn't started** — Check kickoff time vs current time
5. **Football 3-way caveat** — If it's a football match, note that draw probability affects the moneyline odds

**Validation gate:** Remove any picks where token ID is `N/A` or the game has already started.

### Step 3: PRESENT — Show Picks to User

Present qualifying picks in a clean format:

```
🏀 NBA Picks — March 8, 2026

| Game | Pick | Book Prob | PM Price | Edge | Kickoff |
|------|------|-----------|----------|------|---------|
| BOS vs WAS | Boston Celtics | 88.2% | 0.87 | +1.2% | 19:00 ET |
| LAL vs DET | LA Lakers | 74.5% | 0.73 | +1.5% | 21:30 ET |

Token IDs:
- Boston Celtics: 123456789...
- LA Lakers: 987654321...
```

Include:
- The sport and date
- Clear table of picks
- Token IDs for execution
- Any caveats (football 3-way, low liquidity)
- **Ask for explicit approval before executing any trade**

### Step 4: EXECUTE — Place Trades

After user approval, execute trades using `trade.mjs`:

```bash
# Buy $50 on Boston Celtics at 0.87
node ~/.agents/skills/polymarket/trade.mjs buy <token_id> 0.87 50
```

**Parameters:**
- `token_id` — From the scan output
- `price` — The PM price (or slightly above for guaranteed fill)
- `size` — Dollar amount to bet

**Validation gate:** Always confirm with the user before executing. Show the exact command that will run.

**Post-execution:** Show the order response. If the order is rejected, explain why (insufficient balance, price moved, etc.).

### Step 5: TRACK — Monitor Positions

Check current positions:

```bash
# Via Data API
curl "https://data-api.polymarket.com/positions?user=0xCa5e2a326DE9544EAe2810E3f0E4e1d4Cef1847b"

# Or via trade.mjs
node ~/.agents/skills/polymarket/trade.mjs balances
```

Check open orders:

```bash
node ~/.agents/skills/polymarket/trade.mjs orders
```

### Step 6: REDEEM — Collect Winnings

After markets resolve, redeem winning positions:

```bash
node ~/.agents/skills/polymarket/redeem.mjs
```

The script automatically:
- Finds all redeemable positions
- Handles both standard and negativeRisk markets
- Redeems via CTF contract on Polygon
- Reports the new USDC.e balance

---

## Error Handling

### Common Issues

| Error | Cause | Fix |
|---|---|---|
| `security: SecItemCopyMatching` | Keychain access denied | Run in terminal with Keychain access, or unlock Keychain |
| `HTTP 401` from Odds API | Invalid/expired API key | Check `security find-generic-password -s odds-api-key -a stuart -w` |
| `HTTP 429` from Odds API | Rate limited (500 req/month free tier) | Wait, or check remaining quota in response headers |
| Token ID `N/A` | PM doesn't have this market | Skip this pick — common for smaller football matches |
| `No results` from PM search | Team name mismatch | Try alternate team names or search manually via `polymarket.mjs search` |
| Order rejected | Price moved or insufficient USDC.e | Check balance, adjust price, retry |
| `NONCE_TOO_LOW` | Transaction nonce conflict | Wait 30s, retry |
| Redeem fails | Gas price spike on Polygon | Retry with higher gas — script uses 500 gwei max fee |

### The Odds API Quota

The free tier has 500 requests/month. Each scan of one sport = 1 request. A full `--all-sports` scan = 7 requests. Be mindful:
- Don't scan repeatedly in the same hour
- Check `x-requests-remaining` header in responses
- If close to limit, scan only the sport the user asks about

---

## Examples

### "Scan for bets today"

```
1. Run: node ~/.agents/skills/polymarket/scripts/scan.mjs --all-sports
2. Review output for qualifying picks
3. Present picks table to user
4. Wait for approval before trading
```

### "Bet $100 on the Celtics"

```
1. Search PM for the Celtics game: node ~/.agents/skills/polymarket/polymarket.mjs search "Celtics"
2. Find the moneyline market and resolve the token ID for the Celtics outcome
3. Get current price: node ~/.agents/skills/polymarket/polymarket.mjs price <token_id>
4. Cross-check bookmaker odds to confirm >70% implied probability
5. Present the trade: "Buy $100 on Celtics at 0.XX (PM), books have them at YY%"
6. After approval: node ~/.agents/skills/polymarket/trade.mjs buy <token_id> <price> 100
```

### "Check my positions"

```
1. Fetch: curl "https://data-api.polymarket.com/positions?user=0xCa5e2a326DE9544EAe2810E3f0E4e1d4Cef1847b"
2. Show open positions with current value
3. If any are redeemable: node ~/.agents/skills/polymarket/redeem.mjs
```

### "What are the odds on Real Madrid?"

```
1. Scan La Liga: node ~/.agents/skills/polymarket/scripts/scan.mjs --sport=soccer_spain_la_liga
2. Find Real Madrid in results
3. If they qualify (>70%), present as a pick
4. If they don't qualify, show the odds but warn it's below threshold
```

---

## Key Concepts

- **Implied probability:** `1 / decimal_odds` — averaged across all bookmakers for consensus
- **Edge:** `Book Probability - PM Price` — positive means PM is cheaper than fair value
- **Why PM over bookmakers:** Better payouts (no vig baked in the same way), no KYC, instant settlement on Polygon
- **This isn't arbitrage:** PM tracks fair value closely. The strategy is picking safe winners and benefiting from PM's superior payout structure
- **Volume:** Bet size is unrestricted, but every bet must meet the conviction threshold
