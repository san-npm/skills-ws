## The Three Pillars — And How They Connect

Monitoring tells you *something* is broken. Observability tells you *why*.

```
Alert fires (metric) → Find error spike in dashboard (metric)
  → Filter logs by time window (logs) → Find correlation ID
    → Trace the request across services (traces) → Find the slow DB query
```

**Metrics:** Aggregated numbers over time. Cheap to store, good for alerting.
**Logs:** Individual events with context. Expensive at scale, essential for debugging.
**Traces:** Request flow across services. The connective tissue between metrics and logs.

The key insight: **correlation**. Every log line and trace should carry the same request ID so you can jump between pillars seamlessly.

---
