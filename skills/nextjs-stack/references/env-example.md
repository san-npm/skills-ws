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
