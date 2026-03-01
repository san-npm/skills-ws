---
name: monitoring-observability
description: "Production monitoring and observability — Prometheus, Grafana, OpenTelemetry, distributed tracing, SLOs, and incident response."
---

# Monitoring & Observability

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

## Structured Logging That Actually Helps

### The Pattern

Every log entry is JSON. No exceptions. No `console.log("user signed up")`.

```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level(label) {
      return { level: label };  // "info" not 30
    },
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  // Add service metadata to every log
  base: {
    service: process.env.SERVICE_NAME || 'api',
    version: process.env.APP_VERSION || 'unknown',
    environment: process.env.NODE_ENV || 'development',
  },
});

// Request-scoped logger with correlation ID
export function createRequestLogger(requestId: string, userId?: string) {
  return logger.child({
    requestId,
    userId,
  });
}
```

### Express Middleware

```typescript
import { randomUUID } from 'crypto';
import { createRequestLogger } from './logger';

app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] as string || randomUUID();
  req.log = createRequestLogger(requestId, req.user?.id);
  res.setHeader('x-request-id', requestId);

  const start = performance.now();
  res.on('finish', () => {
    const duration = performance.now() - start;
    req.log.info({
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: Math.round(duration),
      contentLength: res.getHeader('content-length'),
    }, 'request completed');
  });

  next();
});
```

### Log Levels That Actually Mean Something

| Level | When to Use | Example |
|-------|-------------|---------|
| `fatal` | Process is about to crash | Uncaught exception, out of memory |
| `error` | Operation failed, needs attention | Payment processing failed, DB connection lost |
| `warn` | Something unexpected, but handled | Rate limit approaching, deprecated API called |
| `info` | Business events worth recording | User signed up, order placed, deploy completed |
| `debug` | Technical details for debugging | SQL queries, cache hit/miss, request/response bodies |
| `trace` | Extremely verbose, rarely enabled | Function entry/exit, variable values |

**Rule of thumb:** If you'd want to see it in production logs during an incident, it's `info`. If you'd only want it when actively debugging, it's `debug`.

---

## Prometheus: PromQL Deep Dive

### Metric Types and When to Use Each

```typescript
import { Counter, Histogram, Gauge, Summary, Registry } from 'prom-client';

const registry = new Registry();

// Counter: things that only go up
// Use for: requests, errors, bytes transferred
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status_code'] as const,
  registers: [registry],
});

// Histogram: distribution of values (request duration, response size)
// Use for: latency, size — anything you want percentiles of
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status_code'] as const,
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
});

// Gauge: values that go up and down
// Use for: queue depth, active connections, temperature
const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  registers: [registry],
});

// In your request handler:
app.use((req, res, next) => {
  activeConnections.inc();
  const end = httpRequestDuration.startTimer({
    method: req.method,
    path: routePattern(req),  // "/users/:id" not "/users/12345"
  });

  res.on('finish', () => {
    const labels = { method: req.method, path: routePattern(req), status_code: String(res.statusCode) };
    httpRequestsTotal.inc(labels);
    end({ status_code: String(res.statusCode) });
    activeConnections.dec();
  });

  next();
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});
```

### PromQL: Queries You'll Actually Use

```promql
# Request rate (requests per second over last 5 minutes)
rate(http_requests_total[5m])

# Error rate as a percentage
sum(rate(http_requests_total{status_code=~"5.."}[5m]))
/ sum(rate(http_requests_total[5m]))
* 100

# P95 latency
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)

# P95 latency per endpoint
histogram_quantile(0.95,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le, path)
)

# Apdex score (satisfied < 0.5s, tolerating < 2s)
(
  sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))
  + sum(rate(http_request_duration_seconds_bucket{le="2.0"}[5m]))
) / 2
/ sum(rate(http_request_duration_seconds_count[5m]))

# Top 5 slowest endpoints
topk(5,
  histogram_quantile(0.95,
    sum(rate(http_request_duration_seconds_bucket[5m])) by (le, path)
  )
)

# Rate of change (is error rate increasing?)
deriv(
  sum(rate(http_requests_total{status_code=~"5.."}[5m]))[30m:1m]
)

# Predict disk full in 4 hours
predict_linear(node_filesystem_avail_bytes[1h], 4 * 3600) < 0
```

