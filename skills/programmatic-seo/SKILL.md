---
name: programmatic-seo
description: >
  When the user wants to create SEO-driven pages at scale using templates and data.
  Also use when the user mentions "programmatic SEO," "template pages," "pages at scale,"
  "directory pages," "location pages," "[keyword] + [city] pages," "comparison pages,"
  "integration pages," or "building many pages for SEO."
  For auditing existing SEO issues, see seo-audit.
version: 2.0.0
---

# Programmatic SEO — Build Thousands of High-Quality Pages at Scale

## Core Philosophy

Programmatic SEO is NOT "spin 10,000 thin pages and pray." It's building genuinely useful pages where **the combination of data creates unique value**. Every page must answer a question someone is actually asking.

**The Golden Rule:** If you removed the template chrome and just looked at the data, would the page still be useful? If not, don't build it.

---

## 1. Page Pattern Playbook

### 1.1 Location Pages — "[Service] in [City]"

**When to use:** Local services, marketplaces, delivery, real estate, jobs.

**Data you need per location:**
- Population, demographics, cost of living
- Local competitors / providers
- Geo-specific stats (median home price, avg salary, weather)
- Real reviews or testimonials from that area
- Local regulations or requirements

**URL structure:**
```
/plumbers/austin-tx
/plumbers/austin-tx/drain-cleaning
```

**Quality signals to include:**
- Map embed or service area polygon
- Local phone number or office address
- Area-specific pricing ("Average drain cleaning in Austin: $150–$280")
- Nearby areas linked ("Also serving: Round Rock, Cedar Park, Georgetown")

**Next.js implementation:**

```tsx
// app/[service]/[location]/page.tsx
import { notFound } from 'next/navigation';
import { getLocationData, getServiceData } from '@/lib/data';
import { generateLocationSchema } from '@/lib/schema';

interface Props {
  params: { service: string; location: string };
}

export async function generateStaticParams() {
  const combos = await getServiceLocationCombos();
  return combos.map(({ service, location }) => ({
    service: service.slug,
    location: location.slug,
  }));
}

export async function generateMetadata({ params }: Props) {
  const location = await getLocationData(params.location);
  const service = await getServiceData(params.service);
  if (!location || !service) return {};

  return {
    title: `${service.name} in ${location.city}, ${location.state} — Top ${location.providerCount}+ Providers`,
    description: `Find trusted ${service.name.toLowerCase()} in ${location.city}. Compare ${location.providerCount} local pros, read ${location.reviewCount} reviews, and get free quotes.`,
    alternates: {
      canonical: `/${params.service}/${params.location}`,
    },
  };
}

export default async function LocationPage({ params }: Props) {
  const location = await getLocationData(params.location);
  const service = await getServiceData(params.service);
  if (!location || !service) notFound();

  const providers = await getProviders(service.id, location.id);
  const stats = await getLocalStats(service.id, location.id);
  const faqs = generateLocalFAQs(service, location, stats);
  const nearbyLocations = await getNearbyLocations(location.id, service.id);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateLocationSchema(service, location, providers, faqs)),
        }}
      />

      <h1>{service.name} in {location.city}, {location.state}</h1>

      {/* Unique local context — NOT just the template */}
      <LocalStatsBar stats={stats} city={location.city} />

      {/* Provider listings with real data */}
      <ProviderGrid providers={providers} />

      {/* Area-specific pricing data */}
      <PricingTable service={service} location={location} stats={stats} />

      {/* Genuine FAQ with local answers */}
      <FAQSection faqs={faqs} />

      {/* Internal linking to nearby areas */}
      <NearbyAreas locations={nearbyLocations} service={service} />

      {/* Internal linking to related services */}
      <RelatedServices location={location} currentService={service} />
    </>
  );
}
```

### 1.2 Comparison Pages — "[Product A] vs [Product B]"

**When to use:** SaaS directories, review sites, marketplaces.

**URL structure:**
```
/compare/notion-vs-coda
/compare/slack-vs-teams-vs-discord    (three-way)
```

