## Contents

- 7. Caching Strategies
- Server-side caching — 'use cache' (Next.js 16, preferred)
- Server-side caching — unstablecache (Next.js 15 and earlier)
- CDN headers
- next.config headers (long-cache hashed assets)

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
