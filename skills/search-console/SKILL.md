---
name: search-console
description: "Google Search Console expert workflows: Page indexing diagnosis, Performance/CTR analysis, sitemap/canonical triage, Core Web Vitals, structured-data eligibility, and the GSC APIs plus BigQuery export. Use when verifying a property, debugging unindexed pages or lost clicks, auditing rich-result eligibility, or pulling GSC data at scale."
---

# Google Search Console

## Workflow

### 1. Property Setup

Verify ownership via DNS TXT record (most reliable):
```
google-site-verification=XXXXXXXXXXXXXXXX
```
Alternatives: HTML file upload, HTML meta tag, Google Analytics, Google Tag Manager.

**Prefer a Domain property** (`example.com`, verified by DNS TXT). It aggregates every protocol and subdomain (`http`, `https`, `www`, `m.`, `blog.`) into one dataset, so you see the whole site without managing many properties. Add a **URL-prefix property** (`https://example.com/`) only when you need narrower scope — e.g. delegating reporting/ownership for one subfolder to a team, isolating a staging host, or because a tool requires a URL-prefix `siteUrl`. URL-prefix properties match the exact protocol + host you enter and do **not** include subdomains.

> The `siteUrl` you use in the APIs must match the property type exactly: Domain → `sc-domain:example.com`; URL-prefix → `https://example.com/` (with trailing slash). Mismatches return `403 PERMISSION_DENIED` even when you own the site.

### 2. Page Indexing Audit

The old Coverage report ("Valid / Valid with warnings / Excluded / Error") is gone. Current GSC has a **Page indexing** report that splits URLs into two buckets — **Indexed** and **Not indexed** — and lists a *reason* per URL. There is no "Valid with warnings" tier; warnings now live under structured-data / enhancement reports, not page indexing.

**Reading the report:**
- Open **Indexing → Pages**. The top chart shows the indexed vs not-indexed split over time.
- Each reason row links to a sample of affected URLs (the table is a *sample*, capped at ~1,000 rows — see API/BigQuery below to get the full list).
- A reason being non-zero is not automatically a bug: most healthy sites permanently carry "Alternate page with proper canonical", "Page with redirect", and "Excluded by 'noindex' tag" rows. Triage by **intent**, not by zeroing every bucket.

**Not-indexed reasons — likely cause and fix:**

