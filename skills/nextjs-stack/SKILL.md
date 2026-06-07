---
name: nextjs-stack
description: "Production SaaS blueprint wiring Next.js 16 App Router + React 19, Tailwind v4/shadcn, Prisma 7/Postgres, Clerk/Supabase Auth, Stripe, Vercel, and Sentry into one architecture. Use when scaffolding a full-stack SaaS, choosing the App Router/RSC/state/ORM/payments layers, or reviewing one for security and serverless correctness."
---

# Next.js Full-Stack Blueprint

This is the **integration layer** — how the pieces fit, where the seams leak, and the security/serverless gotchas. For deep single-domain work, lean on the sibling skills: `stripe-billing` (Checkout/portal/webhook lifecycle), `auth-implementation` (sessions, RBAC, OAuth), `postgres-mastery` (schema/indexing/pooling), and `api-design` (REST/route-handler contracts).

## Stack Overview

Versions are mid-2026 baselines; pin exact versions from each vendor's releases page before starting.

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 16 (App Router, RSC, Cache Components) | `cacheComponents: true` unifies `'use cache'` + `cacheLife`/`cacheTag`; `reactCompiler` is top-level (auto-memoization); Server Actions |
| Runtime | React 19 (stable) | `use()`, Actions/`useActionState`, `useOptimistic`, ref-as-prop |
| Styling | Tailwind CSS v4 + shadcn/ui | CSS-first config (`@import "tailwindcss"`), no JS config needed; copy-paste components |
| State | Zustand (client UI) + RSC (server data) | Minimal boilerplate; never mirror server data into the store |
| API | Server Actions / Route Handlers / tRPC | Type-safe, pick per call site (see matrix below) |
| ORM | Prisma 7 (`prisma-client` generator + driver adapters) | Type-safe queries, declarative migrations, edge-capable adapters |
| Database | Postgres (Neon or Supabase) | Serverless-friendly; pool via adapter or pooled URL |
| Auth | Clerk or Supabase Auth | Fast setup, edge cases handled — depth in `auth-implementation` |
| Payments | Stripe | Industry standard — lifecycle depth in `stripe-billing` |
| Uploads | UploadThing | Built for Next.js |
| Deploy | Vercel | Zero-config for Next.js, preview deploys per PR |
| Monitoring | Sentry | Errors, tracing, source maps |

## Scaffolding

```bash
npx create-next-app@latest my-app --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
cd my-app

# Runtime deps
pnpm add @prisma/client @prisma/adapter-neon @neondatabase/serverless \
  stripe @clerk/nextjs zustand next-themes

# Dev-only: the Prisma CLI is NOT a runtime dep
pnpm add -D prisma

pnpm dlx prisma init
pnpm dlx shadcn@latest init   # pick: New York style, CSS variables = yes
```

`reactCompiler` may require `babel-plugin-react-compiler` depending on the release — run `next build` once and follow any prompt.

```ts
// next.config.ts — Next.js 16
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Cache Components: enables `'use cache'`, `cacheLife`, `cacheTag`,
  // and `'use cache: private'`. Replaces the old experimental.dynamicIO/useCache.
  cacheComponents: true,
  // React Compiler is top-level in 16 (no longer under experimental).
  reactCompiler: true,
};

export default nextConfig;
```

### Folder Structure
```
src/
├── app/             # Routes, layouts, pages
│   ├── (auth)/      # Auth routes group
│   ├── (dashboard)/ # Protected routes group
│   ├── api/         # Route handlers (webhooks)
│   └── layout.tsx
├── components/      # UI components
│   └── ui/          # shadcn/ui components
├── lib/             # Utilities (db, stripe, utils)
├── server/          # Server-only code (actions, queries)
├── hooks/           # Custom React hooks
└── types/           # Shared TypeScript types
```

## Auth (Clerk)

```typescript
// src/middleware.ts
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
- Middleware runs on the **Edge runtime**: no Node APIs, no DB clients, no Prisma. Do auth-gating only; do data work in the page/route.
- Webhook routes (`/api/stripe/webhook`, `/api/webhooks/clerk`) must be **excluded from `auth.protect()`** — they authenticate via signature, not a user session. Match them as public.

Mirror the auth user into your DB (so Prisma rows can FK to a local `User.id`) via a Clerk webhook (`user.created`/`user.updated`/`user.deleted`) verified with `svix`. Sessions, RBAC, and OAuth depth live in `auth-implementation`.

## Database (Prisma)

```prisma
// prisma/schema.prisma
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

// Prisma 7: the modern `prisma-client` generator emits code to an explicit
// `output` dir (no more magic `node_modules/@prisma/client`). Import from there.
// `prisma-client-js` still works but `prisma-client` is the current default.
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

