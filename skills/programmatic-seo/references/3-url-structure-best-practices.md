## Contents

- 3. URL Structure Best Practices
- Rules
- Middleware for URL Normalization

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
