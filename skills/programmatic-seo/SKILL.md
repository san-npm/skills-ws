---
name: programmatic-seo
description: "Build template-driven SEO pages at scale (Next.js/Astro) that survive Google's scaled-content-abuse and site-reputation-abuse policies: page patterns, data pipelines, canonical/index management, schema, indexing monitoring. Use when user mentions programmatic SEO, pSEO, or directory/location/comparison/integration pages at scale."
---

# Programmatic SEO — Build Thousands of High-Quality Pages at Scale

## Core Philosophy

Programmatic SEO is NOT "spin 10,000 thin pages and pray." It's building genuinely useful pages where **the combination of data creates unique value**. Every page must answer a question someone is actually asking.

**The Golden Rule:** If you removed the template chrome and just looked at the data, would the page still be useful? If not, don't build it.

### What Google actually enforces (as of Jun 2026)

pSEO is not banned — *low-value scaled content* is. Know the live policies, because they decide whether your project ships or gets deindexed. Verify current wording at the Search Central spam policies page (`developers.google.com/search/docs/essentials/spam-policies`):

- **Scaled content abuse** (March 2024 core/spam update, since folded into standing policy): "generating many pages... primarily to manipulate ranking and not help users." The trigger is *intent + lack of unique value*, not the method or the use of AI. AI-assisted generation is allowed; AI-assisted *thin spam at scale* is not.
- **Site reputation abuse** ("parasite SEO", enforced from May 2024, tightened since): hosting third-party content with little oversight to exploit a host's ranking signals. Relevant if you let partners/users publish templated pages on your domain — you own quality control.
- **Expired-domain abuse**: don't buy aged domains to fast-track a pSEO farm.
- **Helpful Content signals** are now baked into the core ranking system (not a separate update). "People-first content," demonstrated **E-E-A-T** (Experience, Expertise, Authoritativeness, Trust), and genuine first-hand data are the durable wins. Pure aggregation with no added value is fragile.

Practical read: every template must add information a user can't trivially get elsewhere (proprietary data, computed insight, real reviews, fresh pricing). "AI wrote unique-sounding paragraphs over the same three facts" is exactly what the scaled-content policy targets.

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

> **Next.js version note (App Router, Next 15+ → mid-2026).** Since Next 15, `params` and `searchParams` are **async** — they are `Promise`s you must `await`. The pre-15 synchronous shape (`params: { service: string }`) no longer type-checks. Examples below use the async form. On Next 14 these were synchronous; if you must support 14, drop the `Promise<>` wrapper and the `await`. A `Metadata` return type from `next` is also recommended for `generateMetadata`.

```tsx
// app/[service]/[location]/page.tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getLocationData, getServiceData } from '@/lib/data';
import { generateLocationSchema } from '@/lib/schema';

// params is async in Next 15+ — type it as a Promise and await it.
type Params = Promise<{ service: string; location: string }>;

// Pre-render only validated combos (see §6). Other slugs render on-demand
// because dynamicParams defaults to true; we noindex/404 invalid ones there.
export async function generateStaticParams() {
  const combos = await getServiceLocationCombos();
  return combos.map(({ service, location }) => ({
    service: service.slug,
    location: location.slug,
  }));
}

// On-demand rendering for slugs not in generateStaticParams, revalidated daily.
export const revalidate = 86400;

export async function generateMetadata(
  { params }: { params: Params },
): Promise<Metadata> {
  const { service: serviceSlug, location: locationSlug } = await params;
  const location = await getLocationData(locationSlug);
  const service = await getServiceData(serviceSlug);
  if (!location || !service) return {};

  return {
    title: `${service.name} in ${location.city}, ${location.state} — Top ${location.providerCount}+ Providers`,
    description: `Find trusted ${service.name.toLowerCase()} in ${location.city}. Compare ${location.providerCount} local pros, read ${location.reviewCount} reviews, and get free quotes.`,
    alternates: {
      canonical: `/${serviceSlug}/${locationSlug}`,
    },
  };
}

export default async function LocationPage({ params }: { params: Params }) {
  const { service: serviceSlug, location: locationSlug } = await params;
  const location = await getLocationData(locationSlug);
  const service = await getServiceData(serviceSlug);
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
import type { Metadata } from 'next';

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const comparisons = await getPopularComparisons();
  // Only generate pages for combinations with search volume
  return comparisons
    .filter(c => c.monthlySearchVolume > 50)
    .map(c => ({ slug: c.slug }));
}

// Generate bidirectional — "A vs B" and "B vs A" both resolve and stay
// crawlable; canonical consolidates ranking to the higher-volume variant.
export async function generateMetadata(
  { params }: { params: Params },
): Promise<Metadata> {
  const { slug } = await params;
  const comparison = await getComparison(slug);
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

// Cache API results to avoid hammering during build/dev.
// `unstable_cache` still ships in Next 15/16 (note the `unstable_` prefix) and is
// fine to use today. The forward-looking replacement is the `'use cache'`
// directive + cacheLife/cacheTag (see below). Pick ONE and be consistent.
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

**Modern alternative — `'use cache'` (Next 15.x stable / 16):** the new cache model is opt-in via the `cacheComponents` flag in `next.config.js` (this flag was named `dynamicIO` in earlier 15.x canaries — check your version). Inside a cached scope you set freshness with `cacheLife` and invalidation keys with `cacheTag`. Verify the directive's stability for your exact version at `nextjs.org/docs`.

```typescript
import { cacheLife, cacheTag } from 'next/cache';