model User {
  id            String   @id @default(cuid())
  clerkId       String   @unique
  email         String   @unique
  subscription  Subscription?
  projects      Project[]
  createdAt     DateTime @default(now())
}
model Subscription {
  id                   String   @id @default(cuid())
  userId               String   @unique
  user                 User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  stripeCustomerId     String   @unique
  stripeSubscriptionId String   @unique
  stripePriceId        String
  status               String   // active, trialing, past_due, canceled
  currentPeriodEnd     DateTime
}
model Project {
  id        String   @id @default(cuid())
  name      String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@index([userId])
}
```

```bash
pnpm dlx prisma migrate dev --name init   # dev: creates + applies a migration
pnpm dlx prisma generate                  # regenerate the typed client
```

**Migration strategy for serverless:** never run `migrate dev` against prod, and don't auto-migrate at request time. Run `prisma migrate deploy` once per release in CI **before** the app boots (Vercel: a build/`postinstall` step or a deploy hook), so all serverless instances start on the same schema. Use `migrate diff`/shadow DB to catch destructive changes in PR review.

```typescript
// src/lib/db.ts — serverless-safe singleton + Neon pooling via driver adapter.
// Each warm Lambda reuses one client; the adapter pools instead of opening a
// raw TCP connection per invocation (which exhausts Postgres on cold scale-out).
import { PrismaClient } from '@/generated/prisma';
import { PrismaNeon } from '@prisma/adapter-neon';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function makeClient() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? makeClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

> Pooling alternatives: a **pooled** connection string (Neon `-pooler` host / Supabase pgBouncer on port 6543 with `?pgbouncer=true`) for the runtime URL, plus a **direct** URL (`directUrl` in the datasource) for migrations. Driver-adapter and pooled-URL approaches are interchangeable; do not stack both. See `postgres-mastery` for index/connection tuning.

## API Layer: pick per call site

Three valid mechanisms in 2026 — they coexist, this is not either/or.

| Use case | Server Action | Route Handler | tRPC |
|----------|--------------|---------------|------|
| Form submit / mutation from a form | ✅ + `useActionState` | works | overkill |
| Simple CRUD from your own UI | ✅ | ✅ | fine |
| Read-heavy client fetching w/ cache, retries, pagination | wrap in TanStack Query, or read in an RSC | ✅ | ✅ best |
| Public/3rd-party API, webhooks, file streaming | ❌ | ✅ (the right tool) | ❌ |
| Shared, versioned contract for a separate mobile/native client | ❌ | OpenAPI route handlers | ✅ |

Notes for 2026:
- **Server Actions are mutations, not a data-fetch API.** Reading via an action runs it serially as a POST and can't be cached — for client reads, fetch a Route Handler through TanStack Query (`useQuery`), or just read in a Server Component and stream. React 19's `useActionState`/`useOptimistic` make form mutations clean.
- A Server Action invoked from the client is a network POST; **re-validate auth and inputs inside it** — being marked `'use server'` is not an authorization boundary. Treat every action like a public endpoint.
- tRPC shines when you want one end-to-end-typed contract across web + native; otherwise typed Route Handlers + a fetch wrapper are lighter. REST contract design lives in `api-design`.

```typescript
// src/server/actions.ts — Server Action (mutation) with validation + cache busting
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

const CreateProject = z.object({ name: z.string().trim().min(1).max(80) });

export async function createProject(formData: FormData) {
  const { userId } = await auth();              // identity from server session, NOT the form
  if (!userId) throw new Error('Unauthorized');
  const { name } = CreateProject.parse({ name: formData.get('name') });
  const user = await db.user.findUniqueOrThrow({ where: { clerkId: userId } });
  const project = await db.project.create({ data: { name, userId: user.id } });
  revalidatePath('/dashboard');                 // refresh the RSC cache for the list
  return project;
}
```

## State Management (Zustand)

```typescript
// src/hooks/use-store.ts
import { create } from 'zustand';
interface AppStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}
export const useStore = create<AppStore>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
```

**Rule:** Use Server Components for server data. Zustand for client-only UI state (modals, sidebars, filters). Don't sync server data into Zustand.

## UI (shadcn/ui)

```bash
pnpm dlx shadcn@latest add button dialog form input sonner data-table dropdown-menu
```

**Dark mode (Tailwind v4 — CSS-first, no `tailwind.config.ts`):** v4 is configured in CSS, not JS. Define the class-based `dark` variant in your global stylesheet, then drive the `.dark` class with `next-themes`. The old v3 `darkMode: 'class'` config key is gone.