**Critical: avoid thin comparisons.** Every comparison page needs:
- Feature-by-feature breakdown with actual data
- Pricing comparison (current, verified)
- Use-case recommendations ("Best for X: Product A. Best for Y: Product B.")
- Unique pros/cons per product
- User sentiment data (review aggregates, NPS if available)

```tsx
// app/compare/[slug]/page.tsx
export async function generateStaticParams() {
  const comparisons = await getPopularComparisons();
  // Only generate pages for combinations with search volume
  return comparisons
    .filter(c => c.monthlySearchVolume > 50)
    .map(c => ({ slug: c.slug }));
}

// Generate bidirectional — "A vs B" and "B vs A" both resolve
// Use canonical to pick winner based on search volume
export async function generateMetadata({ params }: Props) {
  const comparison = await getComparison(params.slug);
  const canonical = comparison.searchVolume.aVsB > comparison.searchVolume.bVsA
    ? `${comparison.productA.slug}-vs-${comparison.productB.slug}`
    : `${comparison.productB.slug}-vs-${comparison.productA.slug}`;

  return {
    title: `${comparison.productA.name} vs ${comparison.productB.name} (${new Date().getFullYear()}) — Features, Pricing, Verdict`,
    alternates: { canonical: `/compare/${canonical}` },
  };
}
```

### 1.3 Integration Pages — "[Your Product] + [Integration]"

**When to use:** SaaS products with integrations, API platforms, automation tools.

**URL structure:**
```
/integrations/salesforce
/integrations/salesforce/setup-guide
```

**Unique value per page:**
- What specific data syncs between products
- Step-by-step setup with screenshots
- Use-case examples ("When a deal closes in Salesforce, automatically create an invoice in [Your Product]")
- Limitations and workarounds
- Pricing impact (does this integration require a specific plan?)

### 1.4 "X for Y" Pages — "[Tool/Concept] for [Audience]"

**When to use:** Products serving multiple verticals or personas.

**URL structure:**
```
/solutions/project-management-for-agencies
/solutions/crm-for-real-estate
```

**Each page needs:**
- Industry-specific pain points (not generic)
- Tailored feature highlights (same features, different framing)
- Social proof from that vertical (logos, quotes, case studies)
- Industry-specific terminology and workflows
- Compliance or regulatory callouts relevant to that vertical

### 1.5 Directory / Listing Pages

**URL structure:**
```
/tools/email-marketing              (category)
/tools/email-marketing/mailchimp    (individual listing)
```

**Aggregation pages (category level) must include:**
- Curated top picks with brief rationale
- Filterable/sortable table or grid
- Quick comparison of top 3–5
- Last-updated date (freshness signal)

---

## 2. Data Source Strategies

### 2.1 APIs (Best for Fresh Data)

```typescript
// lib/data-sources/api.ts
import pThrottle from 'p-throttle';

// Always throttle API calls during build
const throttle = pThrottle({ limit: 5, interval: 1000 });

const fetchWithRetry = throttle(async (url: string, retries = 3): Promise<any> => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${process.env.API_KEY}` },
        next: { revalidate: 86400 }, // ISR: rebuild daily
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    } catch (e) {
      if (attempt === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 2 ** attempt * 1000));
    }
  }
});

// Cache API results to avoid hammering during development
import { unstable_cache } from 'next/cache';

export const getProductData = unstable_cache(
  async (productSlug: string) => {
    const data = await fetchWithRetry(`https://api.example.com/products/${productSlug}`);
    return transformProductData(data);
  },
  ['product-data'],
  { revalidate: 86400, tags: ['products'] }
);
```

### 2.2 Database (Best for Scale + Control)

```typescript
// lib/data-sources/db.ts
import { prisma } from '@/lib/prisma';

export async function getLocationData(slug: string) {
  return prisma.location.findUnique({
    where: { slug },
    include: {
      stats: true,
      providers: { where: { active: true }, orderBy: { rating: 'desc' }, take: 20 },
      nearbyLocations: { take: 8 },
    },
  });
}

