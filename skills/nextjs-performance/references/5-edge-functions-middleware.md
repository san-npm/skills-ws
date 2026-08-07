## Contents

- 5. Edge Functions & Middleware
- Edge API routes

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
