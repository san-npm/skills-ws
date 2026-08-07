## Contents

- 1. Core Web Vitals — What Actually Causes Problems
- LCP (Largest Contentful Paint) — Target: < 2.5s
- INP (Interaction to Next Paint) — Target: < 200ms
- CLS (Cumulative Layout Shift) — Target: < 0.1

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
