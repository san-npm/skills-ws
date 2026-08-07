## Monitoring (Sentry)

```bash
npx @sentry/wizard@latest -i nextjs
```

Adds the client/server/edge configs, a global `error.tsx`, tracing, and source-map upload. For **readable production stack traces**, set `SENTRY_AUTH_TOKEN` (a CI secret) so source maps upload during `next build`; without it you get minified frames. Keep the `SENTRY_DSN` public-safe and the auth token server-only.
