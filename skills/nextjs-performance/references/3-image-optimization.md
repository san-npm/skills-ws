## Contents

- 3. Image Optimization
- Blur placeholders at build time
- Responsive art direction

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
