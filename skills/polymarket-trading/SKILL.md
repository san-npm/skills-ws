---
name: polymarket-trading
description: "Analyze sports prediction markets on Polymarket: scan bookmaker odds (The Odds API) for a raw shortlist, then de-vig to true probabilities to find positive-EV favorites, and optionally execute trades after confirmation. Use when the user mentions polymarket, prediction markets, sports betting, scan/place bets, NBA/football odds, positions, redeem, or edge."
---

# Polymarket Sports Prediction Markets

> **⚠️ FINANCIAL & LEGAL RISK DISCLAIMER — READ FIRST**
>
> This skill moves real money into a speculative prediction market. **Capital is at risk and you can lose 100% of any stake. There are no guaranteed payouts.** Past results never predict future outcomes, and "high-conviction favorites" lose routinely.
>
> - **This is not financial advice.** It is an analysis-and-execution aid only. You are solely responsible for every trade.
> - **Legality varies by jurisdiction and changes fast.** Prediction-market / event-contract access may be restricted, KYC-gated, or outright illegal where you live. As of mid-2026: the international Polymarket exchange is geoblocked for US IPs (2022 CFTC settlement); a separate **Polymarket US** venue (operated by QCX LLC, a CFTC-regulated DCM) requires **full KYC** and USD settlement; and several US states have challenged or banned prediction markets (e.g. Minnesota ban effective 1 Aug 2026). Verify your own eligibility before doing anything: <https://polymarket.com> and <https://help.polymarket.com>.
> - **You must comply with KYC, age limits, the platform Terms of Service, sanctions rules, and local gambling law.** Do not attempt to bypass geoblocks or KYC.
> - **You are responsible for your own taxes and record-keeping** on any winnings/losses. Consult a qualified professional.
> - **Practice responsible gambling.** Set a hard bankroll and loss limit, never stake money you cannot afford to lose, and stop when you hit your limit. (US: 1-800-GAMBLER.)
>
> Run the read-only scan freely. **Never execute a trade without explicit, per-trade user confirmation** of amount, market, outcome, token ID, chain, max price, and worst-case loss.

## ⚠️ STRATEGY RULES (Non-Negotiable)

1. **Sports markets only by default** — This skill is scoped to sports moneylines. Avoid politics, crypto, and geopolitics markets here: they are harder to price from a clean odds benchmark, can move on non-public information, and have thinner, more reflexive liquidity. This is a scoping choice, not a claim that any specific market is rigged.
2. **De-vig before you judge a favorite** — Raw `1/decimal_odds` includes the bookmaker's margin (vig) and **overstates** probability. Always normalize per bookmaker (see "De-vig math") before applying any probability threshold. Minimum **70% de-vigged consensus probability** to qualify as a favorite.
3. **Require positive expected value (+EV)** — A favorite is only a trade if the executable Polymarket price is **below** the de-vigged true probability *after* fees and slippage. Win rate is **not** EV: a true 70% favorite bought at 0.75 is **negative EV** and must be skipped. See "Edge & EV".
4. **No long shots.** Low-probability / high-payout punts are out of scope.
5. **The best trade is sometimes no trade** — If nothing clears the de-vig + +EV bar, say so. Never lower the threshold to manufacture a pick.
6. **Verify the Polymarket market exists** — Many matches are not listed. Never recommend a bet without confirming the PM market and resolving the correct outcome `token_id`.
7. **Size by bankroll and liquidity, not by conviction** — Bet size is **not** unlimited. It is capped by (a) your pre-set bankroll/loss limit, (b) order-book depth at your price (slippage), and (c) any platform/market limits. See "Position sizing".
8. **Football 3-way markets need care** — Win/Draw/Lose means a "win" outcome is priced against two alternatives. De-vig across all three outcomes per bookmaker; never compare a 2-way PM price to a non-normalized 3-way book number.

## Configuration (placeholders — never hardcode real values)

Set these in your environment. **Never commit a real wallet address, private key, API key, or personal account name into a skill, repo, or prompt.**

| Variable | Purpose | Example placeholder |
|---|---|---|
| `$ODDS_API_KEY` | The Odds API key (read-only scan) | `the-odds-api-key` |
| `$POLYMARKET_WALLET` | Your Polygon address for positions lookups | `0xYourWalletAddress` |
| `$POLYMARKET_PK` | Wallet private key — **execution only**, keep in a secret store | (never in plaintext) |
| `$POLYMARKET_API_KEY` / `_SECRET` / `_PASSPHRASE` | CLOB API credentials — **execution only** | (secret store) |
| `$KEYCHAIN_ACCOUNT` | macOS Keychain account name, if you use Keychain | `<your-keychain-account>` |

