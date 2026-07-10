---
name: competitor-intelligence
description: "Competitive intelligence end to end: competitor discovery, feature/pricing matrices, positioning maps, win/loss analysis, sales battlecards, monitoring automation, and a legal/ethical sourcing register. Use when building competitor analysis, battlecards, a CI program, or tracking rivals' pricing, features, and positioning."
---

# Competitor Intelligence

## Workflow

### 1. Competitor Identification

**Three tiers:**

| Tier | Definition | Track |
|------|-----------|-------|
| Direct | Same product, same market | Deep: pricing, features, messaging, every move |
| Adjacent | Different product, same buyer | Monitor: major launches, positioning changes |
| Aspirational | Where you want to be in 2-3 years | Quarterly: strategy, positioning, market moves |

**Discovery methods (classic):**
- Search your top 5 keywords — who ranks?
- Ask churned customers who they switched to
- Check G2 / Capterra / TrustRadius / PeerSpot category pages
- Monitor "alternatives to [your product]" and "[product] vs" searches
- Track who bids on your brand keywords (use Google Ads' public **Ad Transparency Center** and Meta's **Ad Library** — both legal, no scraping required; do NOT click rivals' paid ads to inflate their costs, that is click fraud)

**Discovery methods (2026 surfaces — do not skip these):**
- **AI answer engines / LLM visibility.** Ask ChatGPT, Claude, Gemini, Perplexity, and Google AI Overviews: "best [category] tools", "alternatives to X", "X vs Y". Record which competitors get named, what claims the model repeats, and which sources it cites. By 2026 a large and growing share of buyer research starts in an answer engine, so being absent or mischaracterized there is a real competitive gap. Re-check monthly; models and their cited sources drift.
- **App / cloud marketplaces.** AWS / Azure / GCP marketplaces, Salesforce AppExchange, Atlassian Marketplace, Shopify App Store, HubSpot Marketplace, Slack/Notion/Figma app directories. Listings reveal positioning, pricing tiers, install counts, and review sentiment.
- **Browser-extension stores** (Chrome Web Store, Firefox Add-ons, Edge Add-ons) when relevant to your category — user counts and reviews are public signal.
- **Community & social listening.** Reddit, Hacker News, Stack Overflow, niche Slack/Discord/Circle communities, LinkedIn, X/Bluesky, YouTube reviews. Search "[competitor] sucks / migration / switched from / pricing" to surface unfiltered sentiment. Use the platforms' own search/APIs; respect rate limits and ToS.
- **Public filings & funding** — Crunchbase, PitchBook, SEC EDGAR (for public co's), state business registries.

### 2. Legal & ethical CI rules (read before collecting anything)

CI is gathering **public** information ethically. Crossing into deception or theft is a legal and reputational liability — and it poisons your data. Bake these rules into every collection task.

**Hard "never" list:**
- **No pretexting / misrepresentation.** Never pose as a customer, journalist, investor, or job applicant to extract info. Don't lie about your employer when signing up for a trial or talking to their staff. (Pretexting violates many laws, e.g. US GLBA, and most ethics codes.)
- **No confidential or trade-secret info.** Don't solicit it, accept it, or use it — especially from a competitor's current/former employees who are under NDA. Receiving misappropriated trade secrets can create liability under the **US Defend Trade Secrets Act** and equivalents. If a new hire offers their old employer's confidential docs, decline and document the refusal.
- **No credential sharing or unauthorized access.** Don't share paid-tool logins to view gated competitor data, don't use someone else's account, don't bypass auth/paywalls. Unauthorized access can implicate the **US CFAA** / equivalent computer-misuse laws.
- **No bid-clicking fraud, no fake reviews, no astroturfing** for or against a competitor.

**Scraping & platform policy:**
- Prefer **official APIs and public exports** (review-site APIs, Ad Library, marketplace listings) over scraping.
- If scraping public pages, respect **robots.txt**, the site's **Terms of Service**, and rate limits; collect only what a normal browser would see; never circumvent login or anti-bot controls. Scraping legality is unsettled and jurisdiction-specific — for any large-scale or commercial scraping, get legal sign-off.
- **Privacy.** Don't collect personal data on competitor employees beyond public business context (name, title, public posts). GDPR/CCPA-type rules apply to personal data even when scraped from public sites. Never store special-category personal data.

**Sourcing discipline:**
- **Label estimates vs. facts.** "~120 employees (LinkedIn headcount, Jun 2026)" not "120 employees". Tag every datum with a confidence level (see source register below).
- **Route outbound claims through legal/marketing review.** Anything that leaves the building — battlecards used verbatim with prospects, comparison pages, ads — must be fact-checked and (for comparative claims) reviewed. See the battlecard proof standards in §7.
- **No coordination with competitors.** Never use CI work as a channel to discuss pricing, market allocation, or hiring with a competitor — that is antitrust-sensitive. CI observes the market; it does not coordinate it.

> This is operational guidance, not legal advice. Competition, IP, scraping, and privacy law vary by jurisdiction — have counsel review your CI program and any comparative marketing.

### 3. Source register (the backbone of a real CI program)

Every claim that informs a matrix, battlecard, or strategy decision gets a row here. This is what separates a defensible CI program from rumor, and it powers change-detection (§8) and quarterly refresh.

| Field | Example |
|-------|---------|
| Claim / datum | "Competitor A gates SSO to Enterprise" |
| Competitor | Competitor A |
| URL / location | https://competitora.com/pricing (or "G2 review #4821", "AppExchange listing") |
| Evidence type | `pricing-page` / `docs` / `review` / `changelog` / `analyst` / `sales-call` / `estimate` |
| Value captured | Screenshot + archived URL (web.archive.org or local snapshot) |
| Date observed | 2026-06-07 |
| Confidence | `confirmed` (primary source) / `likely` (secondary) / `estimate` / `stale` |
| Owner | `<owner-handle>` (e.g. the PMM who owns this competitor) |
| Next review | 2026-09-07 |

**Rules:** primary sources beat secondary; always **archive** the page (vendors edit silently); downgrade confidence to `stale` automatically after the review date; one source register per competitor, version-controlled or in your CI tool.

### 4. Feature Comparison Matrix

| Feature | You | Competitor A | Competitor B | Competitor C |
|---------|-----|-------------|-------------|-------------|
| Core feature 1 | Full | Full | Partial | None |
| Core feature 2 | Full | None | Full | Full |
| Integration X | Full | Partial | None | Full |
| API access | All plans | Enterprise only | Pro+ | None |
| SSO/SAML | Pro+ | Enterprise only | All plans | Enterprise only |
| Support SLA | 4h (Pro) | 24h | 8h | 12h |
| Pricing (entry) | $49/mo | $79/mo | $39/mo | $99/mo |
| Free tier | Yes | No | Yes (limited) | No |

**Normalize before you compare — "has it" is a trap.** Score each cell on a consistent rubric, not a binary:

| Symbol | Meaning |
|--------|---------|
| Full | Native, GA, no major caveats |
| Partial | Exists but limited (beta, low limits, one integration only, clunky) |
| Add-on | Available but costs extra / separate SKU |
| Plan-gated | Only on a higher tier (note which: `Ent-only`) |
| Roadmap | Announced/beta, not GA — mark, don't count as present |
| Region | Geo-restricted (e.g. EU data residency US-only) |
| None | Genuinely absent |

**What to normalize (the dimensions juniors miss):**
- **Depth, not presence.** "Has reporting" is meaningless — compare scheduled reports, custom metrics, export formats, API access to the data.
- **Plan packaging.** Record the *tier and price* each feature unlocks at, plus seat minimums, usage caps, and overage pricing — not just the entry price. The real comparison is "feature at the plan a buyer like ours would actually buy."
- **Regional availability.** Data residency, language/locale support, local payment methods, compliance certs (SOC 2, ISO 27001, HIPAA, FedRAMP) — these win/lose enterprise and EU deals.
- **Enterprise-only exceptions.** Many "gaps" vanish (or appear) only at Enterprise. Note SSO/SCIM, audit logs, custom contracts, on-prem/VPC, dedicated support, SLAs — these are usually quote-only; tag as `estimate` if unconfirmed.
- **Selection bias.** Choose features your ICP actually evaluates, not your longest feature list. A matrix that exists to flatter you misleads your own sales team.

**Rules:**
- Be accurate. Don't mark competitors as "None" when they have partial support: your reps get burned on the call, and false comparative claims create legal risk (§7).
- Update quarterly minimum — features change fast. Tie each cell to a source-register row (§3) so refresh is mechanical.
- Source every claim (link to their docs/pricing page) and archive it.

### 5. Positioning & strategy (beyond the 2x2)

**2x2 matrix — choose two axes that matter to your buyers:**

Common axis pairs:
- Ease of use ↔ Feature depth
- SMB focus ↔ Enterprise focus
- Price ↔ Capability
- Self-serve ↔ High-touch
- Horizontal ↔ Vertical/specialized

**How to place competitors:**
1. Score each competitor 1-10 on both axes
2. Use customer reviews, demos, and published materials (not assumptions)
3. Identify the white space — where are there no competitors?
4. Position yourself in or near the white space (if it has demand — empty quadrants are often empty for a reason)

The 2x2 is a thinking tool, not the deliverable. Turn the analysis into these strategic outputs:

**a) Category narrative.** How does each competitor frame the *category* and the buyer's problem (not just their product)? Track the words they own ("data cloud", "all-in-one", "developer-first"). Decide whether you compete inside their category, reframe it, or create a new one — and what proof you need to make a reframe credible.

**b) ICP segmentation.** Map which segments each competitor actually wins (by size, vertical, region, technical maturity, buying motion). Competitors are rarely strong everywhere. Output: a per-segment "who wins here and why" table that routes your GTM toward segments where you have a structural edge.

