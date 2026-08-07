## Auth (Clerk)

```typescript
// src/proxy.ts (Next 16 renamed middleware.ts to proxy.ts; on Next <=15 keep middleware.ts, same code)
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
const isProtected = createRouteMatcher(['/dashboard(.*)']);
export default clerkMiddleware(async (auth, req) => {
  if (isProtected(req)) await auth.protect();
});
export const config = { matcher: ['/((?!.*\\..*|_next).*)', '/'] };

// Access user in Server Components
import { currentUser } from '@clerk/nextjs/server';
export default async function Page() {
  const user = await currentUser();
  // user.id, user.emailAddresses, etc.
}
```

**Matcher gotchas (the #1 silent auth bug):**
- The matcher above intentionally skips static files and `_next`, but it must still **run on `/api`** — Stripe and other webhook routes need to be reachable. The default Clerk matcher includes API routes; if you write a custom matcher that excludes `/api`, you can either keep webhooks unprotected by routing logic, or do per-route checks. Either way, never let the matcher accidentally drop `/api`.
- Proxy (Next 16's renamed middleware) defaults to the **Node.js runtime**, so Node APIs technically work, but keep it thin anyway: auth-gating only, no DB clients, no Prisma. It runs on every matched request and can be deployed ahead of your app, so do data work in the page/route.
- Webhook routes (`/api/stripe/webhook`, `/api/webhooks/clerk`) must be **excluded from `auth.protect()`** — they authenticate via signature, not a user session. Match them as public.

Mirror the auth user into your DB (so Prisma rows can FK to a local `User.id`) via a Clerk webhook (`user.created`/`user.updated`/`user.deleted`) verified with `svix`. Sessions, RBAC, and OAuth depth live in `auth-implementation`.
