---
name: nextjs-performance
description: "Next.js performance optimization: Core Web Vitals, rendering strategies, bundle analysis, caching, edge functions, and audit workflows."
---

# Next.js Performance

Real performance optimization for Next.js. Not "add lazy loading" — actual diagnosis workflows, rendering strategy decisions, and production caching patterns.

---

## 1. Core Web Vitals — What Actually Causes Problems

### LCP (Largest Contentful Paint) — Target: < 2.5s

**Top killers:**
1. Render-blocking CSS/JS in `<head>`
2. Slow TTFB (> 800ms means LCP can't hit 2.5s)
3. Hero image without `priority`
4. Client-side data fetching delaying content

```tsx
// Fix 1: Priority on hero image
import Image from 'next/image';

export function Hero() {
  return (
    <Image
      src="/hero.webp" alt="Hero" width={1200} height={600}
      priority        // fetchpriority="high" + preload
      sizes="100vw"   // Don't serve 3840px to mobile
      quality={85}    // Sweet spot for quality/size
    />
  );
}

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

export async function generateStaticParams() {
  const products = await db.product.findMany({
    orderBy: { views: 'desc' }, take: 1000, select: { slug: true },
  });
  return products.map(p => ({ slug: p.slug }));
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await db.product.findUnique({ where: { slug: params.slug } });
  if (!product) notFound();
  return <ProductView product={product} />;
}
```

### On-Demand Revalidation

```tsx
// app/api/revalidate/route.ts
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

```javascript
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],  // AVIF: 50% smaller than WebP
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000,  // 1 year — images are content-addressed
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.example.com', pathname: '/images/**' },
    ],
  },
};
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
      <Image src="/hero-desktop.webp" alt="Hero" width={1920} height={800} priority />
    </picture>
  );
}
```

---

## 4. Bundle Analysis & Tree Shaking

```bash
npm install -D @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
module.exports = withBundleAnalyzer(nextConfig);

ANALYZE=true npm run build
```

### Dynamic imports

```tsx
// BAD: imports entire library for everyone
import { Chart } from 'chart.js/auto';

// GOOD: load only when needed
import dynamic from 'next/dynamic';
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Geo-routing
  const country = request.geo?.country ?? 'US';
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

  const results = await fetch(`https://api.example.com/search?q=${q}`, {
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

### Server-side with cache tags

```tsx
import { unstable_cache } from 'next/cache';

export const getProducts = unstable_cache(
  async (category: string) => {
    return db.product.findMany({ where: { category }, orderBy: { createdAt: 'desc' } });
  },
  ['products'],
  { revalidate: 300, tags: ['products'] }
);
```

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

### next.config.js headers

```javascript
module.exports = {
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/fonts/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },
};
```

---

## 8. Performance Audit Workflow

### Step 1: Measure baseline
```bash
npm install -g @lhci/cli
lhci autorun --collect.url=https://your-site.com
```

### Step 2: Bundle size
```bash
ANALYZE=true npm run build
# Look for: packages > 50KB, duplicates, server code in client bundle
```

### Step 3: Rendering strategy
```bash
npm run build
# Check output:
# ○ Static    /about
# ƒ Dynamic   /dashboard
# ● SSG       /blog/[slug]
# Question every dynamic route — can it be ISR?
```

### Step 4: Image audit
```bash
grep -r "<img" --include="*.tsx" | grep -v "next/image"  # Find non-optimized images
grep -r "<Image" --include="*.tsx" | head -5             # Check first image has priority
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

---

## 9. Production Checklist

```markdown
## Bundle
- [ ] ANALYZE=true build — no packages > 100KB
- [ ] Dynamic imports for charts, editors, maps
- [ ] No barrel imports from large libraries
- [ ] Date library is tree-shakeable or tiny

## Images
- [ ] All use next/image with AVIF enabled
- [ ] Hero images have priority
- [ ] All have width/height
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
- [ ] Static assets: immutable, 1 year
- [ ] API: s-maxage + stale-while-revalidate
- [ ] Personalized: private, no-store
- [ ] Cache tags for granular invalidation

## Third-Party
- [ ] All scripts use next/script
- [ ] No render-blocking third-party
- [ ] Chat on lazyOnload
- [ ] Analytics on afterInteractive

## Monitoring
- [ ] RUM tracking (Vercel Analytics or web-vitals)
- [ ] Per-page Core Web Vitals
- [ ] Bundle size in CI
- [ ] Lighthouse CI in deploy pipeline
```
