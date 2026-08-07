## Contents

- 2. Rendering Strategy Decision Matrix
- ISR in Practice
- On-Demand Revalidation

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