### Recording Rules

Pre-compute expensive queries to speed up dashboards:

```yaml
# prometheus/recording-rules.yml
groups:
  - name: http_metrics
    interval: 15s
    rules:
      - record: job:http_requests:rate5m
        expr: sum(rate(http_requests_total[5m])) by (job)

      - record: job:http_errors:rate5m
        expr: sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (job)

      - record: job:http_error_ratio:rate5m
        expr: |
          job:http_errors:rate5m / job:http_requests:rate5m

      - record: job:http_latency:p95_5m
        expr: |
          histogram_quantile(0.95,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, job)
          )

      - record: job:http_latency:p99_5m
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le, job)
          )
```

### Alerting Rules

```yaml
# prometheus/alerting-rules.yml
groups:
  - name: availability
    rules:
      - alert: HighErrorRate
        expr: job:http_error_ratio:rate5m > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate on {{ $labels.job }}"
          description: "Error rate is {{ $value | humanizePercentage }} (threshold: 5%)"
          runbook: "https://wiki.internal/runbooks/high-error-rate"

      - alert: HighLatency
        expr: job:http_latency:p95_5m > 1
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "High P95 latency on {{ $labels.job }}"
          description: "P95 latency is {{ $value | humanizeDuration }}"

      - alert: PodCrashLooping
        expr: |
          increase(kube_pod_container_status_restarts_total[1h]) > 5
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Pod {{ $labels.pod }} crash looping"

      - alert: DiskSpaceLow
        expr: |
          (node_filesystem_avail_bytes / node_filesystem_size_bytes) < 0.1
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Disk space below 10% on {{ $labels.instance }}"

      - alert: DiskWillFillIn4Hours
        expr: predict_linear(node_filesystem_avail_bytes[1h], 4 * 3600) < 0
        for: 30m
        labels:
          severity: critical
```

---

## Grafana: Dashboard as Code

### Provisioning with Docker Compose

```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus:v2.50.0
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/recording-rules.yml:/etc/prometheus/recording-rules.yml
      - ./prometheus/alerting-rules.yml:/etc/prometheus/alerting-rules.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
    ports:
      - '9090:9090'

  grafana:
    image: grafana/grafana:10.3.0
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
      - ./grafana/dashboards:/var/lib/grafana/dashboards
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
      - GF_USERS_ALLOW_SIGN_UP=false
    ports:
      - '3001:3000'

  alertmanager:
    image: prom/alertmanager:v0.27.0
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    ports:
      - '9093:9093'

  loki:
    image: grafana/loki:2.9.4
    ports:
      - '3100:3100'
    command: -config.file=/etc/loki/local-config.yaml

volumes:
  prometheus-data:
  grafana-data:
```

### Grafana Datasource Provisioning

```yaml
# grafana/provisioning/datasources/datasources.yml
apiVersion: 1
datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    jsonData:
      timeInterval: '15s'

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
    jsonData:
      derivedFields:
        - datasourceUid: tempo
          matcherRegex: '"traceId":"(\w+)"'
          name: TraceID
          url: '$${__value.raw}'

  - name: Tempo
    type: tempo
    access: proxy
    url: http://tempo:3200
    uid: tempo
```

### Dashboard Provisioning

```yaml
# grafana/provisioning/dashboards/dashboards.yml
apiVersion: 1
providers:
  - name: 'default'
    orgId: 1
    folder: ''
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /var/lib/grafana/dashboards
      foldersFromFilesStructure: true
```

### Alertmanager Routing

