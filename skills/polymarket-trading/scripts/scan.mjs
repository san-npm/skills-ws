#!/usr/bin/env node
import os from 'os';
/**
 * Polymarket Sports Betting Scanner
 *
 * Fetches bookmaker odds from The Odds API, filters to high-probability favorites,
 * matches them to Polymarket markets, and outputs actionable picks.
 *
 * Usage:
 *   node scripts/scan.mjs --sport=basketball_nba
 *   node scripts/scan.mjs --all-sports
 *   node scripts/scan.mjs --all-sports --min-prob=0.75
 */

import { execSync } from 'child_process';

// ── Config ──────────────────────────────────────────────────────────────────

const ODDS_API = 'https://api.the-odds-api.com/v4/sports';
const GAMMA    = 'https://gamma-api.polymarket.com';
const CLOB     = 'https://clob.polymarket.com';

const SPORTS = [
  'basketball_nba',
  'soccer_epl',
  'soccer_spain_la_liga',
  'soccer_italy_serie_a',
  'soccer_germany_bundesliga',
  'soccer_france_ligue_one',
  'soccer_efl_champ',
];

// Map Odds API sport keys to PM search tags / keywords
const SPORT_META = {
  basketball_nba:           { pmTag: 'nba', label: 'NBA', type: 'basketball' },
  soccer_epl:               { pmTag: 'epl', label: 'EPL', type: 'soccer' },
  soccer_spain_la_liga:     { pmTag: 'la-liga', label: 'La Liga', type: 'soccer' },
  soccer_italy_serie_a:     { pmTag: 'serie-a', label: 'Serie A', type: 'soccer' },
  soccer_germany_bundesliga:{ pmTag: 'bundesliga', label: 'Bundesliga', type: 'soccer' },
  soccer_france_ligue_one:  { pmTag: 'ligue-1', label: 'Ligue 1', type: 'soccer' },
  soccer_efl_champ:         { pmTag: 'efl-championship', label: 'EFL Champ', type: 'soccer' },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

function getOddsApiKey() {
  // Preferred: explicit env var (portable for Linux/CI/containers)
  if (process.env.ODDS_API_KEY && process.env.ODDS_API_KEY.trim()) {
    return process.env.ODDS_API_KEY.trim();
  }

  // Fallback: macOS Keychain for local developer setup
  if (process.platform === 'darwin') {
    try {
      return execSync(`security find-generic-password -s odds-api-key -a ${os.userInfo().username} -w`, {
        encoding: 'utf8',
      }).trim();
    } catch {}
  }

  throw new Error('Missing ODDS_API_KEY. Set environment variable ODDS_API_KEY (or use macOS keychain fallback).');
}

async function fetchJSON(url, { timeoutMs = 12000, retries = 2 } = {}) {
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} from ${url}: ${body.slice(0, 200)}`);
      }
      return await res.json();
    } catch (e) {
      lastErr = e;
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastErr;
}

function parseArgs() {
  const opts = { sports: [], minProb: 0.70, allSports: false };
  for (const a of process.argv.slice(2)) {
    if (a === '--all-sports') opts.allSports = true;
    else if (a.startsWith('--sport=')) opts.sports.push(a.split('=')[1]);
    else if (a.startsWith('--min-prob=')) opts.minProb = parseFloat(a.split('=')[1]);
    else if (a === '--help' || a === '-h') {
      console.log(`Usage: scan.mjs [--sport=basketball_nba] [--all-sports] [--min-prob=0.70]`);
      process.exit(0);
    }
  }
  if (opts.allSports) opts.sports = [...SPORTS];
  if (opts.sports.length === 0) opts.sports = [...SPORTS]; // default to all
  return opts;
}

// ── Odds API ────────────────────────────────────────────────────────────────

async function fetchOdds(sport, apiKey) {
  // Filter to games starting from now until end of tomorrow (48h window)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 2);
  tomorrow.setHours(23, 59, 59, 999);

  const params = new URLSearchParams({
    apiKey,
    regions: 'eu',
    markets: 'h2h',
    oddsFormat: 'decimal',
    commenceTimeFrom: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    commenceTimeTo: tomorrow.toISOString().replace(/\.\d{3}Z$/, 'Z'),
  });

  const url = `${ODDS_API}/${sport}/odds?${params}`;
  try {
    return await fetchJSON(url);
  } catch (e) {
    if (e.message.includes('429')) {
      console.error(`⚠️  Rate limited on Odds API. Check your quota.`);
      return [];
    }
    if (e.message.includes('404')) {
      // Sport may have no upcoming events
      return [];
    }
    throw e;
  }
}

/**
 * Calculate implied probability for each outcome by averaging 1/odds across bookmakers.
 * Returns array of { team, impliedProb } sorted by probability descending.
 */
function calcImpliedProbabilities(game) {
  const bookmakers = game.bookmakers || [];
  if (bookmakers.length === 0) return [];

  // Collect all h2h odds per outcome
  const oddsMap = {}; // team -> [decimal_odds, ...]
  for (const bm of bookmakers) {
    const h2h = bm.markets?.find(m => m.key === 'h2h');
    if (!h2h) continue;
    for (const outcome of h2h.outcomes) {
      if (!oddsMap[outcome.name]) oddsMap[outcome.name] = [];
      oddsMap[outcome.name].push(outcome.price);
    }
  }

  // Average implied probability per team
  const results = [];
  for (const [team, oddsList] of Object.entries(oddsMap)) {
    const avgProb = oddsList.reduce((sum, o) => sum + 1 / o, 0) / oddsList.length;
    results.push({ team, impliedProb: avgProb, numBooks: oddsList.length });
  }

  return results.sort((a, b) => b.impliedProb - a.impliedProb);
}

// ── Polymarket Matching ─────────────────────────────────────────────────────

/**
 * Normalize a team name for fuzzy matching.
 */
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/\bfc\b/g, '')
    .replace(/\bsc\b/g, '')
    .replace(/\bac\b/g, '')
    .replace(/\brc\b/g, '')
    .replace(/\bssc\b/g, '')
    .replace(/\bas\b/g, '')
    .replace(/\bcf\b/g, '')
    .replace(/\bud\b/g, '')
    .replace(/\brcd\b/g, '')
    .replace(/\breal\b/g, 'real')
    .replace(/\bunited\b/g, 'utd')
    .replace(/\bcity\b/g, 'city')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if two team names are a fuzzy match.
 */
function fuzzyMatch(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  // Exact
  if (na === nb) return true;
  // One contains the other
  if (na.includes(nb) || nb.includes(na)) return true;
  // Last word match (e.g. "Lens" in "Racing Club de Lens")
  const wordsA = na.split(' ');
  const wordsB = nb.split(' ');
  const lastA = wordsA[wordsA.length - 1];
  const lastB = wordsB[wordsB.length - 1];
  if (lastA.length >= 3 && lastA === lastB) return true;
  // Check if any significant word (4+ chars) matches
  for (const w of wordsA) {
    if (w.length >= 4 && wordsB.includes(w)) return true;
  }
  return false;
}

/**
 * Search Polymarket for a game and try to find a moneyline market.
 * Returns { found, tokenId, pmPrice, marketQuestion, slug } or { found: false }
 */
async function findPMMarket(homeTeam, awayTeam, favoriteTeam, sportMeta) {
  // Extract short team names (last word = mascot) for better PM search
  const shortHome = homeTeam.split(' ').pop();
  const shortAway = awayTeam.split(' ').pop();
  const shortFav = favoriteTeam.split(' ').pop();

  // Try multiple search strategies — short names first (avoid season-long market noise)
  const searches = [
    `${shortAway} ${shortHome}`,
    `${shortHome} ${shortAway}`,
    `${homeTeam} ${awayTeam}`,
    shortFav,
  ];

  for (const query of searches) {
    try {
      const params = new URLSearchParams({ q: query, limit_per_type: '10' });
      const data = await fetchJSON(`${GAMMA}/public-search?${params}`);
      const events = data.events || [];

      for (const ev of events) {
        // Check if event title contains both teams or the favorite
        const title = (ev.title || '').toLowerCase();
        const hasHome = fuzzyMatch(ev.title || '', homeTeam);
        const hasAway = fuzzyMatch(ev.title || '', awayTeam);
        const hasFav = fuzzyMatch(ev.title || '', favoriteTeam);

        if (!hasFav && !(hasHome && hasAway)) continue;

        // Look through markets for a moneyline / winner market
        const markets = (ev.markets || []).filter(m => !m.closed);
        for (const m of markets) {
          const q = (m.question || '').toLowerCase();
          // Skip spread, total, player props, 1st half
          if (/spread|total|over|under|points|1st half|first half|player|assists|rebounds|goals scored/i.test(q)) continue;

          // Check if this is a "Will X win?" or "X vs Y" moneyline
          if (fuzzyMatch(m.question || '', favoriteTeam) || q.includes('win') || q.includes('winner')) {
            // Parse outcomes and find the favorite
            const outcomes = typeof m.outcomes === 'string' ? JSON.parse(m.outcomes) : (m.outcomes || []);
            const prices = m.outcomePrices ? (typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices) : [];
            const clobIds = m.clobTokenIds ? (typeof m.clobTokenIds === 'string' ? JSON.parse(m.clobTokenIds) : m.clobTokenIds) : [];

            // Find the outcome matching the favorite
            for (let i = 0; i < outcomes.length; i++) {
              const outcomeName = outcomes[i];
              if (fuzzyMatch(outcomeName, favoriteTeam) || outcomeName.toLowerCase() === 'yes') {
                const tokenId = clobIds[i] || null;
                const price = prices[i] ? parseFloat(prices[i]) : null;

                if (tokenId && price) {
                  return {
                    found: true,
                    tokenId,
                    pmPrice: price,
                    marketQuestion: m.question,
                    slug: m.slug || ev.slug,
                    outcomeName,
                  };
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // Search failed, try next strategy
      continue;
    }

    // Small delay between searches to be nice to the API
    await new Promise(r => setTimeout(r, 300));
  }

  return { found: false };
}

/**
 * Get the live midpoint price from CLOB for a token.
 */
async function getLivePrice(tokenId) {
  try {
    const data = await fetchJSON(`${CLOB}/midpoint?token_id=${tokenId}`);
    return parseFloat(data.mid);
  } catch {
    return null;
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs();

  // 1. Get API key
  let apiKey;
  try {
    apiKey = getOddsApiKey();
  } catch (e) {
    console.error('❌ Failed to get Odds API key.');
    console.error('   Set ODDS_API_KEY env var (or use macOS keychain fallback).');
    process.exit(1);
  }

  console.log(`\n🔍 Scanning ${opts.sports.length} sport(s) | Min probability: ${(opts.minProb * 100).toFixed(0)}%\n`);

  const picks = [];

  for (const sport of opts.sports) {
    const meta = SPORT_META[sport];
    if (!meta) {
      console.error(`⚠️  Unknown sport: ${sport}`);
      continue;
    }

    process.stdout.write(`  📡 ${meta.label}... `);

    // 2. Fetch odds
    let games;
    try {
      games = await fetchOdds(sport, apiKey);
    } catch (e) {
      console.log(`❌ ${e.message}`);
      continue;
    }

    if (!games || games.length === 0) {
      console.log('no upcoming games');
      continue;
    }

    console.log(`${games.length} game(s)`);

    // 3. Calculate implied probabilities and filter
    for (const game of games) {
      const probs = calcImpliedProbabilities(game);
      if (probs.length === 0) continue;

      const favorite = probs[0];
      if (favorite.impliedProb < opts.minProb) continue;

      // This is a qualifying favorite
      const homeTeam = game.home_team;
      const awayTeam = game.away_team;
      const kickoff = new Date(game.commence_time);

      // Skip games that have already started
      if (kickoff < new Date()) continue;

      // 4. Search Polymarket
      process.stdout.write(`    🔎 ${favorite.team} (${(favorite.impliedProb * 100).toFixed(1)}%)... `);

      const pm = await findPMMarket(homeTeam, awayTeam, favorite.team, meta);

      if (!pm.found) {
        console.log('not on PM');
        picks.push({
          sport: meta.label,
          game: `${homeTeam} vs ${awayTeam}`,
          favorite: favorite.team,
          bookProb: favorite.impliedProb,
          numBooks: favorite.numBooks,
          pmPrice: null,
          edge: null,
          tokenId: null,
          kickoff,
          isSoccer: meta.type === 'soccer',
        });
        continue;
      }

      // 5. Get live CLOB price (more accurate than Gamma cache)
      const livePrice = await getLivePrice(pm.tokenId);
      const pmPrice = livePrice || pm.pmPrice;

      const edge = favorite.impliedProb - pmPrice;

      console.log(`✅ PM: ${(pmPrice * 100).toFixed(1)}¢ | Edge: ${edge >= 0 ? '+' : ''}${(edge * 100).toFixed(1)}%`);

      picks.push({
        sport: meta.label,
        game: `${homeTeam} vs ${awayTeam}`,
        favorite: favorite.team,
        bookProb: favorite.impliedProb,
        numBooks: favorite.numBooks,
        pmPrice,
        edge,
        tokenId: pm.tokenId,
        kickoff,
        marketQuestion: pm.marketQuestion,
        isSoccer: meta.type === 'soccer',
      });

      // Rate limit protection
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // ── Output ──────────────────────────────────────────────────────────────

  console.log('\n' + '═'.repeat(120));

  const matched = picks.filter(p => p.tokenId);
  const unmatched = picks.filter(p => !p.tokenId);

  if (matched.length === 0 && unmatched.length === 0) {
    console.log('\n😐 No favorites above threshold found across all sports.');
    console.log('   The best trade is sometimes no trade.\n');
    process.exit(0);
  }

  if (matched.length > 0) {
    console.log(`\n✅ ACTIONABLE PICKS (${matched.length})\n`);
    console.log(
      padR('Game', 40) +
      padR('Pick', 24) +
      padR('Books', 10) +
      padR('PM', 8) +
      padR('Edge', 8) +
      padR('Kickoff', 18) +
      'Token ID'
    );
    console.log('─'.repeat(120));

    for (const p of matched) {
      const kickStr = p.kickoff.toLocaleString('en-GB', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        timeZone: 'Europe/Luxembourg',
      });
      const soccer3way = p.isSoccer ? ' ⚽' : '';
      console.log(
        padR(p.game, 40) +
        padR(p.favorite + soccer3way, 24) +
        padR(`${(p.bookProb * 100).toFixed(1)}%`, 10) +
        padR(`${(p.pmPrice * 100).toFixed(1)}¢`, 8) +
        padR(`${p.edge >= 0 ? '+' : ''}${(p.edge * 100).toFixed(1)}%`, 8) +
        padR(kickStr, 18) +
        p.tokenId
      );
    }

    if (matched.some(p => p.isSoccer)) {
      console.log('\n⚽ = Football 3-way market (win/draw/lose) — PM splits probability differently than bookmakers');
    }

    console.log('\n📋 To execute a trade:');
    console.log('   node ~/.agents/skills/polymarket/trade.mjs buy <token_id> <price> <size>\n');
  }

  if (unmatched.length > 0) {
    console.log(`\n⚠️  NOT ON POLYMARKET (${unmatched.length})\n`);
    for (const p of unmatched) {
      const kickStr = p.kickoff.toLocaleString('en-GB', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
        timeZone: 'Europe/Luxembourg',
      });
      console.log(`   ${padR(p.game, 40)} ${padR(p.favorite, 20)} ${(p.bookProb * 100).toFixed(1)}%  ${kickStr}`);
    }
    console.log('');
  }
}

function padR(str, len) {
  if (str.length >= len) return str.slice(0, len - 1) + ' ';
  return str + ' '.repeat(len - str.length);
}

main().catch(e => {
  console.error(`\n❌ Fatal: ${e.message}`);
  process.exit(1);
});
