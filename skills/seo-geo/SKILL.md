---
name: seo-geo
description: "SEO & GEO (Generative Engine Optimization) for websites. Optimize for AI search engines and traditional search."
---

# SEO & GEO Optimization v2

**GEO = Generative Engine Optimization** — AI engines cite sources, not rank pages. Being cited is the new #1.

## Workflow

### 1. Technical SEO Audit

Run the free audit script:
```bash
python3 scripts/seo_audit.py "https://example.com"
```

Manual quick checks:
```bash
curl -sL "URL" | grep -E "<title>|<meta name=\"description\"|application/ld\+json" | head -20
curl -s "URL/robots.txt"
curl -s "URL/sitemap.xml" | head -50
```

Ensure AI bots allowed in robots.txt: `Googlebot`, `Bingbot`, `PerplexityBot`, `ChatGPT-User`, `ClaudeBot`, `GPTBot`, `anthropic-ai`.

Full technical checklist (Core Web Vitals, crawl budget, mobile-first): references/technical-seo.md

### 2. Keyword Research

With DataForSEO API (`DATAFORSEO_LOGIN` + `DATAFORSEO_PASSWORD` env vars):
```bash
python3 scripts/keyword_research.py "keyword" --location 2840 --language en
python3 scripts/competitor_gap.py "yourdomain.com" "competitor.com"
python3 scripts/serp_analysis.py "target keyword"
```

Without API — use web search for volume/difficulty estimates.

Cluster by intent: informational → blog, transactional → landing pages, navigational → product pages. Full methodology: references/keyword-research.md

### 3. GEO Optimization

Apply **Princeton 9 GEO Methods** — best combo: **Fluency + Statistics**:

| Method | Boost | Action |
|--------|-------|--------|
| Cite Sources | +40% | Authoritative references with links |
| Statistics | +37% | Specific numbers and data points |
| Quotations | +30% | Expert quotes with attribution |
| Authoritative Tone | +25% | Confident expert language |
| Simplify | +20% | Plain language for complex topics |
| Technical Terms | +18% | Domain-specific vocabulary |
| Fluency | +15-30% | Readability and flow |
| ~~Keyword Stuffing~~ | **-10%** | **NEVER** |

Structure content for AI citation: answer-first format, clear H1>H2>H3, bullet/numbered lists, tables, short paragraphs (2-3 sentences), FAQ sections with schema.

Platform-specific strategies: references/geo-optimization.md

### 4. E-E-A-T Signals

- Author bios with credentials on every article
- Link to primary sources and studies
- Display trust signals (certifications, awards, reviews)
- Include first-hand experience and original data
- Visible last-updated timestamps
- Build topical authority through content clusters

Full guide: references/eeat-guide.md

### 5. Schema Markup (JSON-LD)

Generate structured data for every page type:
- `WebPage`/`Article` — content pages
- `FAQPage` — FAQ sections (+40% AI visibility)
- `HowTo` — tutorials and guides
- `Product` + `AggregateRating` — product pages
- `Organization`/`LocalBusiness` — about/contact pages
- `SoftwareApplication` — tools and apps
- `BreadcrumbList` — navigation
- `VideoObject` — video content
- `Review`/`AggregateRating` — review pages

Templates: references/schema-templates.md

Validate at: `https://search.google.com/test/rich-results?url={url}`

### 6. On-Page SEO

```html
<title>{Primary Keyword} — {Brand} | {Secondary}</title>
<meta name="description" content="{150-160 chars with keyword}">
<meta property="og:title" content="{Title}">
<meta property="og:description" content="{Description}">
<meta property="og:image" content="{1200x630 image URL}">
<meta name="twitter:card" content="summary_large_image">
```

Checklist:
- H1 contains primary keyword (one H1 per page)
- Images have descriptive alt text with keywords
- Internal links to related content (3-5 per page)
- External links use `rel="noopener noreferrer"`
- URL is short, descriptive, hyphenated
- Page loads under 3 seconds
- Mobile-friendly responsive design

### 7. International SEO

For multilingual sites, implement hreflang:
```html
<link rel="alternate" hreflang="en" href="https://example.com/en/" />
<link rel="alternate" hreflang="fr" href="https://example.com/fr/" />
<link rel="alternate" hreflang="x-default" href="https://example.com/" />
```

Full guide: references/international-seo.md

### 8. Security Audit

Scan competitor and referenced URLs with VirusTotal:
```bash
vt scan url "https://competitor.com"
vt url "https://competitor.com" --include=last_analysis_stats
```

Flag any URLs with detections > 0 in recommendations.

## References

- references/technical-seo.md — Core Web Vitals, crawlability, indexing
- references/geo-optimization.md — AI search strategies per platform
- references/schema-templates.md — JSON-LD for 10+ page types
- references/keyword-research.md — Clustering, intent mapping, gap analysis
- references/eeat-guide.md — E-E-A-T signals and implementation
- references/international-seo.md — hreflang, geo-targeting, multilingual