- **Chain:** Polygon. **Collateral:** Polymarket migrated its exchange stack on **28 Apr 2026** to a new collateral token, **pUSD** (Polymarket USD, an ERC-20 backed 1:1 by native Circle USDC), moving off bridged `USDC.e`. Do **not** assume `USDC.e` — confirm the current collateral token, decimals, and contract for your account at <https://docs.polymarket.com>.
- **Positions API (read-only):** `https://data-api.polymarket.com/positions?user=$POLYMARKET_WALLET`
- **Secret storage:** `scripts/scan.mjs` reads `$ODDS_API_KEY` from the environment first, and only falls back to the macOS Keychain (`security find-generic-password -s odds-api-key -a "$(whoami)"`) for local dev. **Never** put secrets in the SKILL or in shell history. Execution keys must live in a secret manager (Keychain, 1Password CLI, Vault, env injected at runtime), never on disk in plaintext.

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

| Script | Status | Purpose | Auth |
|---|---|---|---|
| `scripts/scan.mjs` | **Ships with this skill** | Scan odds → raw `1/odds` shortlist signal (NOT de-vigged) → match PM market → resolve token ID → live CLOB midpoint. De-vig + EV decision happen later in Step 2 | No (read-only) |
| Query helper (e.g. `polymarket.mjs`) | **User-supplied** | Search PM markets, get price/book/spread | No |
| Trade client (e.g. `trade.mjs`) | **User-supplied** | Place buy/sell orders on the CLOB | Yes |
| Redeem helper (e.g. `redeem.mjs`) | **User-supplied** | Redeem resolved winning positions | Yes |

Only `scripts/scan.mjs` is bundled. **The execution/query/redeem clients are NOT shipped** — they move money and must be written and audited by you against the current official SDK. A minimal buy-order template is inlined below in **Step 4: EXECUTE**; the query and redeem helpers are described (with the exact endpoints/contract calls they must make) in **Step 5: TRACK** and **Step 6: REDEEM**. Build all of them on the official client: <https://docs.polymarket.com> (Python `py-clob-client`, TypeScript `@polymarket/clob-client`).

---

## Workflow

### Step 1: SCAN — Fetch Bookmaker Odds for a Raw Shortlist (read-only)

```bash
# Scan all sports
node scripts/scan.mjs --all-sports

# Single sport
node scripts/scan.mjs --sport=basketball_nba

# Custom probability threshold (applied to the raw `1/odds` shortlist signal)
node scripts/scan.mjs --all-sports --min-prob=0.75
```

`scan.mjs` does the following (read-only — no keys needed beyond `$ODDS_API_KEY`):
1. Fetches odds from The Odds API (`h2h` market, EU region, decimal format, next ~2-3 days).
2. Computes a **raw** implied-probability signal per outcome by averaging `1/decimal_odds` across all listed bookmakers. This is **not** de-vigged — it overstates probability and is only a shortlist signal; de-vig happens in Step 2.
3. Filters to the top outcome per game above the threshold and matches it on Polymarket (Gamma `public-search`), resolving the outcome `token_id`.
4. Pulls the **live CLOB midpoint** for that token and reports `Edge = bookProb − pmPrice`.

> **Important caveat about `scan.mjs`'s numbers:** the bundled script reports a *raw* averaged `1/odds` figure and a *midpoint*-based edge. Raw `1/odds` is **not** de-vigged, so it inflates probability; and the midpoint is **not** an executable fill price. Treat scan output as a **shortlist**, then redo the math in Step 2 with proper de-vig and the real order-book ask before trusting any "edge".

**Validation gate:** If the scan returns no shortlist, stop. Tell the user "No qualifying bets today." Do not lower the threshold.

### Step 2: REVIEW — De-vig, then compute true Edge & EV

For every shortlisted pick, recompute the math correctly before presenting it.

**De-vig math (do this per bookmaker, then average):**
For a game with outcomes `i`, raw implied prob `qᵢ = 1/decimalOddsᵢ`. The book's overround is `Σqᵢ > 1`. The de-vigged (fair) probability for outcome `i` from that book is:

```
pᵢ = qᵢ / Σⱼ qⱼ            # normalize so probabilities sum to 1
```

Average each outcome's `pᵢ` across all bookmakers to get the **consensus true probability** `p`. For football, sum over all **three** outcomes (Home/Draw/Away). Skipping this step is the single most common way to overstate edge.

**Edge & EV (this is the decision rule):**
Let `p` = de-vigged consensus probability, `P` = the **executable** Polymarket ask price (top of book you can actually fill at, in dollars, 0–1), `f` = round-trip fees/costs as a fraction.

```
edge = p − P
EV per $1 staked ≈ (p / P) − 1 − f      # buy YES at P, pays $1 if it resolves true
```

Note: Polymarket charges a taker fee on sports markets (feeRate 0.05, charged by the protocol at match time as fee = shares x feeRate x p x (1 - p)); fold this into f, and verify the current schedule at <https://docs.polymarket.com/trading/fees> before trading.

