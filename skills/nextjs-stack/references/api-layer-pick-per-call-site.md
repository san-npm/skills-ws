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