```css
/* src/app/globals.css */
@import "tailwindcss";

/* class-based dark mode (matches shadcn/next-themes) */
@custom-variant dark (&:where(.dark, .dark *));

/* shadcn tokens live as CSS variables under :root and .dark */
```

```tsx
// src/app/layout.tsx — suppressHydrationWarning is required (theme set pre-hydration)
import { ThemeProvider } from 'next-themes';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

## Payments (Stripe)

Security rules that the naive snippet gets wrong — apply all of them:

- **Never trust `userId` from the request body.** Derive identity from the server session (`auth()`).
- **Never pass an arbitrary `priceId` from the client.** Allowlist your real price IDs server-side and map a plan key → price ID. A spoofed `priceId` lets a user subscribe at the wrong (e.g. $0) price.
- **Create/reuse one Stripe customer per user** and stash `stripeCustomerId` in your DB, so billing, portal, and webhooks line up.
- Centralize the SDK in `src/lib/stripe.ts` and **pin `apiVersion`** so Stripe API upgrades don't silently change behavior (check the current version in your Stripe dashboard).

```typescript
// src/lib/stripe.ts
import Stripe from 'stripe';
// Pin to your account's current API version (Dashboard → Developers → API version).
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-08-27.basil' });

// Server-side allowlist — the client sends a plan key, never a price ID.
export const PRICES = {
  pro_monthly: process.env.STRIPE_PRO_PRICE_ID!,
} as const;
export type PlanKey = keyof typeof PRICES;
```

```typescript
// src/app/api/stripe/checkout/route.ts
import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { stripe, PRICES, type PlanKey } from '@/lib/stripe';

export async function POST(req: Request) {
  const { userId } = await auth();                       // identity from session
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { plan } = (await req.json()) as { plan: PlanKey };
  const price = PRICES[plan];                             // allowlisted; reject unknown plans
  if (!price) return new NextResponse('Invalid plan', { status: 400 });

  const user = await db.user.findUniqueOrThrow({ where: { clerkId: userId } });

  // Create or reuse exactly one Stripe customer for this user.
  let customerId = user.subscription?.stripeCustomerId;
  if (!customerId) {
    const cu = await currentUser();
    const customer = await stripe.customers.create({
      email: cu?.emailAddresses[0]?.emailAddress,
      metadata: { appUserId: user.id },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
    // Tie the session back to your user for the webhook (do NOT trust client userId).
    metadata: { appUserId: user.id },
    subscription_data: { metadata: { appUserId: user.id } },
  });
  return NextResponse.json({ url: session.url });
}
```

**Customer portal** — let users manage/cancel without you building billing UI:

```typescript
// src/app/api/stripe/portal/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { stripe } from '@/lib/stripe';

export async function POST() {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });
  const user = await db.user.findUniqueOrThrow({
    where: { clerkId: userId }, include: { subscription: true },
  });
  const customerId = user.subscription?.stripeCustomerId;
  if (!customerId) return new NextResponse('No customer', { status: 400 });
  const portal = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_URL}/dashboard`,
  });
  return NextResponse.json({ url: portal.url });
}
```

**Webhook** — the route's correctness is load-bearing. Requirements:
- `export const runtime = 'nodejs'` — signature verification needs Node crypto and the **raw** body. Do not run it on Edge.
- Read the **raw** request text with `await req.text()` — never `req.json()`, which mutates the body and breaks the signature.
- **Verify the signature**, then process. An unverified body is attacker-controlled.
- **Idempotency:** Stripe retries and may deliver duplicates/out-of-order. Record processed `event.id`s (unique column) and no-op on repeats so a retried `subscription.deleted` can't clobber a newer `subscription.updated`.
- Handle the **full lifecycle**, not just two events.
- Return 2xx fast; if a handler throws, return non-2xx so Stripe retries.

