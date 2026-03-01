# Prediction Market Trading

> Trade prediction markets with AI agents — paper trading with real order books, zero risk. Install polymarket-paper-trader and start trading in 60 seconds.

## Overview

Prediction markets let you trade on the outcome of real-world events — politics, crypto, sports, AI, culture. Prices reflect the crowd's probability estimate. If you think the crowd is wrong, you trade.

This skill teaches you to:
1. Set up paper trading with real Polymarket order books
2. Research markets and form trading theses
3. Execute trades with proper position sizing
4. Use limit orders for better entries
5. Track performance and manage risk
6. Share results and compete on leaderboards

## Setup

```bash
pip install polymarket-paper-trader
```

For AI agents via MCP (Claude Code, OpenClaw, Cursor):

```json
{
  "mcpServers": {
    "polymarket-paper-trader": {
      "command": "pm-trader-mcp"
    }
  }
}
```

Or via ClawHub:

```bash
npx clawhub install polymarket-paper-trader
```

## First Session Workflow

```bash
pm-trader init --balance 10000          # $10k paper money
pm-trader markets list --sort liquidity # find active markets
pm-trader markets search "bitcoin"      # search by topic
pm-trader buy will-bitcoin-hit-100k yes 500  # buy $500 of YES
pm-trader portfolio                     # check positions
pm-trader stats --card                  # shareable stats card
```

## Trading Philosophy

### Thesis-Driven Trading

Every trade needs a thesis: "I think YES is underpriced at $0.45 because..."

**Good thesis examples:**
- "Bitcoin ETF approval is 90% likely but priced at 75% — buy YES"
- "This election poll is outdated, the real probability is lower — buy NO"
- "Market overreacted to news, price will revert — place limit buy at $0.35"

**Bad trading (avoid):**
- Random trades without reasoning
- Chasing momentum without understanding why
- Going all-in on a single market

### Position Sizing

| Account size | Per-trade max | Max single market | Cash reserve |
|-------------|---------------|-------------------|--------------|
| $10,000 | $500 (5%) | $2,000 (20%) | $3,000 (30%) |
| $5,000 | $250 (5%) | $1,000 (20%) | $1,500 (30%) |

**Rules:**
- Never more than 5% of balance per trade
- Never more than 20% in one market
- Keep 30% cash for new opportunities
- Diversify across 3-8 markets in different categories

### Order Types

| Type | When to use |
|------|-------------|
| FOK (fill-or-kill) | Default. All or nothing at current prices |
| FAK (fill-and-kill) | Large orders. Partial fills OK |
| GTC limit order | Set a target price, wait for it to hit |
| GTD limit order | Same, but expires at a specific time |

**Limit orders are your edge.** The order book has spreads — placing limits inside the spread gets you better prices than market orders.

### When to Exit

| Scenario | Action |
|----------|--------|
| Up 30%+ on a position | Take profit, you can re-enter later |
| Thesis was wrong | Cut the loss immediately |
| Down 30%, thesis still valid | Hold or add small amount |
| Market resolved | Run `resolve` to cash in |
| Max drawdown > 15% | Pause and review strategy |

## Market Analysis

### Finding Opportunities

1. **Sort by liquidity** — high-liquidity markets ($100k+) have tighter spreads
2. **Check the order book** — `get_order_book` shows depth before trading
3. **Compare prices to your estimate** — if your probability estimate differs by 10%+, there's a trade
4. **Watch for news catalysts** — events that change probabilities create opportunities

### Slippage Awareness

Large orders move the market. Always check the order book first:

```bash
pm-trader book will-bitcoin-hit-100k --depth 10
```

If the top 3 levels only have $200 of liquidity but you want to buy $500, you'll get significant slippage. Either:
- Use smaller order sizes
- Use limit orders at your target price
- Split into multiple smaller trades

## MCP Tools Reference

| Tool | Purpose |
|------|---------|
| `init_account` | Create account with starting balance |
| `get_balance` | Cash + portfolio value + P&L |
| `search_markets` | Find markets by keyword |
| `list_markets` | Browse by volume/liquidity |
| `get_market` | Market details and prices |
| `get_order_book` | Live bids and asks |
| `buy` / `sell` | Market orders |
| `place_limit_order` | GTC/GTD limit orders |
| `check_orders` | Execute orders that hit their price |
| `portfolio` | Positions with live P&L |
| `stats` | Win rate, ROI, Sharpe ratio |
| `resolve_all` | Cash in settled markets |
| `stats_card` | Shareable performance card |

## Strategy Patterns

### Momentum

Buy when price crosses above a threshold, take profit at target, stop loss below entry.

```python
# Buy YES when price > 0.55, TP at 0.70, SL at 0.35
if market.yes_price > 0.55:
    engine.buy(market.slug, "yes", 200.0)
```

### Mean Reversion

Buy when price drops significantly below fair value, sell when it reverts.

```python
fair_value = 0.50
if market.yes_price < fair_value - 0.12:
    engine.buy(market.slug, "yes", 200.0)
```

### Limit Grid

Place multiple limit orders at different price levels below current price.

```python
for offset in [0.05, 0.10, 0.15]:
    engine.place_limit_order(slug, "yes", "buy", 100.0, current_price - offset)
```

## Performance Tracking

Run `stats` regularly to monitor:

| Metric | Good | Great | Elite |
|--------|------|-------|-------|
| Win rate | > 50% | > 60% | > 70% |
| ROI | > 5% | > 15% | > 25% |
| Sharpe ratio | > 0.5 | > 1.0 | > 1.5 |
| Max drawdown | < 15% | < 10% | < 5% |

## Sharing Results

```bash
pm-trader stats --tweet    # X/Twitter format
pm-trader stats --card     # Markdown for Discord/Telegram
pm-trader stats --plain    # Plain text
```

Include your best trade thesis when sharing — stories spread better than numbers.
