## 11. Schema Markup at Scale

**Valid syntax ≠ a rich result.** Schema.org markup parses fine for any type, but Google only *renders rich results* for specific types and reserves the right to show none. At pSEO scale, prioritize types that are still broadly eligible **and** reflect content visible on the page (markup must match on-page content or it's a structured-data spam violation):

| Schema type | Rich-result status (as of Jun 2026) | Use for |
|-------------|-------------------------------------|---------|
| `BreadcrumbList` | Broadly shown | Every page |
| `ItemList` / `Product` | Shown (Product needs price/availability) | Directory & listing pages |
| `LocalBusiness` | Shown for genuine businesses | Location/provider pages |
| `Review` / `AggregateRating` | Shown, but **only for content the page is genuinely about**; self-serving/site-wide ratings are ineligible | Provider/product pages with real reviews |
| `FAQPage` | **Removed entirely: not shown in Google Search since May 7, 2026** (was gov/health only from Aug 2023; Google deleted the feature docs Jun 2026) | Keep only as on-page UX; do NOT add at scale expecting SERP real estate |
| `HowTo` | **Deprecated as a rich result** (rolled back, ~2023) | Don't rely on it |

Rule of thumb: ship `BreadcrumbList` + the page's primary type (`Product`/`LocalBusiness`/`ItemList`) everywhere; add `Review`/`AggregateRating` only where real, on-page reviews exist. Validate with the Rich Results Test (`search.google.com/test/rich-results`) and confirm current eligibility at `developers.google.com/search/docs/appearance/structured-data`. Never mark up ratings/reviews/FAQs that aren't actually visible to the user.

```typescript
// lib/schema.ts
export function generateLocalBusinessSchema(service: Service, location: Location, providers: Provider[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${service.name} in ${location.city}, ${location.state}`,
    numberOfItems: providers.length,
    itemListElement: providers.slice(0, 10).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'LocalBusiness',
        name: p.name,
        address: {
          '@type': 'PostalAddress',
          addressLocality: location.city,
          addressRegion: location.state,
        },
        aggregateRating: p.reviewCount > 0 ? {
          '@type': 'AggregateRating',
          ratingValue: p.avgRating,
          reviewCount: p.reviewCount,
        } : undefined,
        telephone: p.phone,
      },
    })),
  };
}

// NOTE: FAQPage rich results no longer exist in Google Search (removed May 7, 2026;
// see table above). Only emit this if the Q&A is genuinely on-page and you want it
// for other engines or AI answer surfaces; expect zero Google SERP real estate, and
// marking up hidden or duplicated FAQs still risks a structured-data spam action.
export function generateFAQSchema(faqs: FAQ[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
```

---
