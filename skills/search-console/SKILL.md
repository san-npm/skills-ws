---
name: search-console
description: "Google Search Console optimization. Index coverage, performance analysis, sitemap management, and search appearance debugging."
---

# Google Search Console

## Workflow

### 1. Property Setup

Verify ownership via DNS TXT record (most reliable):
```
google-site-verification=XXXXXXXXXXXXXXXX
```
Alternatives: HTML file upload, HTML meta tag, Google Analytics, Google Tag Manager.

**Add both versions:**
- `https://example.com` (URL prefix) — for specific path filtering
- `example.com` (Domain) — for comprehensive data including subdomains

### 2. Index Coverage Audit

Navigate to Pages → Indexing to review status:

| Status | Meaning | Action |
|--------|---------|--------|
| Valid | Indexed, no issues | Monitor |
| Valid with warnings | Indexed but has issues | Fix warnings |
| Excluded | Not indexed (intentional or not) | Review each reason |
| Error | Cannot index, wants to | Fix immediately |

**Common exclusion reasons and fixes:**

| Reason | Fix |
|--------|-----|
| Crawled - currently not indexed | Improve content quality, add internal links |
| Discovered - currently not indexed | Submit in sitemap, build backlinks, wait |
| Excluded by noindex tag | Remove noindex if page should be indexed |
| Alternate page with proper canonical | Expected for canonical dedup — verify canonical is correct |
| Blocked by robots.txt | Update robots.txt if page should be crawled |
| Duplicate without user-selected canonical | Set explicit canonical tag |
| Soft 404 | Add real content or return proper 404 status |

### 3. Performance Analysis

Key metrics: impressions, clicks, CTR, average position.

**Analysis by query cluster:**
1. Export performance data (Queries tab, 16 months max)
2. Group queries by intent/topic
3. Calculate cluster-level CTR vs expected CTR for position:

| Position | Expected CTR |
|----------|-------------|
| 1 | 25-35% |
| 2 | 12-18% |
| 3 | 8-12% |
| 4-5 | 5-8% |
| 6-10 | 2-5% |

**If actual CTR < expected:** Title/description needs optimization.
**If actual CTR > expected:** Strong snippet — protect this content.

**Quick wins — filter for:**
- Position 5-15 with high impressions → optimize to push into top 5
- High impressions, low CTR → rewrite title tags and meta descriptions
- Position 1-3, declining impressions → content freshness issue

### 4. Sitemap Management

Submit at Sitemaps → Add a new sitemap:
```
https://example.com/sitemap.xml
```

**Sitemap audit checklist:**
- [ ] All indexable pages included
- [ ] No noindex/canonicalized pages in sitemap
- [ ] `<lastmod>` dates are accurate (not auto-generated today's date)
- [ ] Response is HTTP 200 with valid XML
- [ ] Under 50,000 URLs per sitemap (use sitemap index for larger sites)
- [ ] Submitted in GSC AND referenced in robots.txt

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

Use URL Inspection tool to:
- Check if a specific URL is indexed
- See how Googlebot renders the page
- Request indexing for new/updated pages
- Debug canonical selection issues

**API access for bulk inspection:**
```python
from googleapiclient.discovery import build
service = build('searchconsole', 'v1', credentials=creds)
request = {
    'inspectionUrl': 'https://example.com/page',
    'siteUrl': 'https://example.com'
}
response = service.urlInspection().index().inspect(body=request).execute()
print(response['inspectionResult']['indexStatusResult']['coverageState'])
```

### 7. Rich Results Validation

Check Enhancements section for structured data issues:
- FAQ, How-to, Product, Review, Breadcrumb, Article, Event, LocalBusiness

**Validation workflow:**
1. Test with Rich Results Test (search.google.com/test/rich-results)
2. Fix schema errors shown in GSC
3. Validate fix — GSC will re-crawl and update status

**Common schema errors:**
- Missing required fields (e.g., `aggregateRating` without `reviewCount`)
- Invalid date formats (use ISO 8601: `2025-01-15`)
- Mismatched canonical and structured data URLs

### 8. Search Appearance Optimization

**Title tag formula:** `Primary Keyword — Benefit | Brand` (under 60 chars)
**Meta description:** Include primary keyword, CTA, value prop (under 155 chars)

**Test changes:**
1. Identify pages with CTR below position-expected benchmarks
2. Rewrite title + description
3. Track CTR change over 2-4 weeks in GSC

## Weekly Audit Checklist

- [ ] Check index coverage for new errors
- [ ] Review performance trends (7d vs previous 7d)
- [ ] Monitor Core Web Vitals for regressions
- [ ] Check sitemap processing status
- [ ] Review manual actions (should always be empty)
- [ ] Check security issues
- [ ] Flag pages losing >20% impressions week-over-week
