---
name: content-strategy
description: "Plan content strategy for SaaS and software products. Topic clusters, content calendars, gap analysis, data-driven topic scoring, competitor content audits, content ROI frameworks, editorial workflows. Use when planning what content to create, building topic clusters, creating content calendars, analyzing content gaps, scoring topic ideas, or building a content pipeline."
---

# Content Strategy v2

## Workflow

### 1. Content Audit

Inventory existing content:
- URL, title, word count, publish date, last updated
- Organic traffic (from GA4/Search Console)
- Target keyword and current ranking
- Content type (blog, guide, landing page, case study)
- Quality score (1-5): accuracy, depth, freshness

Flag: thin content (<500 words), outdated (>12 months), cannibalized (multiple pages targeting same keyword).

### 2. Competitor Content Analysis

For each competitor:
1. Run `site:competitor.com` to estimate indexed page count
2. Identify their top-performing content (Ahrefs/SEMrush or manual research)
3. Map their content clusters and topic coverage
4. Find gaps: topics they cover that you don't
5. Find opportunities: topics neither of you covers well

### 3. Topic Scoring Matrix

Score each topic idea (1-5 on each, total out of 25):

| Factor | Weight | Description |
|--------|--------|-------------|
| Search Volume | 5 | Monthly search demand |
| Business Relevance | 5 | How close to your product/sale |
| Competition | 5 | Inverse of keyword difficulty |
| Expertise Match | 5 | Your team's ability to write authoritatively |
| Content Gap | 5 | Lack of good existing content online |

Prioritize topics scoring 18+ first.

### 4. Topic Cluster Design

Build pillar-cluster model:

```
Pillar Page: "Complete Guide to {Topic}" (3000+ words)
├── Cluster: "How to {subtopic 1}" (1500+ words)
├── Cluster: "{Topic} vs {Alternative}" (1500+ words)
├── Cluster: "Best {Topic} tools" (2000+ words)
├── Cluster: "{Topic} for {audience}" (1500+ words)
└── Cluster: "{Topic} examples" (1500+ words)
```

Rules:
- Every cluster page links to its pillar page
- Pillar page links to all cluster pages
- Cluster pages interlink where relevant
- One pillar per major topic area

### 5. Content Calendar

Build a 90-day calendar:
- Week 1-4: Foundation content (pillar pages, core landing pages)
- Week 5-8: Cluster content (supporting blog posts)
- Week 9-12: Amplification content (case studies, comparisons, guest posts)

Cadence: 2-4 pieces/week for growing sites, 1-2/week for maintenance.

Template in [references/content-frameworks.md](references/content-frameworks.md).

### 6. Content ROI Tracking

Track per piece:
- Production cost (time + money)
- Organic traffic after 90 days
- Leads/conversions attributed
- Revenue attributed (if measurable)
- Cost per lead from content

## References

- [references/content-frameworks.md](references/content-frameworks.md) — Pillar/cluster model, scoring matrix, calendar templates, editorial workflow
