## 4. Auth.js v5 (NextAuth) Setup — App Router

Auth.js v5 splits config into a root `auth.ts` (exports `handlers`, `auth`, `signIn`, `signOut`) and a thin route handler. Provider imports are now `next-auth/providers/*` named like `Google`, `GitHub`, `Credentials` (the old `GoogleProvider` names are v4). Env vars are auto-inferred from `AUTH_<PROVIDER>_ID/SECRET`; set `AUTH_SECRET` (generate with `npx auth secret`) and `AUTH_TRUST_HOST=true` when self-hosting behind a proxy.

```typescript
// auth.ts (project root)
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import argon2 from 'argon2';
import { z } from 'zod';

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },           // 'jwt' for Credentials; 'database' for OAuth-only is also fine
  providers: [
    Google,                               // reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
    GitHub,                               // reads AUTH_GITHUB_ID / AUTH_GITHUB_SECRET
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const parsed = signInSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
        // Same generic outcome whether the user is missing or the password is wrong (no enumeration):
        if (!user?.hashedPassword) return null;
        const ok = await argon2.verify(user.hashedPassword, parsed.data.password);
        return ok ? user : null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) { token.role = user.role; token.id = user.id; }
      return token;
    },
    async session({ session, token }) {
      session.user.role = token.role as string;
      session.user.id = token.id as string;
      return session;
    },
  },
  pages: { signIn: '/login', error: '/auth/error' },
});
```

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/auth';
export const { GET, POST } = handlers;
```

```typescript
// types: augment the session/JWT so token.role/id type-check
// types/next-auth.d.ts
import 'next-auth';
declare module 'next-auth' {
  interface User { role?: string }
  interface Session { user: { id: string; role?: string } & DefaultSession['user'] }
}
```

Read the session in a Server Component/route via `const session = await auth();`. Protect routes in `middleware.ts` by exporting `auth` as the middleware.

---
