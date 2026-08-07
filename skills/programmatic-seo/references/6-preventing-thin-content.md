## Contents

- 6. Preventing Thin Content
- Quality gates — measure unique value, not word count
- Content Enrichment Strategies

## 6. Preventing Thin Content

Thin content is the #1 killer of pSEO projects. Google will deindex entire sections.

### Quality gates — measure *unique value*, not word count

Google does **not** rank by word count, and a "300+ words" rule is trivially gamed by padding. Word/character length is at best a weak proxy. Gate on signals that actually correlate with usefulness, and treat length as one minor input among several:

| Signal | What it measures | Example gate |
|--------|------------------|--------------|
| **Unique data points** | How many distinct facts this page carries that a sibling page does NOT | ≥ 5 page-specific values (price, counts, named entities) |
| **Source coverage** | Real providers/items/competitors backing the page | ≥ 3 entities with non-placeholder data |
| **Entity completeness** | Required fields populated, no "N/A" filler | 0 critical fields missing |
| **Freshness age** | How stale the underlying data is | `lastEnriched` within 30 days |
| **Duplicate similarity** | Near-duplicate body vs. other pages of the same type | shingled/MinHash similarity < 0.8 |
| **Manual spot-check** | Human review of a random sample | 20 random pages/launch sign-off |

```typescript
// lib/quality-gate.ts
interface QualityCheck {
  pass: boolean;
  reason?: string;
}

const THIRTY_DAYS_MS = 30 * 86_400_000;

export function qualityGate(pageData: any, pageType: string): QualityCheck {
  // Generic gates that apply to every page type.
  if (pageData.lastEnriched && Date.now() - +new Date(pageData.lastEnriched) > THIRTY_DAYS_MS)
    return { pass: false, reason: 'Underlying data is stale (>30 days)' };
  // similarityScore is precomputed against same-type pages (MinHash/shingles, 0–1).
  if (typeof pageData.similarityScore === 'number' && pageData.similarityScore > 0.8)
    return { pass: false, reason: 'Near-duplicate of another page (>0.8 similarity)' };

  const checks: Record<string, () => QualityCheck> = {
    location: () => {
      if (!pageData.providers || pageData.providers.length < 3)
        return { pass: false, reason: 'Fewer than 3 real providers' };
      if (!pageData.stats?.avgPrice)
        return { pass: false, reason: 'No pricing data' };
      // Count page-SPECIFIC facts, not characters: anything that varies per location.
      if (countUniqueDataPoints(pageData) < 5)
        return { pass: false, reason: 'Too few location-specific data points' };
      return { pass: true };
    },
    comparison: () => {
      if (!pageData.productA?.features || !pageData.productB?.features)
        return { pass: false, reason: 'Missing feature data' };
      if (!pageData.productA?.pricing || !pageData.productB?.pricing)
        return { pass: false, reason: 'Missing pricing data' };
      // A real comparison needs differentiators, not just two spec sheets.
      if (countDistinguishingFacts(pageData.productA, pageData.productB) < 5)
        return { pass: false, reason: 'No meaningful differences surfaced' };
      return { pass: true };
    },
  };

  return checks[pageType]?.() ?? { pass: true };
}

// In generateStaticParams, filter out low-quality pages
export async function generateStaticParams() {
  const allPages = await getAllPageData();
  return allPages
    .filter(p => qualityGate(p, 'location').pass)
    .map(p => ({ slug: p.slug }));
}
```

### Content Enrichment Strategies

1. **Computed insights:** "Austin plumbers charge 23% less than the national average"
2. **Aggregated stats:** Review sentiment analysis, rating distributions
3. **Temporal data:** "Prices rose 12% since last year" / a real "Updated {month} {year}" derived from the data's `lastEnriched`, never a hardcoded or page-load date
4. **Cross-references:** "Compared to Denver, Austin has 2x more licensed plumbers per capita"
5. **User-generated:** Reviews, Q&A, community contributions
6. **AI-generated summaries:** Use LLMs to synthesize unique descriptions from structured data — but always fact-check against the source data

---