```yaml
# alertmanager/alertmanager.yml
global:
  resolve_timeout: 5m

route:
  group_by: ['alertname', 'job']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'slack-default'
  routes:
    - match:
        severity: critical
      receiver: 'pagerduty-critical'
      repeat_interval: 1h
    - match:
        severity: warning
      receiver: 'slack-warnings'
      repeat_interval: 4h

receivers:
  - name: 'slack-default'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/XXX'
        channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '<PAGERDUTY_SERVICE_KEY>'
        description: '{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}'

  - name: 'slack-warnings'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/XXX'
        channel: '#alerts-warnings'
```

---

## OpenTelemetry: Auto-Instrumentation

### Node.js Setup

```typescript
// tracing.ts — MUST be imported before anything else
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || 'api',
    [ATTR_SERVICE_VERSION]: process.env.APP_VERSION || '0.0.0',
    'deployment.environment': process.env.NODE_ENV || 'development',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/metrics',
    }),
    exportIntervalMillis: 15000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingPaths: ['/healthz', '/ready', '/metrics'],
      },
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();
process.on('SIGTERM', () => sdk.shutdown());
```

### Custom Spans

```typescript
import { trace, SpanStatusCode, context } from '@opentelemetry/api';

const tracer = trace.getTracer('payment-service');

async function processPayment(orderId: string, amount: number) {
  return tracer.startActiveSpan('payment.process', async (span) => {
    try {
      span.setAttributes({
        'payment.order_id': orderId,
        'payment.amount': amount,
        'payment.currency': 'USD',
      });

      // Nested span for the Stripe API call
      const result = await tracer.startActiveSpan('payment.stripe.charge', async (stripeSpan) => {
        try {
          const charge = await stripe.charges.create({ amount, currency: 'usd' });
          stripeSpan.setAttributes({
            'stripe.charge_id': charge.id,
            'stripe.status': charge.status,
          });
          return charge;
        } catch (err) {
          stripeSpan.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
          stripeSpan.recordException(err);
          throw err;
        } finally {
          stripeSpan.end();
        }
      });

      span.setAttributes({ 'payment.status': 'success' });
      return result;
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
      span.recordException(err);
      throw err;
    } finally {
      span.end();
    }
  });
}
```

### Python Auto-Instrumentation

```bash
pip install opentelemetry-distro opentelemetry-exporter-otlp
opentelemetry-bootstrap -a install  # Auto-install instrumentations
```

```bash
# Run with auto-instrumentation
opentelemetry-instrument \
  --service_name my-service \
  --exporter_otlp_endpoint http://localhost:4318 \
  python app.py
```

```python
# Custom spans in Python
from opentelemetry import trace

tracer = trace.get_tracer("payment-service")

def process_payment(order_id: str, amount: float):
    with tracer.start_as_current_span("payment.process") as span:
        span.set_attribute("payment.order_id", order_id)
        span.set_attribute("payment.amount", amount)

        with tracer.start_as_current_span("payment.stripe.charge") as stripe_span:
            charge = stripe.Charge.create(amount=int(amount * 100), currency="usd")
            stripe_span.set_attribute("stripe.charge_id", charge.id)
            return charge
```

---

## Distributed Tracing: Practical Patterns

### Span Naming Conventions

```
# Good — consistent, searchable, useful for aggregation
http.request GET /api/users/:id
db.query SELECT users
cache.get user:profile:123
queue.publish order.created
payment.stripe.charge
email.send welcome

# Bad — too specific (high cardinality) or too vague
GET /api/users/12345          ← every user ID creates a unique span
processRequest                ← useless for filtering
doStuff                       ← really?
```

### Sampling Strategies

```typescript
import { TraceIdRatioBasedSampler, ParentBasedSampler } from '@opentelemetry/sdk-trace-base';

// Sample 10% of traces, but always sample if parent was sampled
const sampler = new ParentBasedSampler({
  root: new TraceIdRatioBasedSampler(0.1),
});

// Custom sampler: always sample errors, sample 10% of success
import { SamplingDecision, SamplingResult } from '@opentelemetry/sdk-trace-base';

class ErrorAwareSampler {
  shouldSample(context, traceId, spanName, spanKind, attributes): SamplingResult {
    // Always sample errors
    if (attributes?.['http.status_code'] >= 500) {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }
    // 10% sampling for everything else
    const hash = parseInt(traceId.slice(-8), 16);
    if (hash % 100 < 10) {
      return { decision: SamplingDecision.RECORD_AND_SAMPLED };
    }
    return { decision: SamplingDecision.NOT_RECORD };
  }
}
```