// For generateStaticParams — paginate to avoid memory issues
export async function* getAllLocationSlugs() {
  let cursor: string | undefined;
  while (true) {
    const batch = await prisma.location.findMany({
      select: { slug: true },
      take: 1000,
      ...(cursor ? { skip: 1, cursor: { slug: cursor } } : {}),
      orderBy: { slug: 'asc' },
    });
    if (batch.length === 0) break;
    for (const item of batch) yield item.slug;
    cursor = batch[batch.length - 1].slug;
  }
}
```

### 2.3 Scraping + Enrichment Pipeline

```typescript
// scripts/enrich-data.ts
// Run as a scheduled job (cron), NOT at build time

import { chromium } from 'playwright';
import { prisma } from '@/lib/prisma';

async function enrichProductData() {
  const browser = await chromium.launch();
  const products = await prisma.product.findMany({
    where: {
      OR: [
        { lastEnriched: null },
        { lastEnriched: { lt: new Date(Date.now() - 7 * 86400000) } },
      ],
    },
    take: 100,
  });

  for (const product of products) {
    try {
      const page = await browser.newPage();
      await page.goto(product.pricingUrl);
      const pricing = await extractPricing(page);

      await prisma.product.update({
        where: { id: product.id },
        data: { pricing, lastEnriched: new Date() },
      });
    } catch (e) {
      console.error(`Failed to enrich ${product.name}:`, e);
    }
  }

  await browser.close();
}
```

### 2.4 CSV / Spreadsheet (Quick Start)

Good for prototyping. Use a CMS or database for production.

```typescript
// lib/data-sources/csv.ts
import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import path from 'path';

const dataDir = path.join(process.cwd(), 'data');