```typescript
// src/app/api/stripe/webhook/route.ts
export const runtime = 'nodejs';            // REQUIRED: raw body + node crypto

import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { db } from '@/lib/db';

export async function POST(req: Request) {
  const body = await req.text();            // RAW body, not json()
  const sig = (await headers()).get('stripe-signature')!;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return new NextResponse('Invalid signature', { status: 400 });
  }

  // Idempotency: skip if we've already handled this event id.
  // (Model: WebhookEvent { id String @id }  — `id` is Stripe's event.id.)
  try {
    await db.webhookEvent.create({ data: { id: event.id } });
  } catch {
    return NextResponse.json({ received: true, duplicate: true });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const s = event.data.object as Stripe.Checkout.Session;
      const sub = await stripe.subscriptions.retrieve(s.subscription as string);
      await upsertSubscription(s.metadata?.appUserId, sub);
      break;
    }
    case 'customer.subscription.updated':      // plan change, renewal, trial end
    case 'customer.subscription.deleted': {     // canceled / fully ended
      const sub = event.data.object as Stripe.Subscription;
      await upsertSubscription(sub.metadata?.appUserId, sub);
      break;
    }
    case 'invoice.payment_failed': {            // dunning — flag the account
      // mark subscription past_due / notify the user
      break;
    }
  }
  return NextResponse.json({ received: true });
}

async function upsertSubscription(appUserId: string | undefined, sub: Stripe.Subscription) {
  if (!appUserId) return;                       // trust metadata we set server-side only
  const data = {
    stripeCustomerId: sub.customer as string,
    stripeSubscriptionId: sub.id,
    stripePriceId: sub.items.data[0]?.price.id ?? '',
    status: sub.status,                         // active | trialing | past_due | canceled
    currentPeriodEnd: new Date(sub.items.data[0].current_period_end * 1000),
  };
  await db.subscription.upsert({
    where: { userId: appUserId },
    create: { userId: appUserId, ...data },
    update: data,
  });
}
```

Add the dedupe model to your schema: `model WebhookEvent { id String @id; createdAt DateTime @default(now()) }`. Deeper Stripe billing patterns (proration, trials, metered usage, tax) are in `stripe-billing`.

## Deployment (Vercel)

```bash
vercel --prod  # or git push to main with the Vercel GitHub integration
```

**Environment separation (do not share secrets across environments):**
- In Vercel, scope each var to **Production / Preview / Development** separately. Use Stripe **test** keys + a **separate webhook secret** for Preview, and live keys only in Production.
- `NEXT_PUBLIC_URL` differs per environment; on Preview, derive it from `VERCEL_URL` so Stripe `success_url`/`cancel_url` and OAuth redirects point at the right deploy.
- **Run migrations before the app boots**, once per release — not at request time. Add a build/deploy step:

```jsonc
// package.json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build"
  }
}
```

> `migrate deploy` only applies already-committed migrations (it never creates new ones), so it is safe in CI/CD. Generate migrations locally with `migrate dev`.

**Preview deploys + Stripe webhooks:** each PR gets a preview URL. To test Stripe end-to-end locally, forward events with the CLI (no public URL needed):

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# copy the printed whsec_... into STRIPE_WEBHOOK_SECRET for local dev
stripe trigger checkout.session.completed
```

## Monitoring (Sentry)

```bash
npx @sentry/wizard@latest -i nextjs
```

Adds the client/server/edge configs, a global `error.tsx`, tracing, and source-map upload. For **readable production stack traces**, set `SENTRY_AUTH_TOKEN` (a CI secret) so source maps upload during `next build`; without it you get minified frames. Keep the `SENTRY_DSN` public-safe and the auth token server-only.

## Testing & CI

Minimum viable safety net for a SaaS:

```bash
pnpm add -D vitest @testing-library/react playwright
pnpm exec playwright install --with-deps chromium
```

- **Unit (Vitest):** pure logic — the `PRICES` allowlist, Zod schemas, the webhook `upsertSubscription` mapping. Fast, no network.
- **E2E smoke (Playwright):** sign in → load `/dashboard` → start checkout (Stripe **test** mode, card `4242 4242 4242 4242`) → assert the success state. Run against a preview deploy.
- **CI gate** — block merges on type errors, lint, and tests:

```yaml
# .github/workflows/ci.yml
name: ci
on: [pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm dlx prisma generate
      - run: pnpm tsc --noEmit
      - run: pnpm lint
      - run: pnpm test
```

## .env.example

```bash
# Database
# Runtime: pooled connection (Neon -pooler host / Supabase :6543 ?pgbouncer=true).
DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"
# Migrations only: a DIRECT (non-pooled) connection. Reference as `directUrl` in schema.prisma.
DIRECT_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"
# Auth (Clerk) — test keys in dev/preview, live keys only in production
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx        # svix secret for the user.* sync webhook
# Stripe — separate webhook secret per environment
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_PRO_PRICE_ID=price_xxx          # maps to the `pro_monthly` key in PRICES (lib/stripe.ts)
# App — differs per environment; on Vercel Preview derive from VERCEL_URL
NEXT_PUBLIC_URL=http://localhost:3000
# Sentry
SENTRY_DSN=https://examplePublicKey@o0.ingest.sentry.io/0
SENTRY_AUTH_TOKEN=                     # CI-only secret; enables source-map upload at build
# UploadThing
UPLOADTHING_TOKEN=
```