### Context Propagation Across Services

```typescript
// Service A — outgoing HTTP request
import { context, propagation } from '@opentelemetry/api';

async function callServiceB() {
  const headers: Record<string, string> = {};
  // Inject trace context into outgoing headers
  propagation.inject(context.active(), headers);

  const response = await fetch('http://service-b/api/data', { headers });
  return response.json();
}

// Service B — incoming request (auto-instrumented by OTel HTTP instrumentation)
// The trace context is automatically extracted from incoming headers
// No manual code needed — just ensure both services use OTel
```

---

## SLOs, SLIs, and Error Budgets

### Defining SLIs

```yaml
# SLI definitions
slis:
  availability:
    description: "Percentage of successful requests"
    query: |
      1 - (
        sum(rate(http_requests_total{status_code=~"5.."}[5m]))
        / sum(rate(http_requests_total[5m]))
      )

  latency:
    description: "Percentage of requests faster than 500ms"
    query: |
      sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))
      / sum(rate(http_request_duration_seconds_count[5m]))

  throughput:
    description: "Requests per second"
    query: sum(rate(http_requests_total[5m]))
```

### SLO Targets and Error Budgets

```
SLO: 99.9% availability over 30 days
Error budget: 0.1% = 43.2 minutes of downtime per month

SLO: 99% of requests under 500ms
Error budget: 1% of requests can be slow
```

### Burn Rate Alerts

```yaml
# Multi-window, multi-burn-rate alerts (Google SRE book pattern)
groups:
  - name: slo_alerts
    rules:
      # Fast burn: 14.4x burn rate over 1h (uses 2% of monthly budget in 1h)
      - alert: SLOErrorBudgetFastBurn
        expr: |
          (
            job:http_error_ratio:rate5m > (14.4 * 0.001)
            and
            job:http_error_ratio:rate1h > (14.4 * 0.001)
          )
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Fast error budget burn on {{ $labels.job }}"
          description: "At current rate, monthly error budget exhausted in ~2 days"

      # Slow burn: 3x burn rate over 6h
      - alert: SLOErrorBudgetSlowBurn
        expr: |
          (
            job:http_error_ratio:rate30m > (3 * 0.001)
            and
            job:http_error_ratio:rate6h > (3 * 0.001)
          )
        for: 15m
        labels:
          severity: warning
```

---

## On-Call and Incident Response

### Runbook Template

```markdown
# Runbook: High Error Rate

## Severity: Critical

## Symptoms
- Error rate exceeds 5% for 5+ minutes
- PagerDuty alert: HighErrorRate

## First Response (< 5 minutes)
1. Check Grafana dashboard: https://grafana.internal/d/http-overview
2. Check if it's a single endpoint or service-wide
3. Check recent deployments: `kubectl rollout history deployment/app`
4. If a recent deploy correlates: `kubectl rollout undo deployment/app`

## Diagnosis
1. Check error logs in Loki:
   `{job="api"} |= "error" | json | status_code >= 500`
2. Check dependent services:
   - Database: `pg_isready -h db.internal`
   - Redis: `redis-cli -h redis.internal ping`
   - External APIs: Check status pages
3. Check resource usage:
   - CPU: `kubectl top pods -n production`
   - Memory: Same command
   - Connections: Check connection pool metrics

## Mitigation
- **Bad deploy:** Roll back immediately
- **Database overload:** Enable read replicas, kill long queries
- **External dependency:** Enable circuit breaker, serve degraded
- **Traffic spike:** Scale up pods: `kubectl scale deployment/app --replicas=10`

## Escalation
- If not resolved in 30 minutes: Page the team lead
- If data loss suspected: Page the CTO
```

