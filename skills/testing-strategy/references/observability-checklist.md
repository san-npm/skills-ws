## Contents

- Observability Checklist
- Must-Have (Day 1)
- Should-Have (Week 2)
- Nice-to-Have (Month 2+)
- Health Endpoint

## Observability Checklist

### Must-Have (Day 1)
- [ ] Error tracking (Sentry) with source maps and alerting
- [ ] Structured logging with request ID tracing
- [ ] Uptime monitoring (BetterStack, UptimeRobot) — check `/api/health` every 60s
- [ ] Basic performance monitoring (Sentry or Vercel Analytics)

### Should-Have (Week 2)
- [ ] Centralized log aggregation (Axiom/Datadog)
- [ ] Performance budgets (Core Web Vitals, "good" thresholds): LCP < 2.5s, **INP < 200ms** (INP replaced FID as a Core Web Vital in Mar 2024), CLS < 0.1; supporting: TTFB < 800ms, FCP < 1.8s
- [ ] Database query monitoring (slow query log, connection pool alerts)
- [ ] Custom business metric dashboards (signup rate, activation, errors by endpoint)

### Nice-to-Have (Month 2+)
- [ ] Distributed tracing across services
- [ ] Alerting thresholds with escalation (warn → page)
- [ ] On-call rotation (PagerDuty/Opsgenie): primary + secondary, 1-week rotations
- [ ] Runbooks for common incidents (DB down, spike in errors, payment webhook failures)
- [ ] SLO tracking (99.9% uptime = 8.7h downtime/year budget)

### Health Endpoint

```typescript
// app/api/health/route.ts
import { db } from '@/lib/db';
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return Response.json({ status: 'ok', db: 'connected' });
  } catch {
    return Response.json({ status: 'degraded', db: 'disconnected' }, { status: 503 });
  }
}
```