| Reason | What it usually means | Action |
|--------|----------------------|--------|
| Crawled - currently not indexed | Google fetched it but chose not to index — thin/duplicate/low-demand content | Improve depth & uniqueness; strengthen internal links from indexed pages; consolidate near-duplicates |
| Discovered - currently not indexed | Known URL not yet crawled — usually **crawl budget / crawl demand**, weak internal linking, or slow server, *not* "needs more backlinks" | Improve internal linking & site speed; reduce low-value URL sprawl (faceted/param URLs); ensure it's in the sitemap. On large sites this is a crawl-prioritization signal, not a quick fix |
| Duplicate without user-selected canonical | No `rel=canonical`; Google clustered it with another URL | Add an explicit self-referencing or correct canonical |
| Duplicate, Google chose different canonical than user | You declared a canonical; Google overrode it | See canonical workflow below — usually conflicting signals or a stronger duplicate |
| Alternate page with proper canonical | Expected — this URL canonicalizes elsewhere | None if intentional; if the wrong URL won, fix canonical/internal links |
| Excluded by 'noindex' tag | Has `noindex` (meta or `X-Robots-Tag`) | Remove `noindex` only if the page *should* rank |
| Blocked by robots.txt | Disallowed before crawl (so Google can't even read a `noindex`) | Unblock in robots.txt if it should be crawled |
| Page with redirect | URL 3xx-redirects | Expected; update internal links to point at the destination |
| Soft 404 | Returns 200 but looks empty/error-like | Add real content or return a proper 404/410 |
| Blocked due to other 4xx / Server error (5xx) / Not found (404) | Fetch failed | Fix status codes; 5xx during a crawl spike implies capacity/crawl-rate issues |

**Validation workflow (replaces the old "Valid" state):** after fixing a reason, click into the reason and press **Validate Fix**. GSC re-crawls the sample over days/weeks; status moves *Started → Passed* (or *Failed* if some URLs still trip the rule). Don't re-press Validate while one is running — it restarts the clock.

**Canonical check (do this before "fixing" a not-indexed page):** in **URL Inspection**, compare **User-declared canonical** vs **Google-selected canonical**.
- They match → your signal won; nothing to do.
- They differ → Google is clustering this URL with another. Common causes: contradictory signals (canonical says A, sitemap/internal links/hreflang point at B), near-duplicate content, or A being a weaker variant (less linked, slower, parameterized). Align *all* signals (canonical tag, internal links, sitemap entry, hreflang return tags) on the single preferred URL — a lone canonical tag is a hint, not a command.

### 3. Performance Analysis

Key metrics: impressions, clicks, CTR, average position. The default **Performance → Search results** report covers the web property; **Discover** and **Google News** are separate tabs that only appear once you have eligible traffic and have their own rules (see below).

**Analysis by query cluster:**
1. Export performance data (Queries tab, up to 16 months in the UI).
2. Group queries by intent/topic.
3. Compare cluster CTR against rough position benchmarks:

| Position | Rough CTR band |
|----------|----------------|
| 1 | 25-35% |
| 2 | 12-18% |
| 3 | 8-12% |
| 4-5 | 5-8% |
| 6-10 | 2-5% |

Treat these as a sanity-check ceiling, not a target — actual CTR varies hugely by query type (branded, navigational, local pack, shopping).

**AI Overviews / AI Mode caveat (critical for 2026):** GSC counts an impression when your link appears in an AI Overview, but the user often gets their answer without clicking, so **CTR at a given position can look "broken" even when the snippet is fine.** GSC does **not** break out AI-surface impressions separately, and the position reported is the link's position, not the AI block's. Before rewriting titles on a low-CTR query, check whether it's an informational query that now triggers an AI Overview (search it). Don't "fix" a snippet that's losing clicks to a zero-click AI answer.

- **If actual CTR < expected (and no AI Overview):** title/description likely needs work, or a competitor has a richer snippet.
- **If actual CTR > expected:** strong snippet — protect this content; note what's working and reuse it.

**Comparing across the AI-Overview rollout:** sudden CTR drops with flat/rising impressions on informational clusters usually mean AI Overviews ate the clicks, not a ranking loss. Segment by intent before drawing conclusions.

**Quick wins — filter for:**
- Position 5-15 with high impressions → optimize to push into top 5.
- High impressions, low CTR, no AI Overview → rewrite title tags and meta descriptions.
- Position 1-3 with declining impressions → content freshness, or query volume / AI-surface shift.

**Regex filters (UI):** in the Queries/Pages filter, switch the match type to **Custom (regex)** for slicing the UI without exporting. Regex uses RE2 syntax and is **case-sensitive by default** — prefix `(?i)` to ignore case.

| Goal | Regex |
|------|-------|
| Branded vs non-branded | `(?i)brandname` (then invert with "Doesn't match") |
| Question queries | `(?i)^(who|what|why|how|when|where|is|can|does)\b` |
| Group of product paths (Pages filter) | `/products/(shoes|boots|sandals)/` |
| Long-tail (4+ words) | `(\w+\s){3,}\w+` |

### 4. Sitemap Management

Submit at Sitemaps → Add a new sitemap:
```
https://example.com/sitemap.xml
```

**Sitemap audit checklist:**
- [ ] All indexable pages included; only canonical, 200-status, indexable URLs (no `noindex`, no redirects, no canonicalized-away duplicates).
- [ ] `<lastmod>` reflects the *actual* last meaningful content change. **Do NOT stamp every URL with today's date on each deploy** — Google learns to distrust `<lastmod>` and may ignore it sitewide, hurting recrawl of genuinely updated pages. Update it only when the page content actually changed.
- [ ] Response is HTTP 200 with valid XML; URLs are absolute and properly entity-escaped (`&` → `&amp;`).
- [ ] ≤ 50,000 URLs **and** ≤ 50 MB uncompressed per file; split larger sites into multiple sitemaps behind a sitemap index. Gzip is fine.
- [ ] Submitted in GSC and referenced via `Sitemap:` in robots.txt.

**Sitemap index triage:** submit the **index** file in GSC, not each child. The Sitemaps report then shows per-child "Discovered URLs" and status. When a sitemap shows "Couldn't fetch": confirm it isn't blocked by robots.txt, returns 200 (not 3xx/4xx), and is valid XML — re-fetch with `curl -sI` and validate. Resubmitting won't help until the underlying fetch succeeds. The "Discovered URLs" count is how many URLs Google *read from the file*, not how many it indexed — cross-check indexing in the Page indexing report.

### 5. Core Web Vitals

Check Page Experience → Core Web Vitals:

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP (Largest Contentful Paint) | ≤ 2.5s | ≤ 4.0s | > 4.0s |
| INP (Interaction to Next Paint) | ≤ 200ms | ≤ 500ms | > 500ms |
| CLS (Cumulative Layout Shift) | ≤ 0.1 | ≤ 0.25 | > 0.25 |

**Debugging workflow:**
1. Identify failing URL groups in GSC
2. Test specific URLs with PageSpeed Insights
3. Fix the highest-impact issue first (usually LCP)
4. Validate fix in GSC (takes 28 days for field data)

**Common fixes:**
- LCP: Optimize hero image (WebP, proper sizing, preload), eliminate render-blocking resources
- INP: Reduce JavaScript execution time, break long tasks, use `requestIdleCallback`
- CLS: Set explicit width/height on images/video, avoid dynamic content injection above the fold

### 6. URL Inspection

Use the URL Inspection tool to:
- Check whether a specific URL is indexed and view the **user-declared vs Google-selected canonical**.
- See how Googlebot renders the page ("View crawled page" + "Test live URL" for the current state).
- Request indexing for a *single* new/updated page (rate-limited; see safety note).
- Debug discovery/crawl/index status for one URL at a time.

**API access (URL Inspection API).** Read-only; returns the same index status the UI shows. It does **not** request indexing (no public indexing endpoint for normal web pages — the Indexing API is only for `JobPosting`/`BroadcastEvent` markup).

OAuth scope: `https://www.googleapis.com/auth/webmasters.readonly`. Quota (as of Jun 2026; verify at https://developers.google.com/webmaster-tools/limits): ~2,000 inspections/day and ~600/min per property. The `siteUrl` must exactly match a property you own, in its native form.

```python
# pip install google-api-python-client google-auth
from google.oauth2 import service_account
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]
SITE_URL = "sc-domain:example.com"        # Domain property; URL-prefix → "https://example.com/"

# Service account must be added as a user on the property in GSC Settings → Users and permissions.
creds = service_account.Credentials.from_service_account_file(
    "service-account.json", scopes=SCOPES
)
service = build("searchconsole", "v1", credentials=creds, cache_discovery=False)

def inspect(url: str) -> dict:
    body = {"inspectionUrl": url, "siteUrl": SITE_URL}
    res = service.urlInspection().index().inspect(body=body).execute()
    r = res["inspectionResult"]["indexStatusResult"]
    return {
        "verdict": r.get("verdict"),                     # PASS / NEUTRAL / FAIL
        "coverage": r.get("coverageState"),              # e.g. "Submitted and indexed"
        "user_canonical": r.get("userCanonical"),
        "google_canonical": r.get("googleCanonical"),    # differs => Google overrode you
        "robots": r.get("robotsTxtState"),               # ALLOWED / DISALLOWED
        "last_crawl": r.get("lastCrawlTime"),
    }

print(inspect("https://example.com/page"))
```

> Use OAuth user credentials (`google-auth-oauthlib`, `InstalledAppFlow`) instead of a service account if you can't add a service account to the property; the scope and API calls are identical.

### 7. Search Analytics API & BigQuery Bulk Export

The UI caps every Performance table at **1,000 rows** per view and aggregates away long-tail queries. To get the full dataset, use the **Search Analytics API** or the **Bulk Data Export to BigQuery**.

**Search Analytics API** (`searchanalytics.query`) — same `webmasters.readonly` scope and service object as §6. Key constraints:
- Returns up to **25,000 rows per request**; page with `startRow` (multiples of 25,000) until you get fewer than 25,000 back.
- Same **16-month** retention window as the UI; request `startDate`/`endDate` in `YYYY-MM-DD`.
- `dimensions` can combine `query`, `page`, `country`, `device`, `searchAppearance`, `date`. **Query data is anonymized**: rare queries are dropped for privacy, so summed clicks/impressions will be *lower* than the totals row — expected, not a bug.
- `type` selects the surface: `web` (default), `image`, `video`, `news`, `discover`, `googleNews`. Discover/News have no `query` dimension.
- `dataState: "all"` includes the most recent (still-incomplete) days; default `"final"` excludes them. Don't compare a "fresh" pull against a "final" one.

```python
# reuse `service` and SITE_URL from the §6 snippet
def export_queries(start: str, end: str) -> list[dict]:
    rows, start_row = [], 0
    while True:
        body = {
            "startDate": start, "endDate": end,
            "dimensions": ["query", "page"],
            "type": "web", "dataState": "final",
            "rowLimit": 25000, "startRow": start_row,
        }
        resp = service.searchanalytics().query(siteUrl=SITE_URL, body=body).execute()
        batch = resp.get("rows", [])
        rows += batch
        if len(batch) < 25000:
            return rows           # last page
        start_row += 25000        # next page

data = export_queries("2026-01-01", "2026-06-01")
print(len(data), "rows")          # far beyond the UI's 1,000-row cap
```

**Bulk Data Export → BigQuery** (the enterprise path for sites that blow past 25k rows/day or want unsampled history). Configure in **GSC → Settings → Bulk data export**: pick a Google Cloud project, grant the GSC export service account `BigQuery Job User` + `BigQuery Data Editor`, and GSC writes a daily dump into a `searchconsole` dataset. Tables you get:
- `searchdata_site_impression` — aggregated by property (one row per query/date, no URL).
- `searchdata_url_impression` — aggregated by URL (query × page × date); this is where the long tail lives.
- `exportLog` — which dates have landed (export is daily, ~2-day lag; backfill is not retroactive — you only get data from the day you enable it forward).

Query it with standard SQL — no row caps, full history from enablement:
```sql
-- top pages by clicks, last 28 days, from the URL-level export
SELECT url, SUM(clicks) AS clicks, SUM(impressions) AS impressions,
       SAFE_DIVIDE(SUM(clicks), SUM(impressions)) AS ctr
FROM `your-project.searchconsole.searchdata_url_impression`
WHERE data_date >= DATE_SUB(CURRENT_DATE(), INTERVAL 28 DAY)
GROUP BY url
ORDER BY clicks DESC
LIMIT 100;
```

> BigQuery storage/query is billed by Google Cloud, not GSC. Partition-prune on `data_date` (the tables are date-partitioned) to keep scan costs down. Note the same anonymized-query caveat applies — `is_anonymized_query = TRUE` rows have a null `query`.

### 8. Structured Data & Rich Results

GSC surfaces structured-data issues as per-type **Enhancement reports** that appear only when Google detects that markup on your site. Two important deprecations — do **not** add these to chase rich results:

- **HowTo** rich results were **deprecated and removed** (2023). The HowTo enhancement report is gone; `HowTo` markup no longer produces any special SERP treatment.
- **FAQ** rich results were **restricted to authoritative government/health sites** (Aug 2023) and are effectively unavailable for general sites by 2026. Don't expect FAQ accordions in search from `FAQPage` markup. (You can still keep `FAQPage` markup for non-SERP machine understanding, but it won't earn a rich result.)

**Currently worth marking up** (eligible types, mid-2026 — confirm at https://developers.google.com/search/docs/appearance/structured-data/search-gallery):
- **Product / Merchant listings** — price, availability, `aggregateRating`; the path to free Shopping/product listings.
- **Review snippet** — only on supported entity types (Product, Recipe, Book, etc.); self-serving "reviews of your own business" on a LocalBusiness page are not eligible.
- **Breadcrumb** — almost always worth it; replaces the URL line in the SERP.
- **Article / NewsArticle** — eligibility for Top stories and rich presentation.
- **Organization** — logo, name, contact, `sameAs`; feeds the knowledge panel / entity understanding.
- **LocalBusiness** — NAP, hours, geo for local features.
- **Video** (`VideoObject`) — key moments, video thumbnails, Video tab.
- **Event, Recipe, JobPosting, Dataset, Q&A (forum), Profile/Discussion** — where they fit the content.

Beyond rich results, valid schema (especially `Organization`, `Article`, `Product`, `BreadcrumbList`) helps **machine/LLM understanding** of the page — increasingly relevant as AI surfaces summarize content.

**Validation workflow:**
1. Test markup with the **Rich Results Test** (https://search.google.com/test/rich-results) — it shows *eligibility*, which the generic Schema.org validator does not.
2. Fix errors in the GSC enhancement report for that type.
3. Click **Validate Fix**; GSC re-crawls and moves the issue Started → Passed.

**Common schema errors:**
- Missing required fields (e.g. `Product` `offers` without `price`/`priceCurrency`; `aggregateRating` without `ratingValue`/`reviewCount`).
- Invalid dates — use ISO 8601 (`2026-06-07` or full `2026-06-07T09:00:00+02:00`).
- Markup describing content not visible on the page (against Google's policy → can trigger a structured-data manual action).
- Structured-data URL not matching the page's canonical.

### 9. Search Appearance Optimization

There is no single title formula. Write to the **dominant query intent** for the page, keep titles **unique** across the site, and lead with the most distinctive/relevant words. Brand placement is a judgment call: lead with the brand only for branded/navigational queries; otherwise put it at the end. Google frequently **rewrites** titles (using H1s, anchor text, etc.) — chasing a rigid pattern is wasted effort if Google replaces it. Check the live SERP to see what Google actually displays before "fixing" a title.

**Practical title/description guidance:**
- Front-load the term users actually search; avoid boilerplate prefixes/suffixes that get truncated or stripped.
- Watch truncation: titles render ~50-60 chars (pixel-based, not a hard char count); descriptions ~120-160 chars. Test in the Rich Results Test or a SERP-preview tool rather than counting characters.
- Make meta descriptions genuinely descriptive of the page — Google rewrites ~60%+ of them, so treat them as a *suggested* snippet, not a guaranteed one.
- Don't mass-rewrite titles to a template across a whole site; you risk replacing well-performing ones. Change titles where data shows a problem.

**Test changes:**
1. Identify pages with CTR below benchmark **and** no AI Overview eating the clicks (see §3).
2. Rewrite title + description for one cohort.
3. Track CTR change over 2-4 weeks in GSC (compare to the same pages' prior period, not the sitewide average).

## Weekly Audit Checklist

- [ ] Check index coverage for new errors
- [ ] Review performance trends (7d vs previous 7d)
- [ ] Monitor Core Web Vitals for regressions
- [ ] Check sitemap processing status
- [ ] Review manual actions (should always be empty)
- [ ] Check security issues
- [ ] Flag pages losing >20% impressions week-over-week