### PagerDuty Integration via Alertmanager

Already shown above in alertmanager config. Key decisions:

- **Critical alerts** → PagerDuty (wakes people up)
- **Warning alerts** → Slack (checked during business hours)
- **Info alerts** → Dashboard only (no notification)

### Post-Incident Template

```markdown
# Incident Post-Mortem: [Title]

**Date:** YYYY-MM-DD
**Duration:** X hours Y minutes
**Severity:** P1/P2/P3
**Impact:** X% of users affected, $Y revenue impact

## Timeline
- HH:MM — Alert fired
- HH:MM — On-call acknowledged
- HH:MM — Root cause identified
- HH:MM — Mitigation applied
- HH:MM — Full resolution

## Root Cause
[What actually broke and why]

## What Went Well
- [Quick detection, good runbooks, etc.]

## What Went Wrong
- [Slow response, missing alerts, etc.]

## Action Items
- [ ] [Action] — Owner — Due Date
- [ ] [Action] — Owner — Due Date

## Lessons Learned
[What we'll do differently]
```

---

## Datadog vs Self-Hosted: Decision Matrix

| Factor | Datadog | Self-hosted (Prometheus/Grafana/Loki) |
|--------|---------|---------------------------------------|
| Setup time | Minutes | Days to weeks |
| Monthly cost (10 services) | $2,000-5,000 | $200-500 (infra) + engineer time |
| Monthly cost (100 services) | $20,000-50,000 | $2,000-5,000 + dedicated SRE |
| Maintenance | Zero | Significant (upgrades, scaling, backups) |
| Correlation | Excellent (built-in) | Good (requires setup) |
| Custom dashboards | Great | Great (Grafana) |
| APM/tracing | Built-in | OTel + Jaeger/Tempo |
| Log management | Built-in | Loki or ELK |
| Learning curve | Low | Medium-High |

**Use Datadog when:**
- Team is < 20 engineers
- No dedicated SRE/platform team
- You need to move fast and budget allows it
- Compliance requires vendor-managed infrastructure

**Self-host when:**
- Cost is a primary concern at scale
- You have SRE capacity
- Data sovereignty requirements
- You want full control over retention and queries

**Hybrid approach:** Use Datadog for APM/tracing, self-host Prometheus for metrics (it's just better for Kubernetes), use Loki for logs.

---

## Quick Reference: Essential Queries

### Prometheus
```promql
# Golden signals
rate(http_requests_total[5m])                          # Traffic
rate(http_requests_total{status_code=~"5.."}[5m])       # Errors
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))  # Latency
sum(active_connections)                                 # Saturation
```

### Loki (LogQL)
```logql
# Error logs with JSON parsing
{job="api"} |= "error" | json | level="error" | line_format "{{.msg}}"

# Logs for a specific request
{job="api"} | json | requestId="abc-123"

# Count errors per minute
sum(count_over_time({job="api"} |= "error" [1m])) by (level)

# Top 10 error messages
topk(10, sum(count_over_time({job="api"} | json | level="error" [1h])) by (msg))
```

---

## Checklist: Production Observability

- [ ] Structured JSON logging with correlation IDs
- [ ] Request ID propagated across all services
- [ ] RED metrics exposed (Rate, Errors, Duration)
- [ ] Prometheus scraping all services
- [ ] Recording rules for expensive queries
- [ ] Alerting rules with severity levels
- [ ] Alertmanager routing (critical → PagerDuty, warning → Slack)
- [ ] Grafana dashboards for each service
- [ ] Distributed tracing with OpenTelemetry
- [ ] Trace-to-log correlation configured
- [ ] SLOs defined with error budget tracking
- [ ] Burn rate alerts for SLO violations
- [ ] Runbooks linked in alert annotations
- [ ] On-call rotation configured
- [ ] Post-incident process documented
- [ ] Log retention policy (30d hot, 90d cold)
- [ ] Dashboard provisioned as code (version controlled)
- [ ] Sampling strategy for traces (don't sample 100% in production)
