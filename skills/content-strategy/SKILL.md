---
name: content-strategy
description: "Content program strategy — topic clusters, entity-first briefs, 0-5 scoring rubrics, editorial calendar operating model, gap analysis, repurposing, and AI-era discovery (AI Overviews, ChatGPT Search, Perplexity). Use when planning a content program, writing briefs, prioritizing a backlog, or auditing content for organic + AI search."
---

# Content Strategy

A content *program* discipline: decide what to publish, brief it so it actually ranks and gets cited, schedule it, score it, and prune it. This skill owns clusters, briefs, the calendar operating model, scoring, gap analysis, repurposing, and AI-search discovery for content.

For the technical SEO layer (schema/JSON-LD, Core Web Vitals, hreflang, indexing, robots) see the `seo-geo` sibling skill — do not re-derive it here. For programmatic page generation at scale see `programmatic-seo`. For the writing craft itself see `copywriting`; for CMS/blog plumbing see `blog-engine`; for the analytics wiring referenced below see `search-console` and `google-analytics`.

> **Data hygiene rule (read first).** Never present a keyword volume, difficulty score, or industry statistic as a fixed fact. Volumes differ across Ahrefs / Semrush / Google Keyword Planner, by country, by device, and by month. Every number you record must carry **source + market + retrieval date** (e.g. `1,900/mo · Ahrefs · US · 2026-06`). Pull fresh before any planning session; do not copy numbers from this document — the examples below use the placeholder form on purpose.

---

## Table of Contents

