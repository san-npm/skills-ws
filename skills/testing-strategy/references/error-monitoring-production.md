## Contents

- Error Monitoring (Production)
- Sentry Setup (Next.js)

## Error Monitoring (Production)

### Sentry Setup (Next.js)

```bash
npx @sentry/wizard@latest -i nextjs
# Automatically configures: instrumentation-client.ts, sentry.server.config.ts,
# sentry.edge.config.ts, instrumentation.ts, next.config.js wrapper
```

**Source maps:** The wizard configures `@sentry/nextjs` to upload source maps during build. Verify with:
```bash
npx sentry-cli sourcemaps list --org=YOUR_ORG --project=YOUR_PROJECT
```

**Error grouping:** Sentry groups by stack trace by default. Customize with fingerprints:
```typescript
Sentry.captureException(error, { fingerprint: ['checkout-flow', error.code] });
```

**Alert rules (configure in Sentry dashboard):**

| Rule | Condition | Action |
|------|-----------|--------|
| New issue spike | >10 events in 5 min | Slack + PagerDuty |
| Regression | Resolved issue recurs | Slack + email |
| Error rate | >1% of transactions | PagerDuty |
| Performance | p95 > 2s | Slack |

**Performance monitoring (tracing):** *Not* automatic: you must opt in by setting a non-zero `tracesSampleRate` (or `tracesSampler`) in each runtime config (`instrumentation-client.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`). With it unset/`0`, no transactions are sent. Profiling additionally requires `profilesSampleRate` *and* the profiling integration. Start at 10% in production and raise as needed:
```typescript
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,   // 10% of transactions traced
  profilesSampleRate: 0.1, // relative to traced transactions; needs nodeProfilingIntegration() on the server
});
```