- **`edge > 0` and `EV > 0` → tradeable.** PM is pricing the favorite cheaper than its fair probability.
- **`edge ≤ 0` (PM price ≥ true probability) → NEGATIVE expected value → DO NOT STAKE.** A negative or zero edge means you are paying *at or above* fair value; over many such bets you lose money on average. "Better payouts than a bookmaker" does **not** rescue a negative-EV price — skip it. (This corrects the old, incorrect guidance that near-zero/negative edge was "still fine".)
- Always use the **ask you can fill at**, not the midpoint. After accounting for slippage and fees, a small positive midpoint "edge" frequently turns negative.

**Per-pick checklist:**
1. De-vigged consensus probability `p` ≥ 70% (recomputed, not raw).
2. PM market exists and `token_id` resolved (not `N/A`).
3. `edge = p − P > 0` **and** `EV > 0` after fees/slippage. Otherwise **skip**.
4. Game has not started (kickoff > now).
5. Liquidity: order-book depth at your price supports your size without major slippage (Step "Position sizing").
6. Football 3-way: probabilities normalized across all three outcomes.

**Validation gate:** Drop any pick that is negative/zero EV, has `token_id = N/A`, has already started, or whose book depth can't support your size.

### Step 3: PRESENT — Show Picks to the User

```
🏀 NBA Picks — <date>

| Game        | Pick           | True Prob (de-vig) | PM Ask | Edge  | EV/$1 | Kickoff   |
|-------------|----------------|--------------------|--------|-------|-------|-----------|
| BOS vs WAS  | Boston Celtics | 85.0%              | 0.83   | +2.0% | +2.4% | 19:00 ET  |
| LAL vs DET  | LA Lakers      | 72.0%              | 0.74   | -2.0% | SKIP  | 21:30 ET  |

Token IDs:
- Boston Celtics: 123456789...   (TRADEABLE)
- LA Lakers: 987654321...        (SKIP — negative EV at this price)
```

Include: sport + date, the de-vigged probability (not raw), executable PM ask, edge, EV, token IDs, and caveats (football 3-way, thin liquidity). Clearly mark negative-EV picks as **SKIP**. **Then ask for explicit per-trade approval before executing anything.**

### Step 4: EXECUTE — Place Trades (user-supplied client, requires keys)

There is **no bundled trade script.** Use your own audited client built on the official CLOB SDK. A minimal, safe TypeScript template (do not paste secrets inline — read them from the environment):

```ts
// trade.ts — USER-SUPPLIED. Build on the official client and audit before use.
// npm i @polymarket/clob-client ethers
import { ClobClient, OrderType, Side } from "@polymarket/clob-client";
import { Wallet } from "ethers";

const host = "https://clob.polymarket.com";
const chainId = 137; // Polygon
const signer = new Wallet(process.env.POLYMARKET_PK!);            // execution key from secret store
const creds = {
  key: process.env.POLYMARKET_API_KEY!,
  secret: process.env.POLYMARKET_API_SECRET!,
  passphrase: process.env.POLYMARKET_API_PASSPHRASE!,
};
const client = new ClobClient(host, chainId, signer, creds);

async function buy(tokenId: string, price: number, sizeUsd: number, dryRun = true) {
  // Guardrail: confirm executable ask & depth before sending.
  const book = await client.getOrderBook(tokenId);
  const bestAsk = book.asks?.length ? Number(book.asks[0].price) : NaN;
  if (!(price >= bestAsk)) throw new Error(`Limit ${price} below best ask ${bestAsk}; would not fill`);
  console.log(`worst-case loss if it resolves NO: $${sizeUsd.toFixed(2)} (full stake)`);
  if (dryRun) { console.log("DRY RUN — not sending", { tokenId, price, sizeUsd }); return; }

  const order = await client.createOrder({
    tokenID: tokenId,
    price,                       // limit price you are willing to pay (0–1)
    side: Side.BUY,
    size: sizeUsd / price,       // number of shares
    feeRateBps: 0,
  });
  return client.postOrder(order, OrderType.GTC);
}

// Default to dryRun=true. Flip to false ONLY after explicit user confirmation.
```

**Validation gate:** Always run dry-run first, show the user the exact command, the executable ask, the size in shares, and the **worst-case loss = full stake**. Execute only after explicit confirmation.

**Post-execution:** Show the order response. If rejected, explain why (insufficient balance, price moved, market closed, etc.).

### Step 5: TRACK — Monitor Positions (read-only)

```bash
# Read-only positions via Data API
curl "https://data-api.polymarket.com/positions?user=$POLYMARKET_WALLET"
```

Open orders / balances come from your CLOB client (`client.getOpenOrders()`, balance allowance checks). There is no bundled script for this — it's part of your user-supplied client.

