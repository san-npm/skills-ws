---
name: nextjs-stack
description: "Opinionated full-stack Next.js blueprint: App Router, Tailwind, shadcn/ui, Prisma, Postgres, Stripe, auth, and deployment. Use when scaffolding a new SaaS or web app with the modern indie hacker stack."
---

# Next.js Full-Stack Blueprint

## Stack Overview

| Layer | Choice | Why |
|-------|--------|-----|
| Framework | Next.js 14+ (App Router) | RSC, Server Actions, file routing |
| Styling | Tailwind CSS + shadcn/ui | Fast, consistent, copy-paste components |
| State | Zustand (client) + Server Components (server) | Minimal boilerplate |
| API | Server Actions or tRPC | Type-safe, no REST boilerplate |
| ORM | Prisma | Best DX, great migrations |
| Database | Postgres (Neon or Supabase) | Serverless-friendly, scalable |
| Auth | Clerk or Supabase Auth | <1 hour setup, handles edge cases |
| Payments | Stripe | Industry standard |
| Uploads | UploadThing | Built for Next.js |
| Deploy | Vercel | Zero-config for Next.js |
| Monitoring | Sentry | Error + performance |

## Scaffolding

```bash
npx create-next-app@latest my-app --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
cd my-app
pnpm add prisma @prisma/client stripe @clerk/nextjs zustand
pnpm add -D @types/node
npx prisma init
npx shadcn@latest init
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

## Database (Prisma)

```prisma
// prisma/schema.prisma
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }
generator client { provider = "prisma-client-js" }

model User {
  id            String   @id @default(cuid())
  clerkId       String   @unique
  email         String   @unique
  subscription  Subscription?
  createdAt     DateTime @default(now())
}
model Subscription {
  id               String   @id @default(cuid())
  userId           String   @unique
  user             User     @relation(fields: [userId], references: [id])
  stripeCustomerId String   @unique
  stripePriceId    String
  status           String   // active, canceled, past_due
  currentPeriodEnd DateTime
}
```

```bash
npx prisma migrate dev --name init
npx prisma generate
```

```typescript
// src/lib/db.ts
import { PrismaClient } from '@prisma/client';
const globalForPrisma = globalThis as { prisma?: PrismaClient };
export const db = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
```

## API Layer: Server Actions vs tRPC

| Use case | Server Actions | tRPC |
|----------|---------------|------|
| Form submissions | ✅ Perfect | Overkill |
| Simple CRUD | ✅ Great | Fine |
| Complex queries with caching | Possible | ✅ Better |
| Client-side data fetching | Awkward | ✅ Built for it |
| Multi-client (mobile app too) | ❌ | ✅ |

```typescript
// src/server/actions.ts — Server Actions example
'use server';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

export async function createProject(formData: FormData) {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthorized');
  const name = formData.get('name') as string;
  return db.project.create({ data: { name, userId } });
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
npx shadcn@latest add button dialog form input toast data-table dropdown-menu
```

Dark mode: add `darkMode: 'class'` to `tailwind.config.ts`, use `next-themes` ThemeProvider.

## Payments (Stripe)

```typescript
// src/app/api/stripe/checkout/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { priceId, userId } = await req.json();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/pricing`,
    metadata: { userId },
  });
  return NextResponse.json({ url: session.url });
}

// src/app/api/stripe/webhook/route.ts
import { headers } from 'next/headers';
export async function POST(req: Request) {
  const body = await req.text();
  const sig = (await headers()).get('stripe-signature')!;
  const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  switch (event.type) {
    case 'checkout.session.completed':
      // Create/update subscription in DB
      break;
    case 'customer.subscription.deleted':
      // Mark subscription canceled
      break;
  }
  return NextResponse.json({ received: true });
}
```

## Deployment (Vercel)

```bash
vercel --prod  # or git push to main with Vercel GitHub integration
```

Set env vars in Vercel dashboard. Use preview deployments for PRs.

## Monitoring (Sentry)

```bash
npx @sentry/wizard@latest -i nextjs
```

Adds error boundaries, source maps upload, and performance monitoring automatically.

## .env.example

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/dbname?sslmode=require"
# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRO_PRICE_ID=price_...
# App
NEXT_PUBLIC_URL=http://localhost:3000
# Sentry
SENTRY_DSN=https://...@sentry.io/...
# UploadThing
UPLOADTHING_TOKEN=...
```
