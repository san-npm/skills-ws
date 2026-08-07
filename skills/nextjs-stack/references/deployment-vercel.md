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