export async function getProductData(productSlug: string) {
  'use cache';
  cacheLife('days');            // preset: seconds|minutes|hours|days|weeks|max, or { stale, revalidate }
  cacheTag(`product-${productSlug}`); // revalidateTag(`product-${slug}`) busts just this entry

  const data = await fetchWithRetry(`https://api.example.com/products/${productSlug}`);
  return transformProductData(data);
}
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

> **Scraping compliance checklist — do this before writing the scraper.** Scraping for *commercial republishing* (which pSEO is) carries legal and contractual risk; the naive "open page, grab pricing" loop is a liability. Treat this as the minimum bar:
> 1. **Prefer an official API or licensed feed.** Almost every "scrape pricing" task has an API, partner feed, or affiliate data export that is faster, cleaner, and contractually safe. Scrape only as a last resort.
> 2. **Honor `robots.txt`.** Fetch and parse it per origin; skip disallowed paths. Robots is not a law, but ignoring it is the first thing cited against you.
> 3. **Read the Terms of Service.** Many sites' ToS forbid scraping and especially *republishing* their data. Republishing facts you scraped can implicate copyright, database rights (EU `sui generis`), and unfair-competition claims. **Get legal review before commercial reuse**, and prefer attribution + linking back.
> 4. **Identify yourself.** Set a descriptive `User-Agent` with a contact URL (`MyBot/1.0 (+https://example.com/bot)`). No spoofing real browsers to evade blocks.
> 5. **Rate-limit per domain** and add jittered exponential backoff; back off hard on `429`/`503`. Never run unbounded concurrency against one host.
> 6. **Record provenance.** Store `sourceUrl` + `fetchedAt` for every scraped value so you can show "as of <date>", expire stale data, and audit disputes.
> 7. **Cache politely.** Re-fetch on a schedule (e.g. weekly), not on every build. Conditional requests (ETag/If-Modified-Since) save everyone bandwidth.