export function loadLocations() {
  const raw = readFileSync(path.join(dataDir, 'locations.csv'), 'utf-8');
  return parse(raw, { columns: true, cast: true }) as Location[];
}
```

---

## 3. URL Structure Best Practices

### Rules

1. **Flat over deep.** `/plumbers/austin-tx` beats `/services/home/plumbing/us/texas/austin`.
2. **Slugs, not IDs.** `/compare/notion-vs-coda` not `/compare/12345`.
3. **Consistent separators.** Hyphens only. No underscores, no camelCase.
4. **Include geo qualifiers.** `austin-tx` not just `austin` (disambiguation).
5. **Lowercase everything.** Redirect uppercase variants.
6. **Trailing slash: pick one.** Enforce via middleware and redirect the other.

### Middleware for URL Normalization

```typescript
// middleware.ts (Next.js)
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Force lowercase
  if (pathname !== pathname.toLowerCase()) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url, 301);
  }

  // Remove trailing slash (except root)
  if (pathname.length > 1 && pathname.endsWith('/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.slice(0, -1);
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}
```

---

## 4. Canonical Strategy

### Decision Matrix

| Scenario | Canonical |
|----------|-----------|
| "A vs B" and "B vs A" exist | Point both to higher search volume variant |
| Location + service page | Self-referencing canonical |
| Paginated listings | `rel=canonical` to page 1, OR self-referencing + `rel=prev/next` |
| Filtered views (`/tools?category=email`) | Canonical to unfiltered `/tools` unless filtered URL has its own search intent |
| HTTP vs HTTPS | Always HTTPS |
| www vs non-www | Pick one, redirect the other, canonical to winner |
| Duplicate content across locales | Use `hreflang`, self-referencing canonicals per locale |

### Implementation

```tsx
// Always set canonical in generateMetadata
export async function generateMetadata({ params }: Props) {
  return {
    alternates: {
      canonical: `https://example.com/${params.service}/${params.location}`,
    },
  };
}
```

---

## 5. Internal Linking at Scale

Internal linking is the #1 lever for programmatic SEO. Do it systematically.

### Link Architecture Patterns

```
Hub Page (/plumbers)
  ├── Location Pages (/plumbers/austin-tx)
  │     ├── links to nearby locations
  │     ├── links to sub-services (/plumbers/austin-tx/drain-cleaning)
  │     └── links back to hub
  ├── Location Pages (/plumbers/denver-co)
  └── ...
```

### Automatic "Related" Links

```typescript
// lib/internal-links.ts
export async function getRelatedPages(
  currentPage: { type: string; tags: string[]; locationId?: string; slug: string },
  limit = 6
) {
  // 1. Same type, overlapping tags (most relevant)
  const byTags = await prisma.page.findMany({
    where: {
      type: currentPage.type,
      tags: { hasSome: currentPage.tags },
      slug: { not: currentPage.slug },
    },
    orderBy: { traffic: 'desc' },
    take: limit,
  });

  if (byTags.length >= limit) return byTags;

  // 2. Nearby locations (for location pages)
  if (currentPage.locationId) {
    const nearby = await prisma.page.findMany({
      where: {
        type: currentPage.type,
        locationId: { in: await getNearbyLocationIds(currentPage.locationId) },
      },
      take: limit - byTags.length,
    });
    return [...byTags, ...nearby];
  }

  return byTags;
}
```

### Breadcrumbs (Every Page)

```tsx
function Breadcrumbs({ items }: { items: { label: string; href: string }[] }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      item: `https://example.com${item.href}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <nav aria-label="Breadcrumb">
        <ol className="flex gap-2 text-sm text-gray-500">
          {items.map((item, i) => (
            <li key={item.href} className="flex items-center gap-2">
              {i > 0 && <span>/</span>}
              {i === items.length - 1 ? (
                <span aria-current="page">{item.label}</span>
              ) : (
                <a href={item.href}>{item.label}</a>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
```

---

## 6. Preventing Thin Content

Thin content is the #1 killer of pSEO projects. Google will deindex entire sections.

### Minimum Content Thresholds

```typescript
// lib/quality-gate.ts
interface QualityCheck {
  pass: boolean;
  reason?: string;
}

export function qualityGate(pageData: any, pageType: string): QualityCheck {
  const checks: Record<string, () => QualityCheck> = {
    location: () => {
      if (!pageData.providers || pageData.providers.length < 3)
        return { pass: false, reason: 'Fewer than 3 providers' };
      if (!pageData.stats?.avgPrice)
        return { pass: false, reason: 'No pricing data' };
      if (!pageData.description || pageData.description.length < 200)
        return { pass: false, reason: 'Description too short' };
      return { pass: true };
    },
    comparison: () => {
      if (!pageData.productA?.features || !pageData.productB?.features)
        return { pass: false, reason: 'Missing feature data' };
      if (!pageData.productA?.pricing || !pageData.productB?.pricing)
        return { pass: false, reason: 'Missing pricing data' };
      const uniqueContent = estimateUniqueContentLength(pageData);
      if (uniqueContent < 500)
        return { pass: false, reason: 'Insufficient unique content' };
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
3. **Temporal data:** "Prices rose 12% since last year" / "Updated March 2026"
4. **Cross-references:** "Compared to Denver, Austin has 2x more licensed plumbers per capita"
5. **User-generated:** Reviews, Q&A, community contributions
6. **AI-generated summaries:** Use LLMs to synthesize unique descriptions from structured data — but always fact-check against the source data

---

## 7. Index Management

### robots.txt

```txt
User-agent: *
Allow: /

# Block filtered/sorted variants
Disallow: /*?sort=
Disallow: /*?filter=
Disallow: /*?page=

# Block low-quality sections
Disallow: /drafts/
Disallow: /preview/

Sitemap: https://example.com/sitemap-index.xml
```

### Sitemap Strategy for Large Sites

Don't put 100k URLs in one sitemap. Split by type.

```typescript
// app/sitemap-index.xml/route.ts
export async function GET() {
  const pageTypes = ['locations', 'comparisons', 'integrations', 'tools'];
  const sitemaps: string[] = [];

  for (const type of pageTypes) {
    const count = await getPageCount(type);
    const chunks = Math.ceil(count / 10000);
    for (let i = 0; i < chunks; i++) {
      sitemaps.push(`https://example.com/sitemaps/${type}-${i}.xml`);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${sitemaps.map(url => `<sitemap><loc>${url}</loc></sitemap>`).join('\n  ')}
</sitemapindex>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}

// app/sitemaps/[type]-[chunk].xml/route.ts
export async function GET(_: Request, { params }: { params: { type: string; chunk: string } }) {
  const chunk = parseInt(params.chunk);
  const pages = await getPagesByType(params.type, { skip: chunk * 10000, take: 10000 });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${pages.map(p => `<url>
    <loc>https://example.com${p.path}</loc>
    <lastmod>${p.updatedAt.toISOString()}</lastmod>
    <changefreq>${p.changefreq ?? 'weekly'}</changefreq>
  </url>`).join('\n  ')}
</urlset>`;

  return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
}
```

### Noindex Pages That Don't Pass Quality Gates

```tsx
export async function generateMetadata({ params }: Props) {
  const data = await getPageData(params.slug);
  const quality = qualityGate(data, 'location');

  return {
    ...(quality.pass ? {} : { robots: { index: false, follow: true } }),
  };
}
```

---

## 8. Astro Implementation (Static-First)

Astro is excellent for pSEO — static by default, fast builds, great for content sites.

```astro
---
// src/pages/[service]/[location].astro
import Layout from '@/layouts/Base.astro';
import { getLocationData, getServiceData, getAllCombos } from '@/lib/data';
import LocalStats from '@/components/LocalStats.astro';
import ProviderGrid from '@/components/ProviderGrid.astro';
import FAQSection from '@/components/FAQSection.astro';

export async function getStaticPaths() {
  const combos = await getAllCombos();
  return combos
    .filter(c => qualityGate(c, 'location').pass)
    .map(c => ({
      params: { service: c.serviceSlug, location: c.locationSlug },
      props: { serviceId: c.serviceId, locationId: c.locationId },
    }));
}

const { serviceId, locationId } = Astro.props;
const location = await getLocationData(locationId);
const service = await getServiceData(serviceId);
const providers = await getProviders(serviceId, locationId);
const stats = await getLocalStats(serviceId, locationId);
---

<Layout
  title={`${service.name} in ${location.city}, ${location.state}`}
  description={`Find ${service.name.toLowerCase()} in ${location.city}. ${location.providerCount}+ pros, ${location.reviewCount} reviews.`}
  canonical={`/${service.slug}/${location.slug}`}
>
  <h1>{service.name} in {location.city}, {location.state}</h1>
  <LocalStats stats={stats} city={location.city} />
  <ProviderGrid providers={providers} />
  <FAQSection service={service} location={location} stats={stats} />
</Layout>
```

---

## 9. Build & Deploy at Scale

### Incremental Static Regeneration (Next.js)

For 100k+ pages, don't rebuild everything on every deploy.

```typescript
// In your page — only pre-render high-traffic pages
export async function generateStaticParams() {
  const topPages = await getTopPages(1000);
  return topPages.map(p => ({ slug: p.slug }));
}

// dynamicParams = true (default) means other slugs render on-demand
export const revalidate = 86400; // Revalidate daily
```

### Build Performance Tips

1. **Parallelize data fetching** in `generateStaticParams`
2. **Cache API responses** to disk during build
3. **Use database connection pooling** (PgBouncer or similar)
4. **Chunk builds** — deploy in batches if build times exceed CI limits
5. **Use `dynamicParams: true`** + ISR instead of pre-rendering everything

---

## 10. Monitoring & Dashboards

### What to Track

| Metric | Tool | Alert Threshold |
|--------|------|-----------------|
| Indexed pages | Google Search Console | Drop >10% week-over-week |
| Avg position by page type | GSC | Decline >5 positions |
| Crawl budget usage | GSC / server logs | >50% 404s or soft 404s |
| Thin content pages | Custom crawler | Any page <300 words unique content |
| Broken internal links | Screaming Frog / custom | Any 404 internal links |
| Page load time (p95) | Core Web Vitals | LCP >2.5s |
| Organic traffic by template | GA4 + GSC | Drop >20% month-over-month |

### GSC API Monitoring Script

```typescript
// scripts/monitor-indexing.ts
import { google } from 'googleapis';

async function checkIndexingHealth() {
  const auth = new google.auth.GoogleAuth({
    keyFile: 'service-account.json',
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });

  const searchconsole = google.searchconsole({ version: 'v1', auth });

  const res = await searchconsole.searchanalytics.query({
    siteUrl: 'https://example.com',
    requestBody: {
      startDate: '2026-02-01',
      endDate: '2026-02-28',
      dimensions: ['page'],
      dimensionFilterGroups: [{
        filters: [{ dimension: 'page', operator: 'includingRegex', expression: '/plumbers/' }],
      }],
      rowLimit: 25000,
    },
  });

  const indexedCount = res.data.rows?.length ?? 0;
  console.log(`Indexed location pages: ${indexedCount}`);

  const expectedPages = await getExpectedPageCount('locations');
  const indexRatio = indexedCount / expectedPages;
  if (indexRatio < 0.7) {
    console.error(`Warning: Only ${(indexRatio * 100).toFixed(1)}% of location pages indexed!`);
  }
}
```

---

## 11. Schema Markup at Scale

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

## 12. Pre-Launch Checklist

### Data Quality
- [ ] Every page passes quality gate (minimum data thresholds met)
- [ ] No duplicate pages (check slugs for collisions)
- [ ] Data is current (enrichment pipeline ran within last 7 days)
- [ ] Spot-check 20 random pages manually for accuracy

### Technical SEO
- [ ] Every page has unique `<title>` and `<meta description>`
- [ ] Self-referencing canonical on every page
- [ ] Sitemap submitted and all URLs return 200
- [ ] robots.txt doesn't block template pages
- [ ] Breadcrumbs with schema on every page
- [ ] Internal links: every page reachable within 3 clicks from homepage
- [ ] No orphan pages (every page has at least 1 inbound internal link)
- [ ] URL redirects for any slug changes (301, not 302)

### Performance
- [ ] LCP < 2.5s on template pages
- [ ] CLS < 0.1
- [ ] Pages work without JavaScript (SSR/SSG)
- [ ] Images have width/height attributes and lazy loading

### Content Quality
- [ ] Each page has >300 words of unique content
- [ ] No boilerplate-only pages
- [ ] Headings are descriptive, not generic
- [ ] Last-updated dates shown where applicable

### Monitoring
- [ ] GSC property verified and sitemap submitted
- [ ] Indexing monitoring script running weekly
- [ ] Core Web Vitals monitoring active
- [ ] 404 monitoring for broken internal links
- [ ] Alerting set up for >10% index drop

---

## 13. Common Mistakes

1. **Building pages nobody searches for.** Validate demand with keyword research BEFORE building templates.

2. **Same template, zero unique data.** If the only difference between pages is the city name swapped in, that's thin content. Google will nuke it.

3. **Ignoring internal linking.** Pages with no inbound links don't get crawled.

4. **Generating all pages at once.** Start with 100. Validate they get indexed. Then scale to 1,000. Then 10,000.

5. **No freshness signals.** "Last updated" dates, recent reviews, current pricing — these signal pages are maintained.

6. **Blocking crawlers accidentally.** Triple-check robots.txt.

7. **No fallback for missing data.** If an API is down during build, do you generate empty pages? Always have quality gates.

---

## 14. Scaling Playbook

### Phase 1: Validate (100 pages)
- Build 1 template, 100 pages
- Submit to GSC, wait 2–4 weeks
- Track: index rate, impressions, click-through rate
- **Gate:** >70% indexed, some impressions → proceed

### Phase 2: Expand (1,000 pages)
- Refine template based on Phase 1 data
- Add 900 more pages
- Implement internal linking hub
- **Gate:** Consistent indexing, growing impressions → proceed

### Phase 3: Scale (10,000+ pages)
- Add new page types (comparisons, integrations)
- Build cross-linking between page types
- Set up automated data enrichment pipeline
- Implement ISR for freshness without full rebuilds

### Phase 4: Optimize
- A/B test title tags and meta descriptions
- Add schema markup variants
- Build topical authority with supporting blog content
- Monitor and prune underperforming pages
