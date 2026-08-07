## Contents

- 4. Content Scoring Rubric
- Dimension 1 — Classic SEO (weight 20)
- Dimension 2 — AI-search retrievability (weight 20)
- Dimension 3 — Trust / E-E-A-T (weight 20)
- Dimension 4 — Conversion (weight 20)
- Dimension 5 — Maintenance / decay risk (weight 20)

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
