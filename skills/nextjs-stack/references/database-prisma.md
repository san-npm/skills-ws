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