1. [Topic Cluster Architecture](#1-topic-cluster-architecture)
2. [Entity-First Content Briefs](#2-entity-first-content-briefs)
3. [AI-Era Discovery (AI Overviews, ChatGPT Search, Perplexity)](#3-ai-era-discovery)
4. [Content Scoring Rubric (0-5 per dimension)](#4-content-scoring-rubric)
5. [Editorial Calendar Operating Model](#5-editorial-calendar-operating-model)
6. [Content Gap Analysis](#6-content-gap-analysis)
7. [Content Repurposing System](#7-content-repurposing-system)
8. [Content Audit & Maintenance](#8-content-audit--maintenance)
9. [Measurement: organic + AI-search](#9-measurement)

---

## 1. Topic Cluster Architecture

A cluster is one **pillar** (broad, high-intent hub) plus **spokes** (specific, long-tail articles) that all interlink. The pillar earns authority; spokes capture specific queries and pass relevance/links to the pillar.

```
Pillar (hub)            — broad head term, commercial/navigational intent, 2,500-4,000 words,
  │                       links DOWN to every spoke, refreshed quarterly
  ├── Spoke (how-to)    — long-tail, informational, 1,200-2,000 words, links UP to pillar
  ├── Spoke (comparison)— "X vs Y", "best X for Z", mid-funnel
  ├── Spoke (template)  — "X template/checklist", lead-magnet attached
  └── Spoke (case study)— proof + data, bottom-funnel, links to product
```

### Cluster mapping template

Keep one row per page. Volumes are placeholders — fill from your own tool with source/market/date.

```yaml
pillar:
  topic: "Content marketing strategy"
  primary_kw: "content marketing strategy"
  volume: "<vol/mo · Ahrefs · US · YYYY-MM>"
  difficulty: "<KD · same source>"
  intent: commercial-investigation     # informational | commercial | transactional | navigational
  url: /content-marketing-strategy/
  refresh: quarterly

spokes:
  - topic: "Content marketing plan"
    primary_kw: "content marketing plan template"
    secondary_kw: ["content marketing planning process"]
    intent: informational
    url: /content-marketing-plan/
    internal_links_up: ["/content-marketing-strategy/"]
  - topic: "Editorial calendar"
    primary_kw: "editorial calendar template"
    secondary_kw: ["content calendar best practices"]
    intent: informational
    url: /editorial-calendar-guide/
  - topic: "Content distribution"
    primary_kw: "content distribution strategy"
    intent: commercial-investigation
    url: /content-distribution-strategy/
  - topic: "Content metrics"
    primary_kw: "content marketing metrics"
    secondary_kw: ["content marketing roi"]
    intent: informational
    url: /content-marketing-metrics/
```

### Cluster validation — go/no-go checklist

A candidate spoke ships only if it clears all of these:

| Gate | Threshold | How to check |
|---|---|---|
| Topical fit | Same entity/subtopic as pillar, not a tangent | Would a reader of the pillar click it? |
| Demand | Real query demand (any non-zero volume **or** clear PAA/forum demand) | Tool volume + Google "People also ask" + Reddit/forum threads |
| Winnability | KD below your domain's proven ceiling | Compare to KD of terms you already rank top-10 for |
| Intent match | One dominant intent you can satisfy | Inspect the live SERP — what format dominates? |
| Differentiation | A clear "10x" angle (data, tool, depth, POV) vs current top 3 | Read the 3 ranking pages; what's missing? |
| Business value | Maps to a funnel stage and a CTA | Assign TOFU/MOFU/BOFU + the conversion event |

> **Build clusters from live SERPs, not just volume.** Open the SERP for the head term. If Google shows an AI Overview, a "People also ask" block, and 8 forum/Reddit results, the *intent and format* of those results define your brief far more than the raw volume number.

---

## 2. Entity-First Content Briefs

The brief is where ranking and AI-citation are won or lost. Modern ranking and AI answer engines reward content that **covers the entities and questions** a topic implies, states facts plainly, and is verifiably authored. Write briefs around entities and questions, not keyword density.

### Brief template (copy per article)

```markdown
# Brief: <working title>

## 1. Target & intent
- Primary query: <kw>  (vol/source/market/date)
- Secondary queries: <kw>, <kw>
- Search intent: informational | commercial | transactional
- Funnel stage: TOFU | MOFU | BOFU
- Conversion event: <newsletter | demo | download | purchase>

## 2. SERP & AI-answer reality (fill by inspecting the live results)
- Top 3 URLs + their angle/format/word count:
- SERP features present: [ ] AI Overview  [ ] Featured snippet  [ ] PAA  [ ] Video  [ ] Images
- The snippet/AIO currently cites: <which sources, what claim>
- Our 10x angle (why ours deserves the click/citation):

## 3. Entities to cover (the "must-mention" list)
# Pull from: the top 3 ranking pages, Google "People also ask",
# Wikipedia/Wikidata for the head entity, and your own product knowledge.
- Core entity: <e.g. "topic cluster">  — define it in one sentence early
- Related entities: <pillar page, internal linking, semantic SEO, EEAT, ...>
- Named tools/standards/people a credible author would reference:

## 4. Questions to answer verbatim (one H2/H3 each)
# These map to PAA + "how/what/why/when/cost/vs" variants.
- What is <topic>?            → 40-60 word direct answer in first paragraph under the H2
- How do you <do topic>?      → numbered steps
- <topic> vs <alternative>?   → comparison table
- How much / how long ...?    → specific number with a date
- Common mistakes?            → list

## 5. Format requirements
- Word count target: <derived from top-3 average, not arbitrary>
- Must include: [ ] comparison table  [ ] checklist  [ ] original data/screenshot
  [ ] FAQ block  [ ] 1 expert quote  [ ] author byline w/ credentials
- Internal links: UP to pillar <url>; ACROSS to <related spokes>
- Schema: see `seo-geo` (Article + FAQPage + Breadcrumb as applicable)

## 6. E-E-A-T signals (required, not optional — see §3 and §4)
- Author: <real person, bio, credentials, link to about page>
- First-hand experience shown how: <screenshots, original test, dataset, "we ran...">
- Sources cited (primary, dated): <links>
- Last-reviewed date + reviewer:
```

### How to build the entity/question list fast

1. **Scrape PAA + "related searches"** for the primary query — these *are* the questions to answer.
2. **Read the top 3 ranking pages** and list every subtopic/entity they cover; your brief must cover the union, plus your differentiator.
3. **Check Wikipedia/Wikidata** for the head entity to get the canonical related entities and correct names.
4. **Add product/first-hand entities** competitors can't: your data, your screenshots, your customers' results.

> Coverage beats density. There is no keyword-density target. Mention the entity once, naturally, near the top; then answer the questions thoroughly. Thin "SEO content" that restates the keyword is exactly what AI Overviews summarize away.

---

## 3. AI-Era Discovery

Discovery in 2026 is split across classic blue links **and** generative answer surfaces: **Google AI Overviews / AI Mode**, **Bing Copilot**, **ChatGPT Search**, **Perplexity**, **Claude**, and **Gemini**. They synthesize an answer and cite a handful of sources. Your goal shifts from "rank #1" to "**be one of the cited sources**." This section is content-strategy-specific; for the technical/schema substrate (JSON-LD types, Core Web Vitals, indexing, `llms.txt` placement) defer to the `seo-geo` sibling.

### What actually gets cited (content levers you control)

| Lever | What to do | Why it matters for AI answers |
|---|---|---|
| **Direct answers** | Put a 40-60 word, self-contained answer in the first paragraph under each H2, phrased as a complete sentence. | Answer engines extract passages; a clean, quotable passage is far likelier to be lifted and cited. |
| **Extractable structure** | Use descriptive H2/H3 phrased as questions; tables for comparisons; numbered steps for processes; an FAQ block. | Structured chunks are easier to retrieve and attribute than walls of prose. |
| **Entity clarity** | Name entities explicitly (don't rely on "it"/"this"); keep one canonical definition; use consistent naming across the cluster. | Retrieval and answer synthesis are entity-driven; ambiguous referents get dropped. |
| **Freshness & dates** | Show a visible "Last updated YYYY-MM"; date every statistic; refresh pillars quarterly. | Answer engines prefer—and often label—recent sources; undated claims are low-trust. |
| **Source transparency / E-E-A-T** | Real author + bio + credentials; cite primary sources with links; show first-hand experience (original data, screenshots, tests). | Trust signals raise both classic ranking and citation probability; experience is the part AI can't synthesize. |
| **Statistics & original data** | Publish one genuinely original, citable number or dataset per pillar (a survey, a benchmark, your own results). | Answer engines love a quotable stat with a clear source — original data is the highest-leverage citation magnet. |
| **Retrievability** | Ensure the page is crawlable, fast, and not gated; keep the key answer above the fold and in HTML (not lazy-loaded JS). | If a crawler/retriever can't fetch the passage cleanly, it can't cite you. (Mechanics → `seo-geo`.) |

### Page pattern optimized for both SERP snippets and AI answers

```html
<article>
  <h1>{Specific, current title — include the year only if the topic is time-bound}</h1>
  <p class="updated">Last updated {Mon YYYY} · Reviewed by {Author, credential}</p>

  <h2>What is {entity}?</h2>
  <p><!-- 40-60 words, complete sentence, no "as mentioned above" --></p>

  <h2>How to {do the thing}</h2>
  <ol><li>…</li></ol>

  <h2>{Option A} vs {Option B}</h2>
  <table><!-- explicit comparison rows --></table>

  <h2>Frequently asked questions</h2>
  <!-- Q as <h3>, 40-60 word answer each; mirror PAA wording -->
</article>
<!-- JSON-LD (Article + FAQPage + author/Organization sameAs) → see `seo-geo` -->
```

### Query-class test prompts (run before and after publishing)

Pick the queries your page targets, then probe each answer engine. Record whether your domain is **cited**, **mentioned**, or **absent**, and which competitor is cited instead.

```text
# Definitional
"what is {your topic}"
# Procedural
"how do I {task your page solves}"
# Comparative
"{your product/approach} vs {top competitor}"
# Recommendation / commercial
"best {category} for {audience/use-case}"
# Long-tail / specific
"{specific question from your FAQ block, verbatim}"
```

For each: note the cited sources and the *exact claim* the engine made. If a competitor is cited and you're not, diff your page against theirs on the levers above (usually missing direct answer, missing original data, weaker author signals, or stale dates). Re-test after the page is re-crawled.

> **Don't fabricate to chase citations.** Original "data" must be real and reproducible, author credentials must be true, and review dates must reflect actual reviews. Manufactured stats and fake bylines are the fastest way to lose trust with both readers and answer engines.

---

## 4. Content Scoring Rubric

Score on a **0-5 scale per dimension** so two people grade a page the same way. Multiply by the weight, sum, and act on the band. Five dimensions, separated so a page strong on classic SEO but invisible to AI answers (or weak on trust) is flagged, not hidden inside one blended number.

**Bands:** `>= 80` keep & promote · `60-79` optimize (quick wins) · `40-59` consolidate or rewrite · `< 40` prune / redirect / no-index (see §8).

### Dimension 1 — Classic SEO (weight 20)

| 0-1 | 2-3 | 4-5 |
|---|---|---|
| Wrong intent vs SERP; no internal links; title not matching query | Right intent; basic title/meta; a few internal links; some optimization | Intent matches dominant SERP format; descriptive title+meta; links UP to pillar + ACROSS to siblings; clean URL/headers; valid schema (per `seo-geo`) |

### Dimension 2 — AI-search retrievability (weight 20)

| 0-1 | 2-3 | 4-5 |
|---|---|---|
| Wall of prose; no direct answers; entities referred to as "it"; gated/JS-only | Some headers; partial direct answers; inconsistent entity naming | First-paragraph 40-60 word answers under question H2s; tables/steps/FAQ; explicit entity names; crawlable HTML; passes query-class test (cited or mentioned) |

### Dimension 3 — Trust / E-E-A-T (weight 20)

| 0-1 | 2-3 | 4-5 |
|---|---|---|
| No author; no sources; no evidence of first-hand use; undated | Named author; some links; a date somewhere | Credentialed author + bio; primary sources cited & dated; demonstrable first-hand experience (original data/screenshots/test); visible last-reviewed date + reviewer |

### Dimension 4 — Conversion (weight 20)

| 0-1 | 2-3 | 4-5 |
|---|---|---|
| No CTA, or CTA mismatched to funnel stage | Generic CTA present; weak relevance | One clear primary CTA matched to the page's funnel stage; logical next step (related spoke/pillar); lead capture where appropriate; measurable conversion event wired |

### Dimension 5 — Maintenance / decay risk (weight 20)

| 0-1 | 2-3 | 4-5 |
|---|---|---|
| Traffic/clicks declining; facts/screenshots stale; broken links | Flat; partially dated | Stable or growing impressions/clicks (GSC); facts current; links healthy; on a refresh cadence appropriate to volatility |

**Worked example (illustrative):** a 2,000-word guide that ranks page-2, has clean SEO (4), but is a prose wall with no author and is two years stale would score roughly: SEO 4·20=80 → but AI-retrievability 1, trust 1, maintenance 1, conversion 2. Normalized to 100 that lands in the **40-59 "rewrite"** band — and the rubric tells you exactly *why*: add direct answers + author + refresh, not "write more words."

> The rubric does not need code. If you want to automate inputs, pull the measurable ones (clicks/impressions/position from GSC, internal-link counts from a crawl, presence of `author`/`datePublished` in the page's JSON-LD) and score the judgment dimensions by hand.

---

## 5. Editorial Calendar Operating Model

The calendar is an operating system, not a spreadsheet of dates. Define the **states**, **owners**, **WIP limits**, and **definition of done** — then any tool (Airtable, Notion, Linear, a sheet) works.

### Status workflow (the only states that matter)

```
Backlog  →  Briefed  →  Drafting  →  Editing  →  SEO/QA  →  Scheduled  →  Published  →  In-refresh
```

| Status | Owner | Exit criteria (definition of done for the stage) |
|---|---|---|
| **Backlog** | Strategist | Cluster + intent + funnel stage + rough volume captured |
| **Briefed** | Strategist | §2 brief complete (entities, questions, 10x angle, schema, E-E-A-T reqs) |
| **Drafting** | Writer | Draft covers all brief questions; internal links placed; sources cited |
| **Editing** | Editor | Structure/clarity/brand voice; direct answers present under each H2 |
| **SEO/QA** | SEO owner | Title/meta, schema valid (`seo-geo`), links resolve, images have alt, mobile/CWV ok |
| **Scheduled** | Editor | Publish date set; distribution + repurposing tasks created (§7) |
| **Published** | — | Live, indexed (submit/inspect in `search-console`), tracking wired (§9) |
| **In-refresh** | Strategist | On a cadence; re-enters Editing when decay detected (§4 D5) |

**WIP limits** keep throughput honest: cap "Drafting" + "Editing" to ~2× the number of writers; if it backs up, stop adding to Backlog. Cycle time (Briefed → Published) is the metric to watch.

### Field schema (tool-agnostic)

Use these exact fields in whatever tool you pick:

```yaml
fields:
  title:            text
  status:           select        # the 8 states above
  cluster:          select        # which pillar it belongs to
  funnel_stage:     select        # TOFU | MOFU | BOFU
  primary_kw:       text
  kw_source:        text          # "Ahrefs · US · YYYY-MM"  (data hygiene rule)
  intent:           select
  brief_url:        url           # link to the §2 brief
  author:           person
  editor:           person
  publish_date:     date
  conversion_event: select        # what success looks like for THIS page
  internal_links:   text          # up/across targets
  last_reviewed:    date          # drives §8 refresh cadence
  status_metric:    text          # latest clicks/impressions/position (GSC)
```

### Calendar example (use a forward, relative date)

Plan against the **current quarter**, not a fixed past month. Pattern for any given month:

```yaml
month: "<current quarter, e.g. Q3 2026>"
theme: "Editorial systems"
goal: "+X qualified signups attributed to content"

week_1:
  - title: "Content marketing plan template"
    cluster: "content-marketing-strategy"
    funnel_stage: TOFU
    type: template
    primary_kw: "content marketing plan template"
    author: "<writer>"
    distribution: [blog, newsletter, linkedin]
    conversion_event: "template download"
  - title: "5 content planning mistakes"
    funnel_stage: TOFU
    type: listicle
    conversion_event: "newsletter signup"
  - title: "Case study: how <customer> doubled organic clicks"
    funnel_stage: BOFU
    type: case-study
    distribution: [blog, linkedin]
    conversion_event: "demo request"

repurposing_queue:     # auto-created when an item hits "Scheduled" (see §7)
  - source: "week_1 template"   -> [carousel, newsletter section]
  - source: "week_1 case study" -> [short video, quote cards]
```

### Production workflow

```
Idea → Cluster fit check (§1) → Brief (§2) → Draft → Edit → SEO/QA (seo-geo)
     → Schedule → Publish → Distribute + Repurpose (§7) → Measure (§9) → Refresh (§8)
```

---

## 6. Content Gap Analysis

Find what competitors rank/get-cited for that you don't, then prioritize by winnability × value. This is an analyst workflow with real tools, not a black-box function.

### Inputs

- **Your ranking keywords + positions** — Search Console (`search-console` skill) or Ahrefs/Semrush "Organic keywords".
- **Competitor ranking keywords** — Ahrefs/Semrush "Site Explorer" per competitor; export to CSV.
- **AI-answer gaps** — run the §3 query-class prompts for your money topics; log where a competitor is cited and you're absent.
- **SERP feature gaps** — for your target terms, note which features (AIO, snippet, video, PAA) you're missing.

### Runnable: keyword gap from CSV exports

This uses your own exported CSVs (no fictional API). Export "Organic keywords" for yourself and each competitor from your SEO tool, then:

```python
#!/usr/bin/env python3
"""Keyword gap analysis from Ahrefs/Semrush CSV exports.
Usage: python gap.py ours.csv comp1.csv comp2.csv ...
Each CSV must contain columns: Keyword, Volume, KD (Difficulty), Current position (theirs).
Column names below match Ahrefs 'Organic keywords' export; adjust if using Semrush."""
import csv, sys

KW, VOL, KD, POS = "Keyword", "Volume", "KD", "Current position"

def load(path):
    with open(path, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))

ours = {r[KW].strip().lower() for r in load(sys.argv[1])}
gaps = {}
for comp_path in sys.argv[2:]:
    for r in load(comp_path):
        kw = r[KW].strip().lower()
        if kw in ours or not kw:
            continue
        try:
            pos = float(r.get(POS) or 999)
        except ValueError:
            pos = 999
        if pos > 10:                      # only count where they actually rank
            continue
        vol = int((r.get(VOL) or "0").replace(",", "") or 0)
        kd  = int((r.get(KD) or "100").replace(",", "") or 100)
        # winnability: high volume, low difficulty rises to the top
        score = round(vol / (kd + 1), 1)
        cur = gaps.get(kw)
        if not cur or score > cur["score"]:
            gaps[kw] = {"keyword": kw, "volume": vol, "kd": kd,
                        "best_competitor_pos": pos, "score": score,
                        "source": comp_path}

for g in sorted(gaps.values(), key=lambda x: -x["score"])[:50]:
    print(f"{g['score']:>8}  {g['keyword'][:45]:45}  vol={g['volume']:<6} kd={g['kd']:<3} "
          f"theirpos={g['best_competitor_pos']:<4} ({g['source']})")
```

> The `score = volume / (kd+1)` heuristic is a *starting* sort, not gospel. Re-rank the top 50 by intent match and business value before committing — a KD-12 term with no commercial relevance loses to a KD-35 term that sells your product.

### Prioritization framework

| Tier | Criteria | Action |
|---|---|---|
| **P1 (do now)** | Non-trivial demand · KD below your proven ceiling · clear intent you can satisfy · maps to a CTA · a competitor already ranks/cited | Brief this quarter |
| **P2 (queue)** | Moderate demand/difficulty · mixed intent · tangential business fit | Next quarter / batch |
| **P3 (later)** | Thin demand · KD above ceiling · unclear intent or weak business value | Park; revisit if authority grows |

> Treat **AI-answer gaps** as their own P1 list: if you already rank but aren't *cited*, the fix is usually a §3 content edit (direct answer, original data, author signals), which is far cheaper than net-new content.

---

## 7. Content Repurposing System

One substantial asset feeds many channels. Atomize by extracting the parts that already exist (key insights, steps, stats, quotes) — don't write net-new for each channel.

### Atomization map

```yaml
pillar (2,500+ words):
  - 5-7 short-form posts (one key insight each)        # LinkedIn / X / Threads / Bluesky
  - 1 newsletter issue (summary + best CTA)
  - 3-4 LinkedIn text or document posts (section deep-dives)
  - 1 short-form video script (Shorts / Reels / TikTok, 30-60s) per key step
  - 1 long-form video / webinar outline
  - 4-6 quote/stat cards (the original data from §3)
  - 2-3 guest-post / digital-PR angles (pitch the original data)

blog post (1,200-1,800 words):
  - 3-4 short-form posts
  - 1 newsletter section
  - 1 short video / reel
  - 2-3 stat cards
  - 1 podcast talking-point set

case study:
  - result-led short-form posts (the headline number)
  - data-viz graphics + client quote cards
  - 1 short video testimonial cut
  - 1 sales-enablement one-pager
```

> Repurposing is a calendar trigger, not a side project: when an item reaches **Scheduled** (§5), auto-create its repurposing tasks so distribution ships with the article, not weeks later.

### Channel guidance (current as of Jun 2026 — verify limits at each platform's docs)

| Channel | Format that works | Hard limits / notes |
|---|---|---|
| **LinkedIn** | Professional POV; native **document/carousel** posts perform well; lead with a hook line | ~3,000-char post limit; first ~2 lines show before "see more"; 3-5 hashtags; native video/document over external links |
| **X (Twitter)** | Threads for processes; one idea per post; visuals lift reach | **280 characters** for standard posts; paid (X Premium) tiers allow much longer posts — don't design around the old 140/240 limits |
| **Threads / Bluesky** | Same atomized insights as X; conversational | Threads ~500 chars; Bluesky 300 chars — re-cut, don't copy-paste |
| **YouTube** | Long-form how-to + **Shorts** for the atomized steps | SEO title/description; chapters/timestamps; auto-captions; end screens |
| **TikTok / Reels / Shorts** | 30-60s single-tip videos from each step | Hook in first 2s; on-screen captions; one CTA |
| **Email newsletter** | Value-first summary + the one CTA; scannable | Mobile-first; one primary CTA; segment when possible |
| **Podcast** | Pillar as an episode outline; reuse the brief's questions | Publish a transcript page (also a citable, indexable asset) |

> **Retired/repositioned channels.** SlideShare's strategic value has collapsed; do **not** make it a default output. If you have decks, post them as LinkedIn **document** posts and as an indexable HTML page on your own domain instead. Re-evaluate any "default channel" list yearly — platform relevance shifts fast.

---

## 8. Content Audit & Maintenance

Audit to decide, per URL: **keep / optimize / consolidate / rewrite / prune**. Pull inventory + metrics, score with §4, act by band.

### Build the inventory (real tools, real steps)

1. **URL list** — `sitemap.xml`, or crawl with Screaming Frog (free up to 500 URLs) / Sitebulb to also capture titles, word count, status codes, indexability.
2. **Performance** — Search Console "Pages" (clicks, impressions, position) and GA4 (engaged sessions, conversions). Pull a 16-month GSC window to see trend, not a snapshot.
3. **Indexation** — flag URLs not indexed (GSC URL Inspection / Pages report); decide index vs no-index vs redirect.
4. **Score** — apply the §4 rubric; sort by band.

### Runnable: join a crawl export with GSC clicks to triage

```python
#!/usr/bin/env python3
"""Triage a content inventory: crawl export (Screaming Frog) + GSC pages export.
Outputs a keep/optimize/consolidate/prune recommendation per URL.
- crawl.csv  : Screaming Frog 'Internal > HTML' export (cols: Address, Word Count, Indexability)
- gsc.csv    : Search Console 'Pages' export (cols: Top pages/Page, Clicks, Impressions, Position)
"""
import csv, sys

def load(p):
    with open(p, newline="", encoding="utf-8-sig") as f:
        return list(csv.DictReader(f))

def num(x, d=0):
    try: return float(str(x).replace(",", ""))
    except (TypeError, ValueError): return d

crawl = {r["Address"].rstrip("/"): r for r in load(sys.argv[1])}
gsc = {}
for r in load(sys.argv[2]):
    url = (r.get("Page") or r.get("Top pages") or "").rstrip("/")
    if url:
        gsc[url] = r

for url, c in crawl.items():
    g = gsc.get(url, {})
    clicks = num(g.get("Clicks"))
    impr   = num(g.get("Impressions"))
    pos    = num(g.get("Position"), 999)
    words  = num(c.get("Word Count"))
    # Screaming Frog emits exactly "Indexable" / "Non-Indexable" — match exactly,
    # NOT substring (`"indexable" in "non-indexable"` is True and would mis-pass).
    indexable = c.get("Indexability", "").strip().lower() == "indexable"

    if not indexable:
        rec = "review-indexation"
    elif clicks == 0 and impr < 50:
        rec = "PRUNE/redirect (no demand, no clicks)"
    elif impr >= 100 and pos > 10:
        rec = "OPTIMIZE (demand exists, ranking page 2+)"   # quick win
    elif clicks > 0 and words < 600:
        rec = "EXPAND/REWRITE (thin but converting)"
    elif clicks > 0:
        rec = "KEEP (refresh on cadence)"
    else:
        rec = "CONSOLIDATE candidate (low signal)"
    print(f"{rec:42}  clk={clicks:<5.0f} impr={impr:<6.0f} pos={pos:<5.0f} w={words:<5.0f} {url}")
```

> "Quick wins" = URLs with impressions but position 11-20: small edits (better title/intro answer, internal links, refreshed facts) often move them onto page 1. The `search-console` skill's quick-win detection automates surfacing these.

### Maintenance cadence

| Cadence | Tasks |
|---|---|
| **Weekly** | Watch new-post performance; ship scheduled distribution/repurposing; fix broken links on recent posts; reply to comments |
| **Monthly** | Review GSC/GA4 trends; promote quick-win URLs (pos 11-20); refresh CTAs/offers; re-run §3 query-class tests for money topics |
| **Quarterly** | Full audit (score every URL with §4); refresh every pillar (dates, stats, screenshots, last-reviewed); competitor + AI-citation gap pass (§6); consolidate/prune the `<40` band |
| **Annually** | Full inventory recategorization; cluster restructure; channel-relevance review (kill dead channels); content ROI/attribution review |

---

## 9. Measurement

Track classic organic **and** AI-search visibility. Separate the two — a page can lose clicks to an AI Overview while its impressions rise, which is a content-edit signal, not a failure.

### What to pull, from where

| Question | Source | Specifics |
|---|---|---|
| Are we ranking / trending? | Search Console | Clicks, impressions, avg position by page & query; 16-month window for trend |
| Engagement & conversion | GA4 | Engaged sessions, key events (your conversion_event per page), conversions, attribution |
| Are we cited by AI engines? | Manual §3 prompts + AI-visibility tooling | Log cited/mentioned/absent per money query, per engine, monthly |
| Indexation health | Search Console | URL Inspection / Pages report; non-indexed reasons |

### GSC quick pull (CLI, for a recurring report)

If you have the `search-console` MCP/skill wired, query it there. As a raw fallback, the Search Analytics API (free, OAuth) returns top pages/queries:

```bash
# Top pages by clicks, last 28 days (requires an OAuth access token for the property).
# See `search-console` for token setup; do not hardcode credentials.
curl -s -X POST \
  "https://www.googleapis.com/webmasters/v3/sites/$(python3 -c 'import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1],safe=""))' "$SITE_URL")/searchAnalytics/query" \
  -H "Authorization: Bearer $GSC_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startDate":"2026-05-10","endDate":"2026-06-07","dimensions":["page"],"rowLimit":25}'
```

### AI-search measurement (do this manually if nothing else)

Once a month, run the §3 query-class prompts across the engines your audience uses and fill:

```yaml
query: "best <category> for <audience>"
date: 2026-06-07
results:
  google_ai_overview: cited        # cited | mentioned | absent
  chatgpt_search:      mentioned
  perplexity:          absent       # -> competitor X cited; diff our page (§3)
  gemini:              cited
action: "Add original benchmark + author bio to /our-page/ ; re-test next cycle"
```

> Tie content to revenue, not vanity metrics. The headline number for a content program is **qualified conversions attributed to organic/AI-referred content** (GA4 key events), not pageviews. Pageviews justify nothing on their own.

---

## Cross-links

- Technical SEO, schema/JSON-LD, Core Web Vitals, indexing, `llms.txt`: **`seo-geo`**
- Generating pages at scale from a dataset/template: **`programmatic-seo`**
- Writing craft, headlines, hooks, voice: **`copywriting`**
- CMS / blog implementation: **`blog-engine`**
- Search Console wiring, quick-win detection, sitemaps: **`search-console`**
- GA4 events, attribution, reports: **`google-analytics`**
- Per-channel organic playbooks: **`social-media-growth`**
- Competitor SERP/keyword teardown: **`competitor-intelligence`**