```typescript
// scripts/enrich-data.ts
// Run as a scheduled job (cron), NOT at build time. tsx scripts/enrich-data.ts

import { chromium, type Browser, type Page } from 'playwright';
import pThrottle from 'p-throttle';
import robotsParser from 'robots-parser';
import { prisma } from '@/lib/prisma';

const USER_AGENT =
  'MyCompanyEnrichBot/1.0 (+https://example.com/bot-info; bot@example.com)';

// Per-domain throttle: at most 1 request / 2s to any single host.
const throttlesByHost = new Map<string, ReturnType<typeof pThrottle>>();
function hostThrottle(host: string) {
  if (!throttlesByHost.has(host)) {
    throttlesByHost.set(host, pThrottle({ limit: 1, interval: 2000 }));
  }
  return throttlesByHost.get(host)!;
}

// Cache robots.txt per origin so we fetch it once.
const robotsByOrigin = new Map<string, Awaited<ReturnType<typeof loadRobots>>>();
async function loadRobots(origin: string) {
  const robotsUrl = `${origin}/robots.txt`;
  try {
    const res = await fetch(robotsUrl, { headers: { 'User-Agent': USER_AGENT } });
    const body = res.ok ? await res.text() : '';
    return robotsParser(robotsUrl, body);
  } catch {
    // Fail CLOSED on robots fetch error: if we can't confirm we're allowed, skip.
    return robotsParser(robotsUrl, 'User-agent: *\nDisallow: /');
  }
}
async function isAllowed(url: string) {
  const origin = new URL(url).origin;
  if (!robotsByOrigin.has(origin)) robotsByOrigin.set(origin, await loadRobots(origin));
  return robotsByOrigin.get(origin)!.isAllowed(url, USER_AGENT) ?? false;
}

async function withBackoff<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= retries) throw e;
      const wait = 2 ** attempt * 1000 + Math.random() * 500; // jittered backoff
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

async function enrichOne(browser: Browser, product: { id: string; name: string; pricingUrl: string }) {
  const url = product.pricingUrl;
  if (!(await isAllowed(url))) {
    console.warn(`robots.txt disallows ${url} — skipping ${product.name}`);
    return;
  }

  const host = new URL(url).host;
  await hostThrottle(host)(async () => {
    let page: Page | undefined;
    try {
      page = await browser.newPage({ userAgent: USER_AGENT });
      await withBackoff(() => page!.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 }));
      const pricing = await extractPricing(page);

      await prisma.product.update({
        where: { id: product.id },
        // Provenance: record WHERE and WHEN, so the page can say "as of <date>".
        data: { pricing, sourceUrl: url, lastEnriched: new Date() },
      });
    } catch (e) {
      console.error(`Failed to enrich ${product.name} (${url}):`, e);
    } finally {
      await page?.close(); // ALWAYS close — otherwise pages leak and the run OOMs.
    }
  })();
}

async function enrichProductData() {
  const browser = await chromium.launch();
  try {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { lastEnriched: null },
          { lastEnriched: { lt: new Date(Date.now() - 7 * 86_400_000) } }, // > 7 days old
        ],
      },
      take: 100,
    });

    // Sequential per host via throttle; products on different hosts still interleave.
    for (const product of products) await enrichOne(browser, product);
  } finally {
    await browser.close();
  }
}

enrichProductData().catch((e) => {
  console.error(e);
  process.exit(1);
});
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
| Paginated listings (page 2+) | **Self-referencing canonical** on each page; do NOT canonical page 2+ to page 1 (see note) |
| Filtered views (`/tools?category=email`) | Canonical to unfiltered `/tools` unless filtered URL has its own search intent |
| HTTP vs HTTPS | Always HTTPS |
| www vs non-www | Pick one, redirect the other, canonical to winner |
| Duplicate content across locales | Use `hreflang`, self-referencing canonicals per locale |

**Pagination — the `rel=prev/next` myth.** Google **stopped using `rel=prev/next` as an indexing signal years ago** (announced 2019) and does not use it today. Modern pagination guidance:

- Give every page a **self-referencing canonical** (`/tools/email-marketing?page=3` → itself). Canonicalizing page 2+ to page 1 hides the items that only appear deeper, so they never get discovered or indexed.
- Make pagination **crawlable with real `<a href>` links** — not buttons that only work with JS, and not infinite scroll with no underlying URLs.
- Give each paginated page a **distinct `<title>`/meta** (e.g. append "— Page 3") so they aren't flagged as duplicates.
- Only `noindex` **truly low-value** variants (e.g. arbitrary filter/sort permutations). Keep them `follow` so equity still flows.
- `rel=prev/next` is harmless if already present (other engines may use it), but don't build new work around it.

### Implementation

```tsx
// Always set canonical in generateMetadata. params is async in Next 15+.
export async function generateMetadata(
  { params }: { params: Promise<{ service: string; location: string }> },
) {
  const { service, location } = await params;
  return {
    alternates: {
      canonical: `https://example.com/${service}/${location}`,
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

## 7. Index Management

### robots.txt — block crawl *traps*, not your content

Critical distinction: **`robots.txt` `Disallow` blocks crawling, not indexing.** A disallowed URL can still get indexed (from links) — and because Google can't fetch it, it will **never see your `canonical` or `noindex` tag** on that URL. So:

- **Use `Disallow` only for genuine infinite crawl traps** (every `sort`/`filter` permutation, calendar pickers, session-id URLs) where you never want the crawler to spend budget.
- **Do NOT blanket-block pagination** (`?page=`). Page 2+ is how crawlers discover deeper items; blocking it strands that inventory. Instead keep paginated pages crawlable and let the on-page self-canonical/`noindex` do the work (see §4).
- **To keep something out of the index, use `noindex` (meta/header) and leave it crawlable** — the opposite of `Disallow`.

```txt
User-agent: *
Allow: /

# Block genuine crawl traps (combinatorial filter/sort URLs add no unique pages)
Disallow: /*?sort=
Disallow: /*?filter=
# NOTE: do NOT add `Disallow: /*?page=` — pagination must stay crawlable so
# deeper items get discovered. Control its indexing with on-page tags instead.

# Block non-public sections (these should ALSO send noindex if ever reachable)
Disallow: /drafts/
Disallow: /preview/

Sitemap: https://example.com/sitemap-index.xml
```

### Sitemap Strategy for Large Sites

A single sitemap file is capped at **50,000 URLs / 50 MB uncompressed** — split before you hit either. (Chunking at 10k as below keeps files small and fast to regenerate.) Next 15+ also ships a native `app/sitemap.ts` exporting `MetadataRoute.Sitemap`, plus `generateSitemaps()` for sharding — prefer that for typed, framework-managed sitemaps. The hand-rolled route handlers below give you full control and work on any framework; both are valid.

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
// Route Handler params are async in Next 15+ — await them.
export async function GET(
  _: Request,
  { params }: { params: Promise<{ type: string; chunk: string }> },
) {
  const { type, chunk: chunkStr } = await params;
  const chunk = parseInt(chunkStr);
  const pages = await getPagesByType(type, { skip: chunk * 10000, take: 10000 });

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
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPageData(slug);
  const quality = qualityGate(data, 'location');

  // Keep follow:true so internal-link equity still flows out of a thin page.
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
| Indexed pages | GSC → Indexing report / URL Inspection API | Drop >10% week-over-week |
| Pages submitted vs. indexed ratio | GSC Indexing report | <70% of submitted URLs indexed |
| Avg position by page type | GSC Search Analytics | Decline >5 positions |
| Crawl stats / soft 404s | GSC Crawl Stats + server logs | >50% 4xx/soft-404 in crawl |
| Thin / near-duplicate pages | Custom crawler | Quality-gate fail or similarity >0.8 (see §6) |
| Broken internal links | Screaming Frog / custom | Any internal 404 |
| Core Web Vitals (field) | CrUX / GSC | LCP >2.5s, INP >200ms, CLS >0.1 |
| Organic traffic by template | GA4 + GSC | Drop >20% month-over-month |

Note: **INP (Interaction to Next Paint) replaced FID as a Core Web Vital in March 2024** — track INP, not FID.

### GSC API Monitoring Script

Run this weekly (cron). Two things matter for correctness:

1. **Use a rolling window, never hardcoded dates.** GSC Search Analytics data lags ~2–3 days, so query "the 28 days ending 3 days ago" and compare it to the immediately prior 28 days — so the alert is *trend*, not an absolute one-off.
2. **Search Analytics ≠ index status.** A page only appears here once it has had an *impression*. It's a proxy for "indexed and ranking somewhere." For true index status, use the **URL Inspection API** (`urlInspection.index.inspect`, quota ~2,000/day) on a sample, or read the Indexing report in the GSC UI.

```typescript
// scripts/monitor-indexing.ts — run weekly via cron. tsx scripts/monitor-indexing.ts
import { google } from 'googleapis';

const SITE_URL = process.env.GSC_SITE_URL ?? 'https://example.com';
const DAY = 86_400_000;

// GSC data lags; offset the window end by `lagDays`.
function rollingWindow(endOffsetDays: number, lengthDays: number) {
  const end = new Date(Date.now() - endOffsetDays * DAY);
  const start = new Date(+end - (lengthDays - 1) * DAY);
  const iso = (d: Date) => d.toISOString().slice(0, 10); // YYYY-MM-DD
  return { startDate: iso(start), endDate: iso(end) };
}

async function queryPageCount(
  sc: ReturnType<typeof google.searchconsole>,
  window: { startDate: string; endDate: string },
  pathRegex: string,
) {
  const res = await sc.searchanalytics.query({
    siteUrl: SITE_URL,
    requestBody: {
      ...window,
      dimensions: ['page'],
      dimensionFilterGroups: [{
        filters: [{ dimension: 'page', operator: 'includingRegex', expression: pathRegex }],
      }],
      rowLimit: 25000, // paginate with startRow if a template exceeds 25k URLs
    },
  });
  return res.data.rows?.length ?? 0;
}

async function checkIndexingHealth() {
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GSC_KEY_FILE ?? 'service-account.json',
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  const sc = google.searchconsole({ version: 'v1', auth });

  // Templates to watch, keyed by URL regex.
  const templates: Record<string, string> = {
    locations: '/plumbers/',
    comparisons: '/compare/',
  };

  const current = rollingWindow(3, 28);   // 28 days ending 3 days ago
  const prior = rollingWindow(31, 28);    // the 28 days before that

  for (const [name, regex] of Object.entries(templates)) {
    const [nowCount, prevCount, expected] = await Promise.all([
      queryPageCount(sc, current, regex),
      queryPageCount(sc, prior, regex),
      getExpectedPageCount(name),
    ]);

    const indexRatio = expected ? nowCount / expected : 0;
    const wowDelta = prevCount ? (nowCount - prevCount) / prevCount : 0;

    console.log(
      `[${name}] ranking-visible: ${nowCount}/${expected} (${(indexRatio * 100).toFixed(1)}%), ` +
      `period-over-period: ${(wowDelta * 100).toFixed(1)}%`,
    );

    if (indexRatio < 0.7) console.error(`  ⚠ Only ${(indexRatio * 100).toFixed(1)}% of ${name} pages visible in search.`);
    if (wowDelta < -0.1)  console.error(`  ⚠ ${name} dropped ${(wowDelta * -100).toFixed(1)}% vs prior period.`);
  }
}

checkIndexingHealth().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

---

## 11. Schema Markup at Scale

**Valid syntax ≠ a rich result.** Schema.org markup parses fine for any type, but Google only *renders rich results* for specific types and reserves the right to show none. At pSEO scale, prioritize types that are still broadly eligible **and** reflect content visible on the page (markup must match on-page content or it's a structured-data spam violation):

| Schema type | Rich-result status (as of Jun 2026) | Use for |
|-------------|-------------------------------------|---------|
| `BreadcrumbList` | Broadly shown | Every page |
| `ItemList` / `Product` | Shown (Product needs price/availability) | Directory & listing pages |
| `LocalBusiness` | Shown for genuine businesses | Location/provider pages |
| `Review` / `AggregateRating` | Shown, but **only for content the page is genuinely about**; self-serving/site-wide ratings are ineligible | Provider/product pages with real reviews |
| `FAQPage` | **Sharply restricted since Aug 2023** — rich results now limited mainly to authoritative gov/health sites. For most sites it renders nothing | Keep only as on-page UX; do NOT add at scale expecting SERP real estate |
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

// NOTE: FAQPage rich results are heavily restricted (see table above). Only emit
// this if the Q&A is genuinely on-page; do not roll it out site-wide expecting
// SERP FAQ accordions — for most sites that real estate no longer exists, and
// marking up hidden/duplicated FAQs risks a structured-data spam action.
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
- [ ] robots.txt doesn't block template pages OR pagination (`?page=`)
- [ ] Structured data validates in Rich Results Test and matches on-page content
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
- [ ] Each page carries genuinely unique data (passes the §6 quality gates — unique facts, source coverage, low duplicate-similarity), not just padded word count
- [ ] No boilerplate-only pages (data swap ≠ unique value)
- [ ] Headings are descriptive, not generic
- [ ] Last-updated dates reflect real data freshness, not `new Date()` theater

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
