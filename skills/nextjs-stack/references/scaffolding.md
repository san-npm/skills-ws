## Contents

- Scaffolding
- Folder Structure

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