**c) Pricing & packaging strategy.** From the matrix's plan/price data, reconstruct each rival's packaging logic: what's the wedge (free/low entry vs. land-and-expand), what's gated to force upgrades, what's the value metric (seats, usage, events). Decide your packaging response — match, undercut, bundle, or unbundle — and where to draw tier lines.

**d) Threat prioritization.** Score competitors on a simple grid: **Threat = (overlap with our ICP) x (momentum)**. Momentum signals: funding, hiring velocity (§8), share-of-voice in answer engines (§1), review volume trend, win-rate movement (§6). Focus deep monitoring on the top-right; demote the rest to quarterly.

**e) Response plan & gap triage.** For each material threat, pick a response: *product* (close a real gap — feed into roadmap triage), *positioning* (reframe so the gap doesn't matter), *enablement* (arm sales with a battlecard, §7), or *ignore* (document why). Triage product gaps by `reach x deal-impact x effort`; don't let CI become a reactive feature-copy machine.

### 6. Win/Loss Analysis

**Interview framework (20-min call with recent wins AND losses):**

| Question | Purpose |
|----------|---------|
| What triggered the search for a solution? | Understand buying trigger |
| What alternatives did you evaluate? | Competitive set |
| What were your top 3 criteria? | Decision factors |
| Why did you choose [winner] / not choose us? | Win/loss reason |
| What almost changed your mind? | Close call factors |
| How was the buying experience? | Process feedback |

**Aggregate analysis (quarterly, minimum 20 interviews):**
- Win rate by competitor: Who do we beat most? Lose to most?
- Top 3 win reasons: What keeps winning deals for us?
- Top 3 loss reasons: What keeps losing them?
- Feature gaps cited: What do prospects wish we had?
- Pricing feedback: Are we perceived as expensive, fair, cheap?

### 7. Sales Battlecards

**Proof standards & legal guardrails (apply before any battlecard ships):**
- **Every comparative claim needs a source-register row and a defensible proof type:** their own published docs/pricing, a dated screenshot, a third-party benchmark, or a verbatim public review. No "everyone knows" claims. False or unsubstantiated comparative advertising is actionable (e.g. US **Lanham Act §43(a)**, EU comparative-advertising rules, and self-regulatory bodies like NAD).
- **Truthful, not disparaging.** State factual differences ("they gate SSO to Enterprise — sourced") rather than opinion or insult ("their security is a joke"). Avoid claims you can't prove today; competitors fix gaps — re-verify before each enablement cycle.
- **Use review quotes correctly.** Quote verbatim, attribute (source + date), don't edit to change meaning, and respect the review platform's ToS on reuse. Don't pass selected quotes off as representative if they aren't.
- **Approved language.** Maintain a list of *approved* phrasings (legal/marketing-reviewed) and *prohibited* ones. Reps use the approved wording verbatim in writing.
- **Deal-stage usage.** Battlecards are *internal* enablement, not customer handouts. Use Landmines/objection-handling in **discovery → evaluation**; never send the raw card to a prospect. Comparative content that goes external (web "vs" pages, ads) takes the full legal-review path.
- **Examples — acceptable vs. risky:**

| Risky (don't) | Acceptable (do) |
|---------------|-----------------|
| "Competitor A is insecure." | "Competitor A's SSO/SCIM is Enterprise-tier only (their pricing page, Jun 2026); we include it on Pro+." |
| "Everyone hates their support." | "Their median G2 support rating is 3.8 vs our 4.6 (G2, Jun 2026, n cited)." |
| "They're going out of business." | "No new funding since [round/date] per Crunchbase — flag as `estimate`, do not assert to prospects." |

**Enablement review cadence:** refresh every battlecard at least quarterly (sooner on a competitor's launch/pricing change detected in §8); each refresh is fact-checked against the source register (§3) and, for comparative claims, re-cleared by legal/marketing before release.

**Template (one per competitor):**

```markdown
# Battlecard: [Competitor Name]

## Quick Facts
- Founded: [year] | HQ: [city] | Employees: ~[X] | Funding: $[X]M
- Pricing: [starting price] - [enterprise price]
- Target: [who they sell to]

## They Say (their positioning)
"[Their tagline/main claim]"

## We Say (our counter-positioning)
"[How we differentiate — one sentence]"

## When We Win
- [Scenario 1: specific situation where we're stronger]
- [Scenario 2]
- [Scenario 3]

## When We Lose
- [Scenario 1: specific situation where they're stronger]
- [Scenario 2]

## Landmines (questions to ask prospects to highlight our strengths)
- "How do they handle [area where competitor is weak]?"
- "What happens when you need [feature they lack]?"
- "Have you looked into their [known pain point — pricing, support, etc.]?"

## Objection Handling
| Their claim | Our response |
|-------------|-------------|
| "[Competitor claim 1]" | "[Factual counter with proof]" |
| "[Competitor claim 2]" | "[Factual counter with proof]" |

## Proof Points
- [Customer who switched from them to us + result]
- [Head-to-head benchmark or comparison data]
- [Review quote from G2/Capterra]
```

### 8. Monitoring & change detection

**What to track, how often, and what to automate** — automation turns CI from a quarterly scramble into a stream that feeds the source register (§3):

| Source | Frequency | Track | Automation (mid-2026; tools change — verify current options) |
|--------|-----------|-------|--------------|
| Pricing & key product pages | Weekly | Price/packaging/tier changes, new feature claims | **Page-diff monitors** (Visualping, Distill.io, Hexowatch, changedetection.io) → alert + auto-archive snapshot to source register |
| Changelog / release notes / status page | Weekly | Shipped features, GA vs beta, incidents | **RSS/Atom + Slack** (most have a feed; else point a diff monitor at the page) |
| Review sites (G2/Capterra/TrustRadius/PeerSpot) | Monthly | Sentiment trend, recurring complaints, rating delta | Platform API/export where available; track rating + volume over time, tag themes |
| App/cloud marketplaces & extension stores | Monthly | New listings, install counts, review sentiment, pricing SKUs | Watch listing URLs with a diff monitor |
| **AI answer engines** (ChatGPT, Claude, Gemini, Perplexity, AI Overviews) | Monthly | Are you named? How are you/competitors described? Which sources cited? | Scripted prompt set run on a schedule; log named brands, claims, and citations (LLM-visibility tracking) |
| Job postings | Monthly | Strategic direction (roles = bets) | Watch their careers page/LinkedIn jobs; tag reqs into a taxonomy (below) |
| Social & community | Weekly | Positioning, complaints, migration chatter | Native search/alerts on Reddit, HN, X/Bluesky, LinkedIn, relevant Discords/Slacks; respect ToS & rate limits |
| Press / funding / filings | As it happens | Rounds, partnerships, M&A, exec moves | Google Alerts, Crunchbase/PitchBook alerts, SEC EDGAR full-text for public co's |
| Their product | Quarterly | Hands-on UX, onboarding, real limits | Maintain a (legitimately signed-up, accurately identified) account; document with dated screenshots |

**Job-posting taxonomy** (turns hiring into a strategy signal): bucket each req — `Eng/Platform` (scaling), `Eng/<new area>` (new product line), `Sales/Enterprise` (moving upmarket), `Sales/<region>` (geo expansion), `Partnerships/Channel`, `Compliance/Security` (chasing regulated buyers), `DevRel` (developer motion). A spike in one bucket telegraphs the next move months early.

**Change-detection workflow:**
1. **Detect** — automated diff/feed/alert fires.
2. **Triage** — owner classifies: `noise` / `tactical` / `strategic`. Only tactical+ proceeds.
3. **Verify & log** — confirm against a primary source, archive the page, write/append a source-register row (§3) with confidence.
4. **Assess impact** — does it change a matrix cell, a battlecard, pricing, or a roadmap priority?
5. **Act** — update artifacts; for material moves, trigger response planning (§5e) and battlecard refresh (§7).
6. **Broadcast** — surface in the monthly digest below.

**CRM win/loss tagging** (so monitoring connects to revenue): add a required `primary_competitor` field and a `loss_reason` / `win_reason` picklist to opportunities; sync battlecard usage. This makes win-rate-by-competitor (§6) a live dashboard instead of a quarterly survey, and flags competitors whose win-rate against you is moving.

**Competitive digest (internal, monthly):**
- Top 3 competitive moves this month (with source links)
- Win/loss & win-rate-by-competitor trend (from CRM)
- Feature-matrix and pricing/packaging changes detected
- AI-answer-engine visibility shifts
- Recommended battlecard updates and any response actions opened

**Cadence summary:** website/changelog/social = **weekly**; reviews/jobs/marketplaces/AI-engines = **monthly**; full matrix, positioning, battlecards, and hands-on product review = **quarterly**; press/funding/M&A = **as it happens**. Every cadence writes back to the source register so confidence never silently goes stale.
