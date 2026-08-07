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
