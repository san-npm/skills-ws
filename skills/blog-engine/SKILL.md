---
name: blog-engine
description: "End-to-end pipeline for one long-form, answer-engine-ready blog post — brief, primary-source research, intent mapping, outline, draft, on-page + AI-search optimization, JSON-LD, internal links, QA, and refresh, with 50+ headline formulas and 8 post-type templates. Use when researching, outlining, drafting, optimizing, or refreshing a blog post or SEO article."
---

# Blog Engine

Production pipeline for **one excellent long-form post**, from blank page to publish-ready and through its first refresh. This skill owns *execution of a single article*. It deliberately does **not** re-derive program strategy or engine internals — cross-link instead:

- **Topic clusters, editorial calendar, pillar/cluster model** → `content-strategy`
- **Template/directory/comparison pages generated at scale** → `programmatic-seo`
- **Engine-by-engine GEO stance, schema catalog, E-E-A-T, Core Web Vitals, hreflang** → `seo-geo`
- **Headline/CTA frameworks (PAS/AIDA/4U/BAB), voice calibration, before/after rewrites** → `copywriting`
- **Local intent (city/service pages, NAP, GBP)** → `local-seo`
- **Post-publish distribution sequences** → `email-sequence`, `social-media-kit`, `social-media-growth`

## 2026 ground rules (read first)

Search in mid-2026 is split between classic blue-link ranking and **answer engines** (Google AI Overviews & AI Mode, Bing Copilot, ChatGPT Search, Perplexity, Gemini, Claude). A post must work for both. Non-negotiables:

1. **Information gain over imitation.** Copying the SERP's structure/word count produces derivative pages that Google's helpful-content systems and AI engines both ignore. Every post must add something the top results don't have: original data, a first-hand test, a named expert quote, a calculator, a decision table, or a clearer synthesis. Aim to be *the* source an answer engine quotes, not the tenth paraphrase.
2. **First-party experience (the extra "E").** Show you actually did the thing: screenshots you took, numbers you measured, a methodology paragraph, a dated byline with a real author bio and credentials. This is what separates a quotable post from spun content.
3. **Length follows intent, not a target.** There is no minimum word count. A definition query deserves 600 focused words; a "best X for Y" comparison may need 3,000 with a table. Match the depth a satisfied reader needs and stop.
4. **Disclose AI assistance + keep an editorial gate.** AI-drafted copy must be fact-checked, edited, and reviewed by a named human before publish. Add a transparency note in your content policy (e.g., "Drafted with AI assistance, reviewed and edited by [author]") where your jurisdiction or audience expects it. Mass-produced, unreviewed AI pages are the exact pattern Google's scaled-content-abuse policy (March 2024, enforced through 2026) demotes — see `programmatic-seo` for the scale-safe variant.
5. **Citation hygiene.** Cite primary sources (the study, the docs, the filing — not a blog citing a blog). Record the publish/last-updated date of every source; drop or re-verify anything older than ~18 months for fast-moving topics. Never fabricate a statistic, quote, or study; if you can't verify it, cut it.

---

## Pipeline

### 0. Brief (define before you research)

Write these seven lines before touching a draft. They prevent scope creep and a post that ranks for nothing.

```
Primary keyword     : best crm for solo consultants
Search intent       : commercial-investigation (wants a shortlist + how to choose)
Audience + stage    : solo consultant, evaluating tools, low technical depth
Target query / JTBD : "which CRM should a one-person shop actually pay for?"
Information gain     : our own 30-day test of 6 tools + pricing table they can't find collated elsewhere
Primary CTA + path  : free trial of [product] (mid-article soft, end hard)
Author + credibility : [Name], ran a consulting practice 6 yrs (real bio + photo)
```

**Map the intent → format** (this replaces "look at the top 5 and copy them"):

| Intent | Query signals | Winning format | Primary CTA |
|---|---|---|---|
| Informational / definition | "what is", "meaning", "how does X work" | Concise answer-first explainer | Subscribe / related deep-dive |
| How-to / procedural | "how to", "steps", "tutorial" | Numbered steps + screenshots + pitfalls | Tool/template download |
| Commercial investigation | "best", "top", "vs", "alternatives", "review" | Comparison table + criteria + verdict | Trial / demo |
| Transactional | "buy", "pricing", "coupon", "near me" | Short, decision-oriented, fast path | Buy / contact |
| Navigational | brand + feature | Direct, brand-led | Login / product page |

