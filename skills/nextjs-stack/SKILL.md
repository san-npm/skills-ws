---
name: nextjs-stack
description: "Production SaaS blueprint wiring Next.js 16 App Router + React 19, Tailwind v4/shadcn, Prisma 7/Postgres, Clerk/Supabase Auth, Stripe, Vercel, and Sentry into one architecture. Use when scaffolding a full-stack SaaS, choosing the App Router/RSC/state/ORM/payments layers, or reviewing one for security and serverless correctness."
---
# Next.js Full-Stack Blueprint

This is the **integration layer** — how the pieces fit, where the seams leak, and the security/serverless gotchas. For deep single-domain work, lean on the sibling skills: `stripe-billing` (Checkout/portal/webhook lifecycle), `auth-implementation` (sessions, RBAC, OAuth), `postgres-mastery` (schema/indexing/pooling), and `api-design` (REST/route-handler contracts).

## Reference guide

Read only the references needed for the current request:

- **Stack Overview**: [references/stack-overview.md](references/stack-overview.md)
- **Scaffolding**: [references/scaffolding.md](references/scaffolding.md)
- **Auth (Clerk)**: [references/auth-clerk.md](references/auth-clerk.md)
- **Database (Prisma)**: [references/database-prisma.md](references/database-prisma.md)
- **API Layer: pick per call site**: [references/api-layer-pick-per-call-site.md](references/api-layer-pick-per-call-site.md)
- **State Management (Zustand)**: [references/state-management-zustand.md](references/state-management-zustand.md)
- **UI (shadcn/ui)**: [references/ui-shadcn-ui.md](references/ui-shadcn-ui.md)
- **Payments (Stripe)**: [references/payments-stripe.md](references/payments-stripe.md)
- **Deployment (Vercel)**: [references/deployment-vercel.md](references/deployment-vercel.md)
- **Monitoring (Sentry)**: [references/monitoring-sentry.md](references/monitoring-sentry.md)
- **Testing & CI**: [references/testing-ci.md](references/testing-ci.md)
- **.env.example**: [references/env-example.md](references/env-example.md)