### Step 6: REDEEM — Collect Winnings (user-supplied client, requires keys)

After a market resolves, redeem winning positions via the CTF contract on Polygon (`redeemPositions`). There is **no bundled redeem script.** A correct redeem helper must: enumerate redeemable positions for `$POLYMARKET_WALLET`, handle both standard and `negRisk` markets, call the appropriate adapter/CTF `redeemPositions`, and verify the resulting collateral balance. Build it on the official SDK and current contract addresses from <https://docs.polymarket.com>; verify addresses on-chain before signing.

---

## Error Handling

| Error | Cause | Fix |
|---|---|---|
| `security: SecItemCopyMatching` | Keychain access denied | Unlock Keychain, or set `$ODDS_API_KEY` env var directly |
| `HTTP 401` from Odds API | Invalid/expired key | Verify the key; if using Keychain: `security find-generic-password -s odds-api-key -a "$KEYCHAIN_ACCOUNT" -w` |
| `HTTP 429` from Odds API | Out of monthly credits | Wait; check `x-requests-remaining` header; scan fewer sports |
| Token ID `N/A` | PM lacks this market | Skip — common for smaller football matches |
| `No results` from PM search | Team-name mismatch | Try alternate names / search the PM UI manually |
| Order rejected | Price moved or insufficient collateral | Check balance/allowance, re-check the ask, retry |
| `NONCE_TOO_LOW` | Tx nonce conflict | Wait ~30s, retry |
| Redeem fails | Polygon gas spike | Retry with a higher max fee; confirm contract address |

### The Odds API Quota

The free tier is **500 credits/month** *(as of Jun 2026 — verify current limits and credit costs at <https://the-odds-api.com/#get-access>)*. A simple `h2h`/EU/single-region request costs ~1 credit, but extra regions/markets multiply the cost, so a `--all-sports` scan can consume several credits. To conserve:
- Don't scan repeatedly within an hour.
- Watch the `x-requests-remaining` response header.
- Scan only the sport the user asks about when near the limit.

---

## Examples

### "Scan for bets today"

```
1. Run: node scripts/scan.mjs --all-sports
2. Re-do de-vig + EV math on the shortlist (Step 2); drop negative-EV picks
3. Present the +EV picks table; mark SKIPs
4. Wait for explicit approval before trading
```

### "Bet $100 on the Celtics"

```
1. Search PM for the Celtics game (your query client) and resolve the Celtics outcome token_id
2. Get the executable ask (order book), not just midpoint
3. Pull bookmaker odds, de-vig to a consensus true probability p
4. Compute edge = p − ask and EV; if EV ≤ 0, advise SKIP and explain why
5. If +EV: present "Buy $100 on Celtics at 0.XX (ask), true prob YY%, worst-case loss $100"
6. After explicit approval: run your audited trade client (dry-run first)
```

### "Check my positions"

```
1. curl "https://data-api.polymarket.com/positions?user=$POLYMARKET_WALLET"
2. Show open positions with current value
3. If any are redeemable, use your audited redeem helper (Step 6)
```

### "What are the odds on Real Madrid?"

```
1. Scan La Liga: node scripts/scan.mjs --sport=soccer_spain_la_liga
2. Find Real Madrid; de-vig across Home/Draw/Away
3. Only call it a "pick" if de-vigged prob ≥ 70% AND PM ask gives +EV
4. Otherwise show the odds and state it's below threshold or negative-EV
```

---

## Key Concepts

- **Raw implied probability:** `1 / decimal_odds`. Includes vig — **overstates** the true chance. Never threshold on this directly.
- **De-vigged (fair) probability:** raw probs normalized to sum to 1 per bookmaker, then averaged across books. This is the benchmark `p`.
- **Executable price (ask):** the top-of-book price you can actually fill at on PM — use this, not the midpoint, for edge.
- **Edge:** `p − ask`. **Positive** = PM cheaper than fair value (necessary condition).
- **Expected value (EV):** `(p / ask) − 1 − fees`. **The decision rule.** Positive edge with positive EV after fees/slippage = tradeable; **zero or negative edge = negative EV = do not stake.** Win rate is not EV.
- **Position sizing:** bet size is bounded by your pre-set bankroll/loss limit, by order-book depth at your price (to limit slippage), and by any market/platform limits — not by how confident you feel. A common discipline is fractional-Kelly capped to a small % of bankroll; never bet the bankroll on one market.
- **Liquidity / slippage:** thin books move against you as you fill. Check depth before sizing; large orders walk the book and erode edge.
- **This is not arbitrage:** PM generally tracks fair value closely. Genuine +EV after de-vig and fees is rare and small — and every position can still lose. Stake only within your responsible-gambling limits and only where it is legal for you.
