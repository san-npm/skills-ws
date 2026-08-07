## Contents

- Content Security Policy (nonce + strict-dynamic + Trusted Types)
- Next.js — per-request nonce via middleware
- Trusted Types policy (kills DOM-XSS)
- Roll it out safely with Report-Only first
- SPA (React/Vue) without a server middleware

## Content Security Policy (nonce + strict-dynamic + Trusted Types)

A static allowlist CSP (`script-src 'self' https://cdn...`) is bypassable: any
script-gadget or open redirect on an allowlisted host re-enables XSS, and
`'unsafe-inline'` defeats the whole header. The modern, Google-recommended CSP is
**nonce-based + `strict-dynamic`**: you nonce only your root scripts, and
`strict-dynamic` propagates trust to scripts they load, so you can drop host
allowlists entirely. Pair it with **Trusted Types** to kill DOM-XSS sinks.

Key rules:
- A fresh, ≥128-bit nonce **per response** (never reuse across requests — a static
  nonce is no better than `'unsafe-inline'`).
- `'strict-dynamic'` makes browsers **ignore** `'self'` and host allowlists for
  scripts, so old browsers fall back to them; keep `https:` as a fallback only.
- `'unsafe-inline'` is intentionally listed AFTER the nonce: CSP3 browsers ignore
  it when a nonce is present, CSP1/2 browsers honor it (graceful degradation).
- `require-trusted-types-for 'script'` forces all DOM sink writes
  (`innerHTML`, `script.src`, `eval`) through a vetted `TrustedTypePolicy`.

### Next.js — per-request nonce via middleware

```typescript
// middleware.ts — runs on every request; injects a unique nonce + CSP header.
import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');

  const csp = [
    `default-src 'self'`,
    // 'strict-dynamic' + nonce is the real defense; 'unsafe-inline'/https: are
    // CSP1/2 fallbacks that modern browsers ignore when the nonce is present.
    `script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-inline' https:`,
    `style-src 'self' 'nonce-${nonce}'`,          // nonce styles too; avoid 'unsafe-inline'
    `img-src 'self' blob: data: https://images.example.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `connect-src 'self' https://api.example.com wss://ws.example.com`,
    `object-src 'none'`,                           // kill <object>/<embed> plugin XSS
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`,                             // stop <base> tag nonce-stripping
    `require-trusted-types-for 'script'`,          // DOM-XSS sink enforcement
    `trusted-types default dompurify`,             // policy names allowed to exist
    `upgrade-insecure-requests`,
    // Send violations somewhere you can watch (Reporting API):
    `report-to csp-endpoint`,
  ].join('; ');

  // Pass the nonce to the app via a request header so Server Components can read it.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set('x-nonce', nonce);

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Reporting API endpoint (replaces the deprecated report-uri directive):
  res.headers.set(
    'Reporting-Endpoints',
    'csp-endpoint="https://example.com/api/csp-report"'
  );
  return res;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'] };
```

```tsx
// app/layout.tsx — read the nonce and stamp it onto your scripts.
import { headers } from 'next/headers';
import Script from 'next/script';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? '';
  return (
    <html>
      <body>
        {children}
        {/* Next.js auto-propagates the nonce to its own bootstrap scripts; pass it
            to any third-party <Script> too. strict-dynamic trusts what they load. */}
        <Script src="https://cdn.example.com/widget.js" nonce={nonce} strategy="afterInteractive" />
      </body>
    </html>
  );
}
```

### Trusted Types policy (kills DOM-XSS)

```typescript
// Register ONE default policy that sanitizes all sink writes. With
// `require-trusted-types-for 'script'`, assigning a raw string to innerHTML now
// throws a TypeError unless it passed through a TrustedTypePolicy like this.
import DOMPurify from 'dompurify';

if (window.trustedTypes?.createPolicy) {
  window.trustedTypes.createPolicy('default', {
    createHTML: (input) => DOMPurify.sanitize(input, { RETURN_TRUSTED_TYPE: false }),
    createScriptURL: (url) => {
      const u = new URL(url, location.origin);
      if (u.origin !== location.origin && u.host !== 'cdn.example.com') {
        throw new TypeError(`Blocked untrusted script URL: ${url}`);
      }
      return url;
    },
    createScript: () => { throw new TypeError('Inline script creation is blocked'); },
  });
}
```

### Roll it out safely with Report-Only first

Ship the strict policy as **`Content-Security-Policy-Report-Only`** for 1–2 weeks,
watch the violation reports, allowlist legitimate gaps, THEN switch the header name
to the enforcing `Content-Security-Policy`. Report-Only never breaks the page.

```typescript
// Same value, non-enforcing header — collect violations without blocking anything:
res.headers.set('Content-Security-Policy-Report-Only', csp);
```

```typescript
// app/api/csp-report/route.ts — receive Reporting API payloads (application/reports+json)
export async function POST(req: Request) {
  const reports = await req.json(); // array of { type, body: { documentURL, blockedURL, ... } }
  for (const r of reports) logger.warn({ csp: r.body }, 'CSP violation');
  return new Response(null, { status: 204 });
}
```

### SPA (React/Vue) without a server middleware

If you serve a static SPA you can't mint a per-request nonce, so use **hashes**
for your known inline scripts plus `strict-dynamic`, and still enforce Trusted Types:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'sha256-<base64 hash of each inline script>' 'strict-dynamic' https:;
  style-src 'self';
  img-src 'self' data: https:;
  connect-src 'self' https://api.example.com;
  object-src 'none';
  base-uri 'self';
  frame-ancestors 'none';
  require-trusted-types-for 'script';
```

Generate hashes at build time (the browser prints the expected `sha256-…` in the
console on the first violation), or have your bundler emit them.

---
