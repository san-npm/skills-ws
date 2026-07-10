---
name: nextjs-performance
description: "Next.js (App Router, v15/16) performance: Core Web Vitals, rendering/caching strategy, bundle analysis, images, fonts, edge middleware, and RUM-driven audits. Use when a Next.js app is slow, fails LCP/INP/CLS, has a bloated bundle, or you must pick SSG/ISR/SSR/streaming or migrate to Cache Components ('use cache')."
---

# Next.js Performance

Real performance optimization for Next.js App Router. Not "add lazy loading" — actual diagnosis workflows, rendering-strategy decisions, and production caching patterns.

**Version baseline (as of Jul 2026):** Next.js 16.x is current (16.3 shipped Jun 29, 2026; docs track 16.2.x); examples target Next.js 15/16. Where 15 and 16 diverge (image `priority`→`preload`, `minimumCacheTTL` default, `unstable_cache`→`'use cache'`, removed `NextRequest.geo`), both are called out. Verify versions/APIs at https://nextjs.org/docs and release notes at https://nextjs.org/blog. For SEO/metadata performance see the sibling `seo-geo` skill.

---

## 1. Core Web Vitals — What Actually Causes Problems

### LCP (Largest Contentful Paint) — Target: < 2.5s

**Top killers:**
1. Render-blocking CSS/JS in `<head>`
2. Slow TTFB (> 800ms means LCP can't hit 2.5s)
3. LCP image not preloaded (Next 16 `preload` / Next 15 `priority`)
4. Client-side data fetching delaying content

```tsx
// Fix 1: Preload the LCP hero image
import Image from 'next/image';

export function Hero() {
  return (
    <Image
      src="/hero.webp" alt="Hero" width={1200} height={600}
      // Next.js 16: `preload` injects <link rel="preload"> into <head> so the
      // browser fetches from the first HTML chunk. Do not combine it with
      // `loading` or `fetchPriority` (the docs list both under when NOT to use
      // `preload`; in most cases they recommend loading="eager" or
      // fetchPriority="high" instead). Next.js 15 uses `priority` (deprecated
      // in 16), same idea.
      preload
      sizes="100vw"   // Don't serve a 3840px source to a 390px phone
      quality={85}    // Good quality/size tradeoff for photos
    />
  );
}
// ONE LCP image per route. Preloading several images competes for bandwidth and
// can regress LCP. Confirm the real LCP element first (see §8, "Confirm the LCP element").

// Fix 2: Stream server components — don't block on slow data
import { Suspense } from 'react';

export default function Page() {
  return (
    <>
      <Hero />  {/* Renders immediately */}
      <Suspense fallback={<ProductsSkeleton />}>
        <Products />  {/* Streams when ready */}
      </Suspense>
    </>
  );
}
```

### INP (Interaction to Next Paint) — Target: < 200ms

**Top killers:**
1. Heavy event handlers blocking main thread
2. Hydration jank
3. Expensive React reconciliation on large trees

```tsx
// Fix 1: Defer heavy work with startTransition
import { useState, useTransition } from 'react';

function SearchFilter({ items }: { items: Item[] }) {
  const [query, setQuery] = useState('');
  const [filtered, setFiltered] = useState(items);
  const [isPending, startTransition] = useTransition();

  const handleSearch = (value: string) => {
    setQuery(value);  // Urgent: update input
    startTransition(() => {
      setFiltered(items.filter(i => i.name.includes(value)));  // Deferred
    });
  };

  return (
    <>
      <input value={query} onChange={e => handleSearch(e.target.value)} />
      <div style={{ opacity: isPending ? 0.7 : 1 }}>
        {filtered.map(item => <Item key={item.id} {...item} />)}
      </div>
    </>
  );
}

// Fix 2: Virtualize long lists
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(vi => (
          <div key={vi.key} style={{
            position: 'absolute', top: 0,
            transform: `translateY(${vi.start}px)`,
            height: `${vi.size}px`, width: '100%',
          }}>
            <Item {...items[vi.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

### CLS (Cumulative Layout Shift) — Target: < 0.1

```tsx
// Always set dimensions on images
<Image src="/product.jpg" width={400} height={300} alt="Product" />

// Reserve space for dynamic content
function AdBanner() {
  return (
    <div style={{ minHeight: '90px' }}>
      <Suspense fallback={<div style={{ height: '90px' }} />}>
        <Ad />
      </Suspense>
    </div>
  );
}

// Font: use next/font with size adjustment
import localFont from 'next/font/local';
const brand = localFont({
  src: './fonts/Brand.woff2',
  display: 'swap',
  adjustFontFallback: 'Arial',  // Matches metrics, prevents shift
});
```

---

## 2. Rendering Strategy Decision Matrix

| Strategy | TTFB | LCP | Freshness | Use When |
|----------|------|-----|-----------|----------|
| **SSG** | ~50ms | Excellent | Build-time | Marketing, docs, blog |
| **ISR** | ~50ms | Excellent | Seconds-hours | Product pages, listings |
| **SSR** | 200-1000ms | Good | Real-time | Dashboards, personalized |
| **Client** | Fast shell | Poor | Real-time | Admin panels, interactive |
| **Streaming** | ~100ms | Good | Real-time | Mix of fast + slow data |

### ISR in Practice

```tsx
// app/products/[slug]/page.tsx
export const revalidate = 60;  // Revalidate every 60s
// Note: segment configs (`revalidate`, `dynamic`, `fetchCache`, `dynamicParams`) are
// removed when `cacheComponents: true` is enabled (see §7); under Cache Components
// use 'use cache' + cacheLife instead.

export async function generateStaticParams() {
  const products = await db.product.findMany({
    orderBy: { views: 'desc' }, take: 1000, select: { slug: true },
  });
  return products.map(p => ({ slug: p.slug }));
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await db.product.findUnique({ where: { slug } });
  if (!product) notFound();
  return <ProductView product={product} />;
}
```

### On-Demand Revalidation

```tsx
// app/api/revalidate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-revalidation-token');
  if (token !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { path, tag } = await req.json();
  if (tag) revalidateTag(tag);
  else if (path) revalidatePath(path);

  return NextResponse.json({ revalidated: true, now: Date.now() });
}

// Tag your fetches:
async function getProduct(slug: string) {
  return fetch(`${API}/products/${slug}`, {
    next: { tags: [`product-${slug}`, 'products'], revalidate: 3600 },
  }).then(r => r.json());
}
// Invalidate: POST /api/revalidate { "tag": "product-cool-shoes" }
```

---

## 3. Image Optimization

```typescript
// next.config.ts  (Next.js 13.1+ supports TS config; .js/ESM also fine)
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // AVIF is usually smaller than WebP, but the gain varies a lot (photos
    // benefit most; flat illustrations/PNGs less so) and AVIF costs more CPU to
    // encode/decode. List AVIF first so the optimizer prefers it, WebP as fallback.
    // Measure transfer size on YOUR images (DevTools Network) before assuming a ratio.
    formats: ['image/avif', 'image/webp'],
    // Next.js 16 enforces a quality allowlist (default [75]); any quality={n}
    // you use must be listed here.
    qualities: [75, 85],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Floor for how long the OPTIMIZED variant is cached when the upstream sends
    // no/weak Cache-Control. Next.js 16 default is 14400 (4h); v15 default was 60s.
    // Do NOT hardcode a year for REMOTE images — the remote URL is the cache key,
    // not a content hash, so remote content can change yet you'd serve a stale,
    // year-old optimization. Let the origin's Cache-Control win, or use a modest
    // floor. Long immutable caching belongs on hashed /_next/static assets (see §7).
    minimumCacheTTL: 14400,
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.example.com', pathname: '/images/**' },
    ],
  },
};

export default nextConfig;
```

### Blur placeholders at build time

```typescript
// lib/image-utils.ts
import { getPlaiceholder } from 'plaiceholder';

export async function getBlurDataURL(src: string): Promise<string> {
  const buffer = await fetch(src).then(r => r.arrayBuffer());
  const { base64 } = await getPlaiceholder(Buffer.from(buffer), { size: 10 });
  return base64;
}

// Usage:
const blur = await getBlurDataURL(product.imageUrl);
<Image src={product.imageUrl} placeholder="blur" blurDataURL={blur} ... />
```

### Responsive art direction

```tsx
function HeroBanner() {
  return (
    <picture>
      <source media="(max-width: 768px)" srcSet="/hero-mobile.avif" type="image/avif" />
      <source media="(max-width: 768px)" srcSet="/hero-mobile.webp" type="image/webp" />
      <source srcSet="/hero-desktop.avif" type="image/avif" />
      {/* LCP candidate varies by viewport here, so per the docs use fetchPriority="high", not `preload` (Next 15: `priority`) */}
      <Image src="/hero-desktop.webp" alt="Hero" width={1920} height={800} fetchPriority="high" />
    </picture>
  );
}
```

---

## 4. Bundle Analysis & Tree Shaking

```bash
npm install -D @next/bundle-analyzer
```

```typescript
// next.config.ts (ESM/TS). For CommonJS next.config.js use require()/module.exports.
import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

