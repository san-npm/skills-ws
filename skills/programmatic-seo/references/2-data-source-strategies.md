## Contents

- 2. Data Source Strategies
- 2.1 APIs (Best for Fresh Data)
- 2.2 Database (Best for Scale + Control)
- 2.3 Scraping + Enrichment Pipeline
- 2.4 CSV / Spreadsheet (Quick Start)

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

**Modern alternative: `'use cache'` (stable in Next 16 via Cache Components; experimental behind a flag in 15.x).** The new cache model is opt-in via the `cacheComponents` flag in `next.config.js` (this flag was named `dynamicIO` in earlier 15.x canaries; check your version). Inside a cached scope you set freshness with `cacheLife` and invalidation keys with `cacheTag`. Verify the directive's stability for your exact version at `nextjs.org/docs`.

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