### 1. Research (primary sources, not the SERP)

Goal: collect material that lets you *out-cover* the field, and verify every fact.

- **Define the entity set.** List the people, products, specs, standards, and sub-questions a complete answer must cover (the topic's "entities"). Coverage gaps here are why thin posts lose to thorough ones. For cluster-level entity planning see `content-strategy`.
- **Harvest real questions.** People Also Ask, `AlsoAsked`/`AnswerThePublic`-style tools, Reddit/forum threads, support tickets, sales-call objections, and YouTube comments. These become H2s and FAQ candidates.
- **Pull primary sources.** Original studies, official docs, regulatory filings, manufacturer specs, first-party analytics. Capture: source name, URL, **publish/updated date**, and the exact figure. Prefer the source over any blog summarizing it.
- **Generate first-party information gain.** Pick at least one: run a hands-on test, survey your list, pull anonymized data from your product, screenshot a real workflow, or interview an expert. This is the single highest-leverage step and the one competitors skip.
- **Read the SERP for *gaps*, not a template.** Skim the top results to find what's missing, outdated, or wrong — then fill that hole. Do **not** target their word count or mirror their headings; that's how you produce a forgettable near-duplicate.
- **Note the answer-engine angle.** Check whether an AI Overview/Copilot answer already appears for the query and what it cites. Aim to become a more citable source (clear claims, a stat with attribution, a definition block). Engine-specific tactics live in `seo-geo`.

**Fact-check gate before drafting:** every statistic has a primary source + date; every quote is attributed and real; nothing is older than your freshness threshold without re-verification; AI-suggested "facts" are independently confirmed.

### 2. Outline

Structure follows the intent format from step 0; this skeleton is the common case for an informational/how-to post. Use the per-type templates below for comparison, listicle, alternatives, case study, thought leadership, and product-led pages.

```
# {Headline — primary keyword + a specificity hook (number, year, outcome)}

> Author byline + publish/updated date + 1-line credibility ("ran X for Y years")

## Intro (80–150 words)
- Open with the reader's problem or a concrete promise (NOT a generic "in today's world")
- State the payoff: what they'll be able to do/decide by the end
- For definition/how-to intent only: include a tight 40–55 word answer block near the top
- Optional ToC for posts with 5+ H2s

## {H2 — first sub-question / step}        ← mirror real PAA / entity gaps
### {H3 if a step has detail}

## {H2 — second}
## {H2 — third}
## {H2 — Our test / data / methodology}     ← the information-gain section

## {H2 — Comparison / decision table}        ← if commercial intent

## FAQ  (optional; see schema note in §4 — schema ≠ visible rich result)
- 3–6 genuine residual questions not answered in the body

## Conclusion / Next step
- One-line synthesis (the takeaway, not a recap of every H2)
- Single primary CTA matched to intent
```

### 3. Draft

Write for a satisfied reader first, the crawler second. Rules that hold up in 2026:

- **Lead by intent, not by reflex.** Answer-first is right for *definition/how-to* queries (it earns the snippet and the AI citation). For comparison, investigative, narrative, or transactional posts a hard answer-first sentence reads robotically — open with the stakes, the surprising finding, or the scenario, and place the crisp answer where it belongs.
- **One idea per paragraph; vary length.** Mostly 2–4 sentences, but don't mechanize it — a one-line paragraph for emphasis and an occasional longer one for nuance read more human and dodge the spun-content feel.
- **Skip the formulaic filler.** Avoid manufactured "bucket brigades" ("Here's the thing:", "But wait — it gets better:") and AI throat-clearing ("In today's fast-paced world", "It's important to note that"). They pad word count, signal low-effort content, and don't help the reader. Earn engagement with specifics and a real point of view instead. (Genuine transitions are fine; canned hype lines are not.)
- **Be concrete and original.** Replace "studies show" with the named study + number; replace "many businesses" with a real example or your own data. Specificity is the whole game for both readers and answer engines.
- **Format for scannability and extraction.** Descriptive H2/H3s phrased like real questions; bulleted criteria; HTML `<table>` for any comparison; a 40–55 word definition block under a "What is X?" heading. Clean, self-contained chunks are what get lifted into AI Overviews and snippets.
- **Insert images where they explain, not on a timer.** Add a diagram/screenshot/chart wherever it carries information (every ~300–500 words is typical, not a rule). Each needs a real alt text and ideally is original (your screenshot > stock).
- **Readability ~grade 7–9** (Flesch-Kincaid ~60–70) for general audiences — but *don't* dumb down technical posts for technical readers. Match the audience in the brief.
- **Voice & deeper headline/CTA craft** → `copywriting`. **Repurposing one post into many formats** → `content-strategy`.

### 4. On-page & answer-engine optimization

Checklist — apply naturally, never stuff:

- [ ] Primary keyword in: title tag, H1, first ~100 words, URL slug, meta description (once each, no forcing)
- [ ] Secondary keywords + entities covered in H2s and body where they read naturally
- [ ] **Title tag** ≤ ~60 chars, front-loaded keyword + a hook (number/year/benefit)
- [ ] **Meta description** ~150–160 chars, includes keyword + a reason to click (it's a CTR lever, not a ranking factor)
- [ ] **URL slug**: short, lowercase, hyphenated, keyword, no dates/stop-words (`/best-crm-solo-consultants`)
- [ ] **Alt text** on every image: describes the image; keyword only if genuinely accurate
- [ ] **Internal links**: 3–6 to relevant posts/pillars with descriptive anchors (see §5)
- [ ] **External links**: 2–4 to primary/authoritative sources (studies, docs, official pages)
- [ ] **One H1 only**; logical H2→H3 nesting; no skipped levels
- [ ] **Author byline + bio + visible publish/updated date** (E-E-A-T signal)
- [ ] **Article/BlogPosting JSON-LD** present (see below)
- [ ] Quotable assets in place: a stat-with-source, a definition block, a decision table — the things answer engines cite

**Structured data — what actually does something in 2026:**

| Schema type | Use it for | Visible rich result today? |
|---|---|---|
| `Article` / `BlogPosting` | Every post — author, dates, publisher, image | Helps machine understanding; powers Top Stories/Discover eligibility |
| `BreadcrumbList` (items are `ListItem`) | Site hierarchy | Yes — breadcrumb trail in SERP |
| `HowTo` | Genuine step-by-step procedures | Largely **removed** from Google rich results (2023); still aids comprehension/AI — don't expect the visual widget |
| `FAQPage` | Real FAQ blocks | **Do not expect a rich result.** Google restricted FAQ rich results to authoritative gov/health sites in 2023 and has retired general FAQ visibility since. Keep `FAQPage` only as machine-readable context / possible AI-citation help when you have *genuine* Q&A — never add fake questions to chase a snippet. |
| `Product` / `Review` / `AggregateRating` | Product or review posts (only with real, verifiable ratings) | Yes — review stars (policy-gated; self-serving ratings are penalized) |

Full engine-by-engine schema catalog and validation workflow: `seo-geo`. Validate any JSON-LD in Google's Rich Results Test and `schema.org` validator before publish.

**Minimal `BlogPosting` JSON-LD** (fill the placeholders; dates in ISO 8601):

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "Best CRM for Solo Consultants (2026): 6 Tested",
  "description": "We tested six CRMs for 30 days. Here's the shortlist, pricing, and how to choose.",
  "image": "https://example.com/img/best-crm-solo-cover.png",
  "datePublished": "2026-06-07T09:00:00+00:00",
  "dateModified": "2026-06-07T09:00:00+00:00",
  "author": {
    "@type": "Person",
    "name": "Author Name",
    "url": "https://example.com/about/author-name",
    "jobTitle": "Independent consultant"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Your Brand",
    "logo": { "@type": "ImageObject", "url": "https://example.com/logo.png" }
  },
  "mainEntityOfPage": { "@type": "WebPage", "@id": "https://example.com/best-crm-solo-consultants" }
}
```

**Optional `FAQPage` JSON-LD** — add *only* for real Q&A; treat as machine context, not a guaranteed widget:

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Do solo consultants need a CRM?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "If you track more than ~20 active relationships or any repeat pipeline, yes — a lightweight CRM beats a spreadsheet for follow-up reminders and history."
    }
  }]
}
```

### 5. Internal-link plan

Internal links spread authority and define your topic structure — plan them, don't sprinkle randomly.

- **Up to the pillar:** link this post to the cluster's pillar page (and the pillar back down to it). Cluster architecture is owned by `content-strategy`.
- **Sideways to siblings:** 2–4 links to closely related posts using **descriptive anchor text** (the target's topic, e.g. "lightweight CRM pricing"), never "click here".
- **Down to conversion:** 1–2 links to the relevant product/landing/pricing page on the natural path to your CTA. Landing-page craft: `landing-page-builder`.
- **Backfill inbound links:** add links *from* existing high-authority posts *to* this new one — new posts have no internal equity until you do.
- **Audit anchors:** vary anchor text; avoid 10 posts all linking with the identical exact-match phrase (looks manipulative).

Quick plan template:

```
This post → pillar:        /guides/crm  (anchor: "complete CRM guide")
This post → sibling:       /crm-vs-spreadsheet  (anchor: "CRM vs a spreadsheet")
This post → conversion:    /pricing  (anchor: "[product] pricing")
Inbound (existing → this): /freelancer-tools, /consulting-ops  add contextual links
```

### 6. Image brief

Give a designer/generator everything in one block; originality beats stock for trust and reuse:

```
Cover (1200×630, also OG image):
  - Concept: 6 CRM logos on a comparison grid, brand colors, post title overlaid
  - Format: WebP, < 150 KB, alt: "Comparison grid of six CRM tools tested for solo consultants"
In-body:
  1. Screenshot — your actual pipeline view in [tool] (original, not stock)
  2. Chart — 30-day response-time results from our test (label axes + source)
  3. Decision diagram — "Which CRM should you pick?" flow
Specs: WebP/AVIF, lazy-load below the fold, explicit width/height (CLS), descriptive alt on each.
```

### 7. QA & publish checklist

- [ ] **Facts re-verified** against primary sources; dates current; no fabricated stats/quotes
- [ ] **Human editorial review** done by a named editor; AI assistance disclosed per policy
- [ ] Reads well aloud; no filler/hype lines; intro delivers on the title (no clickbait gap)
- [ ] Grammar/spelling clean; consistent terminology and capitalization
- [ ] One H1; heading hierarchy valid; ToC anchors resolve
- [ ] All links work (no 404s); external links open authoritative, live sources
- [ ] Images compressed (WebP/AVIF), sized, lazy-loaded, all with alt text; cover doubles as OG
- [ ] JSON-LD (`BlogPosting` + breadcrumbs; `FAQPage` only if real) validates in Rich Results Test
- [ ] **Open Graph + Twitter Card**: `og:title`, `og:description`, `og:image` (1200×630), `og:type=article`, `twitter:card=summary_large_image`
- [ ] Title tag ≤ ~60 chars, meta description ~150–160 chars, slug clean
- [ ] Canonical tag set; not accidentally `noindex`; in the sitemap (verify in `search-console`)
- [ ] Mobile render + Core Web Vitals sane (LCP/INP/CLS) — see `web-performance`, `seo-geo`
- [ ] Internal-link plan executed both directions
- [ ] Distribution queued: email (`email-sequence`), social (`social-media-kit`)

### 8. Refresh (the post-publish loop most teams skip)

A blog post is an asset to maintain, not ship-and-forget. Schedule reviews; refreshed content often outperforms net-new for the same effort.

- **Cadence:** evergreen posts every 6–12 months; fast-moving topics (pricing, tools, regulations, "best of 2026") quarterly.
- **Triggers to refresh now:** ranking/clicks sliding (check `search-console`), facts/stats/screenshots gone stale, a year in the title rolling over, a competitor now out-covering you, or a new AI Overview answering the query (rework to become the cited source).
- **What to do:** update stats + dates to current primaries, add new sub-questions/entities, re-shoot stale screenshots, prune dead/outdated sections, strengthen the information-gain asset, fix the internal-link graph, then bump `dateModified` and re-request indexing.
- **Decide:** update in place when intent is unchanged (keeps the URL's history); split into a new post when you're really targeting a different intent; consolidate/redirect thin overlapping posts into one strong page.

---

## Headline formulas (50+)

Pick a frame that matches intent, then make it **specific** — add a number, a year, a named outcome, or a constraint. Promise only what the post delivers; a clickbait gap between title and intro tanks dwell time. Deeper headline frameworks (PAS/AIDA/4U/BAB) and split-testing live in `copywriting`. `{}` = fill in.

**How-to / instructional**
1. How to {achieve outcome} in {timeframe}
2. How to {achieve outcome} (Even If {common obstacle})
3. How to {do task} the Right Way: {N} Steps
4. The Complete Guide to {topic} for {audience}
5. {Task}: A Step-by-Step Guide for {year}
6. How I {achieved specific result} — and How You Can Too
7. The Beginner's Guide to {topic}
8. How to {outcome} Without {pain/cost/tool}
9. {N} Steps to {outcome} (With Examples)
10. The Lazy Person's Guide to {outcome}

**Listicle / number**
11. {N} {tools/tips/ways} to {achieve outcome}
12. {N} {category} Every {audience} Should {action} in {year}
13. {N} {mistakes} That Are {negative consequence}
14. {N} Surprising {facts/stats} About {topic}
15. {N} Best {products} for {use case}, Tested
16. Top {N} {category}: Ranked for {audience}
17. {N} {things} You're Doing Wrong (and How to Fix Them)
18. {N} Underrated {tools/tactics} for {outcome}
19. {N} Examples of {thing} Done Right
20. {N}-Minute {task}: {N} Quick Wins

**Comparison / alternatives**
21. {Product A} vs {Product B}: Which Is Better for {use case}?
22. {Product A} vs {Product B} vs {Product C}: An Honest Comparison
23. The {N} Best {Product} Alternatives in {year}
24. {Expensive option} Too Pricey? {N} Cheaper Alternatives
25. Is {product/approach} Worth It? An Honest {year} Review
26. {Approach A} or {Approach B}: How to Choose
27. We Tested {N} {products} — Here's the Winner
28. {Product}: Pros, Cons, and Who It's Actually For

**Question**
29. What Is {term}? (And Why It Matters for {audience})
30. Why Does {phenomenon} Happen — and What to Do About It
31. Should You {action}? Here's How to Decide
32. Can You Really {desirable outcome}? We Checked
33. What's the Best Way to {achieve outcome}?
34. Is {common belief} Actually True?

**Negative / mistake / warning**
35. Stop {doing common thing} — Do This Instead
36. The {N} {topic} Mistakes Costing You {money/time}
37. Why Your {effort} Isn't Working (and the Fix)
38. {N} Myths About {topic}, Debunked
39. The Hidden Cost of {common choice}
40. Avoid These {N} {topic} Pitfalls

**Curiosity / contrarian / data**
41. The Surprising Truth About {topic}
42. What Nobody Tells You About {topic}
43. We Analyzed {N} {things}. Here's What We Found
44. {Counterintuitive claim}: The Data Says {finding}
45. I {did unusual thing} for {timeframe}. Here's What Happened
46. The {topic} Trend Everyone's Ignoring in {year}

**Outcome / benefit-led**
47. {Achieve outcome} in {timeframe} — Without {sacrifice}
48. The {adjective} Way to {achieve outcome}
49. Double Your {metric} With This {tactic/framework}
50. From {bad state} to {good state}: A {timeframe} Playbook

**Thought-leadership / opinion**
51. Why {prediction} Will Change {industry} by {year}
52. The Case for (and Against) {approach}
53. {Industry} Has a {problem} Problem. Here's the Fix
54. Unpopular Opinion: {contrarian take}

---

## Post-type templates

Eight reusable skeletons. Each maps to an intent from §0; swap in your brief's keyword, entities, and information-gain asset. Keep one H1, descriptive H2s, and the schema noted.

### A. How-to / tutorial — *(intent: procedural)*
```
# How to {outcome} in {timeframe}: A Step-by-Step Guide
Byline + date · 40–55 word answer block (what they'll achieve + rough time/cost)
## What you'll need / Prerequisites
## Step 1: {action}        ← screenshot + the "why"
## Step 2: {action}
## Step N: {action}
## Common mistakes / Troubleshooting     ← your first-hand pitfalls = info gain
## FAQ (real residual questions)
## Next step  → tool/template CTA
Schema: BlogPosting (+ HowTo for comprehension; expect no visual widget)
```

### B. Listicle — *(intent: informational/commercial)*
```
# {N} {items} to {outcome} in {year}
Intro: who this list is for + how you chose (selection criteria = trust signal)
## 1. {Item}  — what it is · best for · 1 pro · 1 con · price
## 2. {Item}
## … N
## How to choose the right one for you      ← decision guidance, not just a list
## FAQ
Schema: BlogPosting · use ordered list markup
```

### C. Comparison ("X vs Y") — *(intent: commercial-investigation)*
```
# {Product A} vs {Product B}: Which Is Better for {use case}? ({year})
Verdict up top: 2–3 sentences naming the winner *for each use case*
## Comparison at a glance       ← HTML table: price, key features, best-for, free tier
## {Product A}: strengths & weaknesses
## {Product B}: strengths & weaknesses
## Head-to-head: {dimension 1}, {dimension 2}, {pricing}
## Our test / methodology       ← information gain: how you evaluated
## Which should you choose?     ← map persona → pick
## FAQ
Schema: BlogPosting (+ Review/AggregateRating ONLY with real, verifiable ratings)
```

### D. Alternatives ("best X alternatives") — *(intent: commercial-investigation)*
```
# The {N} Best {Product} Alternatives in {year}
Intro: why someone leaves {Product} (price, missing feature, lock-in) + how you picked
## Quick comparison table       ← alternative · best for · price · key differentiator
## 1. {Alternative} — who it's for · vs {Product} · pricing · catch
## … N
## How to migrate from {Product}        ← practical info gain
## FAQ
Schema: BlogPosting · ordered list
```

### E. Ultimate guide / pillar — *(intent: informational, broad)*
```
# The Complete Guide to {topic} ({year})
ToC (this is long) · who it's for · what you'll learn
## What is {topic}?             ← 40–55 word definition block
## Why {topic} matters
## {Core subtopic 1}  → links to a dedicated cluster post
## {Core subtopic 2}  → cluster post
## {Core subtopic 3}  → cluster post
## Common mistakes / best practices
## Tools & resources
## FAQ
Schema: BlogPosting · this is the hub — link out to and back from cluster posts (content-strategy)
```

### F. Case study / results — *(intent: informational + proof, BOFU)*
```
# How {subject} {achieved result} in {timeframe}
Result up front: the headline number + context (this IS the information gain)
## Background / starting point  ← baseline metrics
## The challenge
## What we did                  ← specific, replicable steps
## Results                      ← before/after table or chart, real numbers
## What we'd do differently
## How to apply this to your {situation}
## CTA → relevant product/service
Schema: BlogPosting
```

### G. Thought leadership / opinion — *(intent: informational + brand authority)*
```
# {Contrarian or forward-looking thesis}
Stake your claim in the first paragraph — say something a base model wouldn't
## The conventional wisdom (and why it's incomplete)
## My/our argument             ← backed by data, experience, or first-hand examples
## Counterpoints & honest limits   ← engaging with objections builds credibility
## What this means for {audience}
## Conclusion: the takeaway
Schema: BlogPosting · author bio + credentials are essential here
```

### H. Product-led / "jobs-to-be-done" SEO — *(intent: informational → product)*
```
# How to {solve problem the product solves} (with or without {product category})
Teach the solution genuinely first — earn trust before the pitch
## Understanding {the problem}
## Method 1: {manual / free approach}      ← real, usable — don't gatekeep
## Method 2: {using a tool like ours}      ← natural, honest product fit
## Comparison: when each method makes sense
## FAQ
## Get started  → product CTA
Schema: BlogPosting · keep teaching:selling ratio high; for scaled JTBD pages see programmatic-seo
```

---

## Anti-patterns (do not ship)

- Mirroring the SERP's word count/headings → derivative, demoted, never cited.
- Fabricated or unverifiable stats/quotes; citing a blog that cites the real source instead of the source.
- Fake FAQ blocks added only to chase a (now mostly gone) rich result.
- Manufactured bucket brigades, hype lines, and AI throat-clearing as filler.
- A rigid answer-first sentence forced onto narrative/comparison/transactional posts.
- Unreviewed, undisclosed mass-produced AI pages (scaled-content-abuse risk — `programmatic-seo`).
- Exact-match anchor text on every internal link; "click here" anchors.
- Keyword stuffing in title/meta/alt; a clickbait title the intro doesn't pay off.
- Publishing once and never refreshing.