const nextConfig: NextConfig = { /* ... */ };
export default withBundleAnalyzer(nextConfig);
```

```bash
ANALYZE=true npm run build   # opens treemaps for client + server bundles
```

### Dynamic imports

```tsx
// BAD: imports entire library for everyone
import { Chart } from 'chart.js/auto';

// GOOD: load only when needed
import dynamic from 'next/dynamic';
// Must live in a Client Component ('use client'): `ssr: false` throws in
// Server Components; move the dynamic() call into a client file.
const Chart = dynamic(() => import('@/components/chart'), {
  loading: () => <div className="h-[400px] animate-pulse bg-gray-100 rounded" />,
  ssr: false,
});
```

### Tree shaking traps

```tsx
// BAD: barrel import pulls everything
import { Button, Input } from '@/components/ui';

// GOOD: direct imports
import { Button } from '@/components/ui/button';

// BAD: full lodash (71KB)
import _ from 'lodash';

// GOOD: specific import (1KB)
import debounce from 'lodash/debounce';

// Heavy lib alternatives:
// moment (300KB) → dayjs (2KB) or date-fns
// axios (29KB) → native fetch
// uuid (12KB) → crypto.randomUUID()
// classnames (1KB) → clsx (228B)
```

---

## 5. Edge Functions & Middleware

```tsx
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { geolocation } from '@vercel/functions'; // npm i @vercel/functions

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Geo-routing. NOTE: `request.geo`/`request.ip` were REMOVED from core
  // Next.js in v15 — reading them now is undefined. Geo data is provider-supplied:
  //   - Vercel:      geolocation(request).country  (from @vercel/functions)
  //   - Cloudflare:  request.headers.get('cf-ipcountry')
  //   - Other CDNs:  a header like 'x-vercel-ip-country' / 'x-geo-country'
  // Self-hosted (node/standalone) gets NO geo unless your proxy injects a header.
  const country = geolocation(request).country ?? 'US';
  if (pathname === '/' && country === 'DE' && !request.cookies.has('geo-override')) {
    return NextResponse.redirect(new URL('/de', request.url));
  }

  // A/B testing at the edge — no client flicker
  if (pathname === '/pricing') {
    const bucket = request.cookies.get('ab-pricing')?.value
      ?? (Math.random() < 0.5 ? 'control' : 'variant');

    const res = NextResponse.rewrite(new URL(`/pricing/${bucket}`, request.url));
    if (!request.cookies.has('ab-pricing')) {
      res.cookies.set('ab-pricing', bucket, { maxAge: 60 * 60 * 24 * 30, httpOnly: true });
    }
    return res;
  }

  // Bot detection — serve pre-rendered for crawlers
  const ua = request.headers.get('user-agent') ?? '';
  if (/bot|crawler|spider|googlebot/i.test(ua) && pathname.startsWith('/app')) {
    return NextResponse.rewrite(new URL(`/seo${pathname}`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
```

### Edge API routes

```tsx
// app/api/edge-search/route.ts
export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q');
  if (!q) return NextResponse.json({ results: [] });

  const results = await fetch(`https://api.example.com/search?q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${process.env.API_KEY}` },
  }).then(r => r.json());

  return NextResponse.json(results, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
  });
}
```

---

## 6. Font Loading

```tsx
// app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google';
import localFont from 'next/font/local';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });
const mono = JetBrains_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-mono' });

