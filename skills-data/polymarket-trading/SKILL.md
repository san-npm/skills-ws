---
name: polymarket-trading
description: Polymarket prediction market trading — market analysis, edge calculation, bookmaker cross-referencing, order placement via CLOB API, position management, and redemption. Covers sports betting strategy, risk management, and the full Polymarket SDK workflow.
version: 1.0.0
---

# Polymarket Trading

Complete framework for analyzing, trading, and managing positions on Polymarket — the world's largest prediction market.

## Table of Contents

1. [Market Analysis Framework](#market-analysis-framework)
2. [Edge Calculation](#edge-calculation)
3. [Bookmaker Cross-Referencing](#bookmaker-cross-referencing)
4. [Risk Management Rules](#risk-management-rules)
5. [APIs & Data Sources](#apis--data-sources)
6. [Trading via CLOB](#trading-via-clob)
7. [Position Management & Redemption](#position-management--redemption)
8. [Understanding Polymarket Mechanics](#understanding-polymarket-mechanics)
9. [Common Pitfalls](#common-pitfalls)

---

## Market Analysis Framework

### The Scan Pipeline

For every potential bet, follow this pipeline in order:

```
1. Polymarket prices → identify markets with volume > $10K
2. Filter → bookmaker favorites > 65% implied probability
3. Injury/news check → any material changes not priced in?
4. Form & H2H analysis → recent performance, matchup history
5. Cross-reference 3+ bookmaker sources → calculate true probability
6. Calculate edge → only bet if edge > 10% vs Polymarket price
7. Size the bet → based on edge magnitude and bankroll
```

### Market Selection Criteria

**Good markets:**
- High volume (> $10K) — ensures liquidity for entry and exit
- Near-term resolution (days, not months) — capital efficiency
- Binary outcomes with clear resolution criteria
- Markets where bookmaker odds exist for cross-referencing

**Bad markets:**
- Low liquidity (< $5K volume) — wide spreads eat your edge
- Subjective resolution criteria — dispute risk
- Markets with insider information advantage (crypto governance, company decisions)
- Long-dated futures that tie up capital for months

---

## Edge Calculation

### The Math

```
Bookmaker Implied Probability = 1 / Decimal Odds
Edge = (True Probability - Polymarket Price) / Polymarket Price × 100

Example:
  Bookmaker odds: -225 (decimal 1.44) → Implied probability: 69.4%
  Polymarket price: $0.645 (64.5%)
  Edge = (69.4 - 64.5) / 64.5 × 100 = 7.6%
```

### American Odds to Probability

```
Negative odds (favorites):  Probability = |odds| / (|odds| + 100)
  -225 → 225 / 325 = 69.2%

Positive odds (underdogs):  Probability = 100 / (odds + 100)
  +150 → 100 / 250 = 40.0%
```

### Removing the Vig

Bookmaker odds include a margin (vig). To get true probabilities:

```
1. Convert both sides to implied probabilities
2. Sum them (will be > 100%, e.g., 105%)
3. Divide each by the sum to normalize to 100%

Example:
  Team A: -200 → 66.7%    Team B: +170 → 37.0%
  Sum: 103.7%
  True A: 66.7 / 103.7 = 64.3%
  True B: 37.0 / 103.7 = 35.7%
```

### Edge Thresholds

| Edge | Action |
|------|--------|
| < 5% | Skip — too thin, transaction costs eat it |
| 5-10% | Marginal — only if very high conviction + multiple sources agree |
| **> 10%** | **Target zone — place the bet** |
| > 20% | Strong edge — size up, but verify it's not a trap (news you missed?) |

---

## Bookmaker Cross-Referencing

### Why Cross-Reference?

Polymarket prices are set by traders, not oddsmakers. They systematically:
- **Overvalue favorites** by 3-7% in major sports markets
- **Undervalue underdogs/draws** in 3-way football markets
- **Lag behind** sharp bookmaker lines by hours

### Sources to Cross-Reference

| Source | Use | Notes |
|--------|-----|-------|
| **Pinnacle** | Sharpest lines globally | Gold standard, lowest vig |
| **Bet365** | Popular, liquid markets | Good for mainstream sports |
| **DraftKings/FanDuel** | US sports | NFL, NBA, MLB, NHL |
| **Betfair Exchange** | True market prices | No vig, just commission |
| **OddsPortal/OddsChecker** | Aggregators | Compare across 20+ books |
| **Action Network** | Analysis + odds | Good injury/form context |

### The 3-Source Rule

Never bet based on a single bookmaker. Always confirm with **3+ independent sources**:

```
✅ Good: Pinnacle -220, Bet365 -225, DraftKings -215 → consensus ~69%
   Polymarket at 60¢ → 15% edge → BET

❌ Bad: Only one bookmaker has odds, others don't list the market
   → Information asymmetry, you might be wrong
```

---

## Risk Management Rules

### Bankroll Management

```
Max single bet:     10% of bankroll
Typical bet size:   2-5% of bankroll
Max daily exposure: 25% of bankroll
```

### Hard Rules

1. **Sport only** — No crypto, politics, or geopolitics bets. Crypto markets are manipulated by insiders.
2. **Only heavy favorites** — Bookmaker implied probability > 65%
3. **Edge > 10%** — No exceptions for "gut feelings"
4. **3+ sources minimum** — Cross-reference before every bet
5. **No long shots** — Underdogs and parlays are money pits
6. **The best trade is sometimes no trade** — Don't force action

### When NOT to Bet

- Market is illiquid (< $5K volume, wide spreads)
- News is breaking and odds haven't settled
- You can't find 3 bookmakers listing the event
- The edge comes from a single outlier source
- You're chasing losses from a previous bet
- Resolution criteria are ambiguous

### Track Record Requirements

- Target **80%+ win rate** on individual bets
- If below 60% over 10+ bets, stop and re-evaluate strategy
- Log every bet: market, entry price, bookmaker consensus, edge, result

---

## APIs & Data Sources

### Gamma API (Public, No Auth)

Market discovery and search. Base: `https://gamma-api.polymarket.com`

```
GET /public-search?q=<query>             — Search markets/events
GET /events?active=true&closed=false      — List active events
GET /events?tag_slug=<slug>               — Events by category (sports, politics, crypto)
GET /markets?slug=<slug>                  — Market details by slug
GET /tags                                  — All available categories
```

**Key response fields:**
- `outcomePrices` — Current Yes/No prices (JSON string, parse it)
- `clobTokenIds` — Token IDs needed for CLOB trading (JSON string)
- `volume` — Total dollar volume traded
- `negRisk` — If true, uses negRisk contract (multi-outcome markets)
- `groupItemTitle` — The outcome name in grouped markets

### CLOB API (Public reads, Auth for trading)

Order book and trading. Base: `https://clob.polymarket.com`

```
# Public (no auth)
GET /midpoint?token_id=<id>              — Midpoint price
GET /book?token_id=<id>                  — Full order book
GET /spread?token_id=<id>               — Bid-ask spread
GET /price?token_id=<id>&side=buy|sell  — Best available price
GET /tick-size?token_id=<id>            — Min price increment

# Authenticated (requires L2 API key)
POST /order                              — Place order
DELETE /order/<id>                       — Cancel order
GET /orders                              — Open orders
GET /balances                            — CLOB balances
```

### Data API (Public, No Auth)

Positions and history. Base: `https://data-api.polymarket.com`

```
GET /positions?user=<wallet_address>     — All positions for a wallet
GET /trades?user=<wallet_address>        — Trade history
```

### Authentication Model

Two-layer auth system:
- **L1 (Wallet Signature)**: EIP-712 signature from your Polygon wallet — used to derive API credentials
- **L2 (API Key)**: HMAC-SHA256 headers for all trading operations

**Headers for authenticated requests:**
```
POLY_ADDRESS      — Wallet address
POLY_SIGNATURE    — HMAC signature of request
POLY_TIMESTAMP    — Unix timestamp
POLY_NONCE        — Request nonce
POLY_API_KEY      — Your API key
POLY_PASSPHRASE   — Your passphrase
POLY_SECRET       — Your API secret (used for HMAC)
```

---

## Trading via CLOB

### Using the TypeScript SDK

```javascript
const { ClobClient, Side } = require('@polymarket/clob-client');
const { Wallet } = require('ethers');

// Initialize client
const wallet = new Wallet(PRIVATE_KEY);
const client = new ClobClient(
  'https://clob.polymarket.com',
  137, // Polygon chainId
  wallet,
  creds // { apiKey, secret, passphrase }
);

// Derive API credentials (first time)
const creds = await client.createOrDeriveApiKey();

// Place a limit buy order
const order = await client.createAndPostOrder({
  tokenID: '<token_id>',  // From Gamma API clobTokenIds
  price: 0.65,            // Max price willing to pay
  size: 10,               // Dollar amount
  side: Side.BUY,
}, { tickSize: '0.01' });  // Check tick-size endpoint first

// Cancel an order
await client.cancelOrder(orderId);

// Get open orders
const orders = await client.getOpenOrders();
```

### Order Flow

```
1. Search market on Gamma → get slug
2. Get market details → extract clobTokenIds and outcomePrices
3. Identify the outcome you want (Yes token ID vs No token ID)
4. Check tick-size for that token
5. Check current best price: GET /price?token_id=X&side=buy
6. Place limit order at your target price
7. Monitor: GET /orders to check if filled
```

### Token ID Selection

Grouped markets (like "Who wins UFC 326?") have multiple outcomes. Each outcome has a Yes and No token:

```
Market: "UFC 326 Main Event"
  Outcome: "Max Holloway"
    → Yes Token ID: 7068099725...  (buy this if you think Holloway wins)
    → No Token ID:  1293847561...  (buy this if you think Holloway loses)
  Outcome: "Charles Oliveira"
    → Yes Token ID: 8843920183...
    → No Token ID:  5567382910...
```

The Gamma API returns `clobTokenIds` as a JSON string with `[NoTokenId, YesTokenId]` — **index 1 is Yes**.

---

## Position Management & Redemption

### Checking Positions

```
GET https://data-api.polymarket.com/positions?user=<wallet_address>
```

Returns all current positions with:
- `asset` — Token ID
- `size` — Number of shares
- `avgPrice` — Average entry price
- `currentPrice` — Current market price
- `pnl` — Unrealized P&L

### Redeeming Resolved Positions

When a market resolves, winning shares are worth $1.00. You need to call the contract to redeem:

**Standard markets** (2-outcome, `negRisk: false`):
```javascript
// Call ConditionalTokens contract: redeemPositions()
const CTF_ADDRESS = '0x4D97DCd97eC945f40cF65F87097ACe5EA0476045';
```

**NegRisk markets** (multi-outcome, `negRisk: true`):
```javascript
// Call NegRiskAdapter: redeemPositions()
const NEG_RISK_ADAPTER = '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296';
// Also call NegRiskCTFExchange for conversion
const NEG_RISK_EXCHANGE = '0xC5d563A36AE78145C45a50134d48A1215220f80a';
```

### Exit Strategies

- **Winner**: Hold until resolution → redeem at $1.00
- **Cut losses**: Sell on the CLOB if the market moves against you
- **Take profit**: If price moved significantly in your favor before resolution, consider selling early to lock in gains and free capital

---

## Understanding Polymarket Mechanics

### How Prices Work

- Prices = probabilities ($0.65 = market says 65% chance of Yes)
- Markets resolve to $1.00 (correct outcome) or $0.00 (incorrect)
- Your profit = $1.00 - entry price (per share, if you win)
- Your loss = entry price (per share, if you lose)

### Where Polymarket Misprices

| Pattern | Why | How to Exploit |
|---------|-----|----------------|
| Favorites overvalued by 3-7% | Retail bias toward "safe" bets | Compare vs sharp bookmaker lines |
| Underdogs/draws undervalued | People avoid complexity | 3-way football markets (win/draw/lose) |
| Slow to react to news | Traders aren't 24/7 | Fast reaction to injury reports, lineups |
| Low-volume markets inefficient | Not enough informed traders | Small edges in niche markets |

### Polymarket vs Bookmakers

| Feature | Polymarket | Traditional Bookmaker |
|---------|-----------|----------------------|
| Vig/margin | 0% (peer-to-peer) | 3-10% |
| Liquidity | Variable | Guaranteed |
| Resolution | Smart contract | Bookmaker decides |
| Settlement | USDC on Polygon | Fiat |
| Edge | Retail-driven inefficiencies | Sharp lines, hard to beat |

### Chain Details

- **Chain**: Polygon (MATIC for gas, USDC.e for trading)
- **USDC.e contract**: `0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174`
- **Note**: Polymarket uses USDC.e (bridged), NOT native USDC
- **Geo**: Restricted in some countries (US blocked, most of EU is fine)

---

## Common Pitfalls

### ❌ Mistakes to Avoid

1. **Betting on crypto/politics markets** — Insider manipulation is rampant (project teams, whale wallets, political operatives)
2. **Chasing long shots** — A 5¢ token that could pay $1 sounds amazing; it almost never hits
3. **Ignoring liquidity** — A "great price" means nothing if you can't exit
4. **Single-source analysis** — One bookmaker can be wrong; always cross-reference
5. **Overexposure** — Never have > 25% of bankroll in active bets
6. **Ignoring the vig** — Bookmaker odds include margin; remove it before comparing
7. **Trading illiquid markets** — Wide spreads (> 5¢) silently destroy your edge
8. **Holding long-dated positions** — Capital is locked; shorter resolution = better capital efficiency
9. **Not tracking results** — Without a log, you can't evaluate if your strategy works
10. **Emotional trading** — If you just lost, don't immediately place another bet

### ✅ Habits of Profitable Traders

1. Systematic scan pipeline for every bet (not ad-hoc)
2. Spreadsheet tracking all bets with entry, target, result, edge
3. Walk away when there's no edge — most days have no good bets
4. Focus on 1-2 sports you know deeply rather than spreading thin
5. Check injury reports, team news, and lineup confirmations before betting
6. Review win/loss ratio monthly and adjust thresholds if needed