const brand = localFont({
  src: [
    { path: './fonts/Brand-Regular.woff2', weight: '400' },
    { path: './fonts/Brand-Bold.woff2', weight: '700' },
  ],
  display: 'swap',
  variable: '--font-brand',
  adjustFontFallback: 'Arial',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} ${brand.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

```css
/* globals.css */
:root {
  --font-sans: var(--font-inter), system-ui, sans-serif;
  --font-mono: var(--font-mono), 'Courier New', monospace;
}
body { font-family: var(--font-sans); }
code { font-family: var(--font-mono); }
```

---

## 7. Caching Strategies

**The big shift (Next.js 16):** App Router caching is now opt-in via **Cache Components** and the **`'use cache'`** directive. With `cacheComponents: true`, all page/layout/route code runs at request time by default; you explicitly mark what to cache. `cacheLife`/`cacheTag` are now **stable** (no `unstable_` prefix). Prefer this on new Next.js 16 code; keep `unstable_cache` only for Next.js 15-and-earlier projects.

### Server-side caching — `'use cache'` (Next.js 16, preferred)

```tsx
// next.config.ts
import type { NextConfig } from 'next';
const nextConfig: NextConfig = { cacheComponents: true };
export default nextConfig;
```

```tsx
// Cache a data function. The compiler derives the cache key from the args.
import { cacheTag, cacheLife } from 'next/cache';

export async function getProducts(category: string) {
  'use cache';
  cacheTag('products', `category-${category}`); // invalidate via revalidateTag(...)
  cacheLife('minutes'); // preset (seconds|minutes|hours|days|weeks|max) OR { stale, revalidate, expire } in seconds
  return db.product.findMany({ where: { category }, orderBy: { createdAt: 'desc' } });
}

// Variants (Next.js 16):
//   'use cache'          → shared, persisted across deploys/instances
//   'use cache: remote'  → shared, cached at runtime in the remote/data cache
//   'use cache: private' → per-user (keyed by cookies/headers), never shared across users
```

### Server-side caching — `unstable_cache` (Next.js 15 and earlier)

```tsx
import { unstable_cache } from 'next/cache';

// Still works in 16 but is the legacy path; migrate to 'use cache' when you adopt
// cacheComponents. Args become part of the key; the second arg is an extra key prefix.
export const getProducts = unstable_cache(
  async (category: string) => {
    return db.product.findMany({ where: { category }, orderBy: { createdAt: 'desc' } });
  },
  ['products'],
  { revalidate: 300, tags: ['products', 'category'] }
);
```

> Invalidate either style from a Server Action or the `/api/revalidate` route above with `revalidateTag('products')` / `revalidatePath('/products')`.

### CDN headers

```tsx
// Public content
return NextResponse.json(data, {
  headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
});

// Personalized content
return NextResponse.json(data, {
  headers: { 'Cache-Control': 'private, no-store, max-age=0' },
});
```

### next.config headers (long-cache hashed assets)

```typescript
// next.config.ts (CommonJS next.config.js: `module.exports = { async headers() {...} }`)
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [
      // /_next/static/* is content-hashed → safe to cache immutably for a year.
      { source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      // Only mark /fonts immutable if the filenames are hashed/versioned.
      { source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
    ];
  },
};
export default nextConfig;
```

---

## 8. Performance Audit Workflow

### Step 1: Measure baseline + confirm the metrics, don't guess
```bash
npx @lhci/cli autorun --collect.url=https://your-site.com   # lab numbers
```
Then make each metric **measurable**, not vibes:
- **Confirm the LCP element** (lab ≠ what you assume): in DevTools → Performance, record a load and click the **LCP** marker in the Timings track — it highlights the actual element. Or in console: `new PerformanceObserver(l => l.getEntries().forEach(e => console.log(e.element, e.startTime))).observe({ type: 'largest-contentful-paint', buffered: true });`. Only THAT element should `preload`.
- **TTFB**: `curl -o /dev/null -s -w 'ttfb=%{time_starttransfer}s total=%{time_total}s\n' https://your-site.com`. If TTFB > ~800ms, LCP can't hit 2.5s — fix the server/render path (static/ISR, faster DB, edge) before touching the client.
- **Image transfer size**: DevTools → Network, filter Img, check the **Transferred** column and whether the served `Content-Type` is `image/avif`/`image/webp`. A 400×300 image shipping 800KB means a missing/oversized `sizes` or an unoptimized `<img>`.
- **JS execution time**: DevTools → Performance → Bottom-Up, group by script; or Lighthouse "Total Blocking Time" + "JS execution time" audits. This is what INP/TBT actually measure.

### Step 2: Bundle size
```bash
ANALYZE=true npm run build
# Triage in the treemap: any single package > 50KB gzip, duplicate copies of the same
# lib (multiple versions), and SERVER-only code leaking into a client bundle
# ("use client" file importing a server util / a DB driver).
```

### Step 3: Rendering strategy (read the build legend)
```bash
npm run build
# Per-route symbols (legend printed under the table):
#   ○ Static       /about              prerendered, no server work
#   ● SSG          /blog/[slug]        prerendered via generateStaticParams
#   ◐ Partial      /product/[id]       partial prerender: static shell + streamed dynamic
#   ƒ Dynamic      /dashboard          rendered per request
# Question every ƒ Dynamic route: can it be SSG/ISR, or kept static with the dynamic
# parts behind <Suspense>? With cacheComponents (Next 16) routes are dynamic by DEFAULT,
# so "static" now means you explicitly cached it ('use cache') — verify intent, not accidents.
```

### Step 4: Image audit
```bash
# Use ripgrep with an explicit path + glob (portable, fast). Plain grep -r without a
# path is brittle across shells/OSes.
rg '<img\b' -g '*.tsx' -g '*.jsx' .     # Raw <img> — should be next/image instead
rg 'preload|priority' -g '*.tsx' .      # Confirm the LCP image preloads (16) / has priority (15)
rg 'fill\b' -g '*.tsx' . | rg -v sizes  # `fill` images missing `sizes` → oversized downloads
```

### Step 5: Third-party scripts
```tsx
import Script from 'next/script';

// Analytics — after interactive
<Script src="https://www.googletagmanager.com/gtag/js" strategy="afterInteractive" />

// Chat widget — lazy
<Script src="https://widget.intercom.io/widget/xxx" strategy="lazyOnload" />

// NEVER use beforeInteractive unless absolutely required
```

### Step 6: Network waterfall
Open Chrome DevTools > Performance tab. Look for:
- Long chains of dependent requests
- Large JS bundles blocking interaction
- Layout shifts during load

### Step 7: Real-user monitoring (lab ≠ field — Core Web Vitals are scored on field data)
Lighthouse is lab. Google ranks on **field** (CrUX) data, so instrument production:

```tsx
// app/web-vitals.tsx  — Client Component
'use client';
import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    // metric: { name: 'LCP'|'INP'|'CLS'|'FCP'|'TTFB', value, rating, id, navigationType }
    navigator.sendBeacon('/api/vitals', JSON.stringify(metric)); // or your analytics
  });
  return null;
}
// Render <WebVitals /> once in app/layout.tsx. Vercel Analytics / Speed Insights does this for you.
```

Then close the loop:
- **Field (CrUX/PSI API):** query real p75 per route. `GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=<url>&key=$PSI_KEY` returns `loadingExperience.metrics` (CrUX p75). Or the CrUX API for origin/URL history. (Endpoints/keys as of Jun 2026 — verify at https://developer.chrome.com/docs/crux.)
- **CI budgets (Lighthouse CI):** fail the build when lab regresses. `lighthouserc.json`:
  ```json
  { "ci": { "assert": { "assertions": {
    "categories:performance": ["error", { "minScore": 0.9 }],
    "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
    "interaction-to-next-paint": ["error", { "maxNumericValue": 200 }],
    "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
    "total-blocking-time": ["warn", { "maxNumericValue": 200 }]
  } } } }
  ```
  Run `npx @lhci/cli autorun` in CI; gate merges on it.
- **Production regression thresholds:** alert when field **p75** crosses the "good" line — LCP > 2.5s, INP > 200ms, CLS > 0.1 (and "needs improvement"→"poor" at LCP 4s / INP 500ms / CLS 0.25). Page-level, not site-average, so one bad template doesn't hide behind good ones.

---

## 9. Production Checklist

```markdown
## Bundle
- [ ] ANALYZE=true build — no packages > 100KB
- [ ] Dynamic imports for charts, editors, maps
- [ ] No barrel imports from large libraries
- [ ] Date library is tree-shakeable or tiny

## Images
- [ ] All use next/image with AVIF+WebP enabled
- [ ] The LCP image preloads (Next 16 `preload` / Next 15 `priority`) — exactly one per route
- [ ] All have width/height (or `fill` + `sizes`)
- [ ] `sizes` set so phones don't download desktop-sized sources
- [ ] Blur placeholders for product images

## Rendering
- [ ] Marketing pages are static
- [ ] Content pages use ISR
- [ ] Only truly dynamic pages use SSR
- [ ] Streaming SSR with Suspense for mixed data

## Fonts
- [ ] next/font (self-hosted, no FOUT)
- [ ] display: 'swap' everywhere
- [ ] Max 2-3 font families
- [ ] adjustFontFallback for custom fonts

## Caching
- [ ] Hashed /_next/static: immutable, 1 year (NOT remote images — see §3)
- [ ] API: s-maxage + stale-while-revalidate
- [ ] Personalized: private, no-store (or `'use cache: private'`)
- [ ] Cache tags for granular invalidation
- [ ] Next 16: caching is opt-in via `'use cache'` + `cacheComponents` (migrated off `unstable_cache`)

## Third-Party
- [ ] All scripts use next/script
- [ ] No render-blocking third-party
- [ ] Chat on lazyOnload
- [ ] Analytics on afterInteractive

## Monitoring
- [ ] RUM tracking (Vercel Speed Insights or `useReportWebVitals`)
- [ ] Per-PAGE field p75 for LCP/INP/CLS (not just site average)
- [ ] Bundle size budget enforced in CI
- [ ] Lighthouse CI budgets gate merges (LCP ≤ 2500 / INP ≤ 200 / CLS ≤ 0.1)
- [ ] Field-data alerts when p75 crosses the "good" threshold
```
