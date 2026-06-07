---
name: monitoring-observability
description: "Production monitoring & observability stack — structured logging, Prometheus/PromQL, Grafana-as-code, OpenTelemetry tracing, tail sampling, SLOs/error budgets, incident response. Use when instrumenting a service, designing metrics/alerts/SLOs, debugging an incident, wiring traces-to-logs, or choosing Datadog vs self-hosted."
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

**What ships to production must be structured (JSON), so a log pipeline can index and query it.** No `console.log("user signed up")` in app code. Locally, pretty-print for human eyes — but only at the *sink*, never by changing what the app emits: pipe through `pino-pretty` in dev (`node app.js | pino-pretty`) or set `transport: { target: 'pino-pretty' }` behind a `NODE_ENV !== 'production'` guard. The emitted log object stays identical; only rendering differs.

```typescript
// lib/logger.ts
import pino from 'pino';
import { trace, context } from '@opentelemetry/api';

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
  // Stamp every line with the active trace/span so logs link to traces.
  // This is what the Loki `derivedFields` regex (`"trace_id":"(\w+)"`) and the
  // Tempo `tracesToLogsV2` link rely on — without it, trace↔log jumps are dead.
  mixin() {
    const span = trace.getSpan(context.active());
    if (!span) return {};
    const { traceId, spanId } = span.spanContext();
    return { trace_id: traceId, span_id: spanId };
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

**But logs are not your business-analytics pipeline.** High-volume, high-cardinality business events (every page view, every cache lookup, per-item loop iterations) should NOT be `info` logs — they blow up ingestion cost and bury signal. Instead:

- **Count them as metrics** (`Counter`/`Histogram`) — `signups_total`, `orders_total{status}` — and log only the exceptional cases.
- **Sample** routine successes if you must log them: log 1-in-N, or log the slow/failed tail only.
- Reserve `info` for events you'd actually read one-by-one during an incident (deploys, config changes, a payment that failed). A useful budget: an idle service should emit roughly *zero* `info` lines per second.

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

### Scrape Config & Service Discovery

This is the `prometheus.yml` the compose file mounts. Static targets are fine for a fixed VM fleet; on Kubernetes use service discovery so pods are scraped automatically as they come and go.

```yaml
# prometheus/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: prod-eu          # disambiguates series when federating / remote-writing

rule_files:
  - /etc/prometheus/recording-rules.yml
  - /etc/prometheus/alerting-rules.yml

alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

scrape_configs:
  # Static targets (VMs, the compose stack itself)
  - job_name: api
    metrics_path: /metrics
    static_configs:
      - targets: ['api:3000']

  # Kubernetes pods that opt in via annotations:
  #   prometheus.io/scrape: "true"
  #   prometheus.io/path:   "/metrics"   (optional)
  #   prometheus.io/port:   "3000"       (optional)
  - job_name: 'k8s-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: "true"
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      # Rewrite the address to the annotated port.
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: '([^:]+)(?::\d+)?;(\d+)'
        replacement: '$1:$2'
        target_label: __address__
      # Promote useful pod labels to series labels (keep this list SHORT — see budget below).
      - source_labels: [__meta_kubernetes_namespace]
        target_label: namespace
      - source_labels: [__meta_kubernetes_pod_label_app]
        target_label: app
```

> On managed clusters, prefer **Prometheus Operator** `ServiceMonitor`/`PodMonitor` CRDs over hand-written `kubernetes_sd_configs` — same discovery, declarative and per-team.

### Long-Term Storage: Remote Write & Retention

Local TSDB is for recent data (the compose example keeps `30d`). For long retention, HA, and global query, **remote-write** to a long-term backend (Mimir, Thanos, Cortex, or a vendor) instead of growing local disk forever:

```yaml
# add to prometheus.yml
remote_write:
  - url: https://mimir.internal/api/v1/push
    queue_config:
      max_shards: 50            # cap fan-out so a backend stall can't OOM Prometheus
      capacity: 10000
    # Don't ship churny, high-cardinality series to long-term storage:
    write_relabel_configs:
      - source_labels: [__name__]
        regex: 'go_gc_.*|process_.*'
        action: drop
```

Retention is controlled by flags, not config: `--storage.tsdb.retention.time=30d` (and/or `--storage.tsdb.retention.size=50GB`, whichever trips first). Rule of thumb for local disk: ~1-3 bytes/sample after compression × samples/s × retention.

### Cardinality Budget — the #1 way to blow up Prometheus

Every unique combination of label values is a separate time series. A single high-cardinality label (`user_id`, `request_id`, raw `url`, `email`) can create millions of series and OOM the server. **Budget it and watch it:**

```promql
# Total active series (your headline number — track it on a dashboard)
prometheus_tsdb_head_series

# Which metric names have the most series? (run in the Prometheus UI)
topk(10, count by (__name__)({__name__=~".+"}))

# Cardinality of a label across one metric — catch the offender
count(count by (path) (http_requests_total))     # how many distinct `path` values?

# Series being created/churned per second (high churn = expensive)
rate(prometheus_tsdb_head_series_created_total[5m])
```

Guardrails: keep `labelNames` small and bounded (templated paths like `/users/:id`, never raw IDs); set `sample_limit` per scrape job to fail loudly instead of silently exploding; drop noisy series with `metric_relabel_configs`. Treat any unbounded-value label as a bug.

### Recording Rules

Pre-compute expensive queries to speed up dashboards and to back multi-window SLO alerts. The error-ratio is recorded at every window the burn-rate alerts reference (5m/30m/1h/6h).

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

      # Extra windows so the burn-rate alerts below are self-contained.
      - record: job:http_error_ratio:rate30m
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[30m])) by (job)
          / sum(rate(http_requests_total[30m])) by (job)
      - record: job:http_error_ratio:rate1h
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[1h])) by (job)
          / sum(rate(http_requests_total[1h])) by (job)
      - record: job:http_error_ratio:rate6h
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[6h])) by (job)
          / sum(rate(http_requests_total[6h])) by (job)

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

Image tags below are pinned to the mid-2026 stable lines (Prometheus 3.x, Grafana 12.x, Loki 3.x, Tempo 2.x, OTel Collector 0.12x). **Always pin a real tag — never `:latest`** (`prom/prometheus:latest` notoriously still resolved to a 2.x image long after 3.0 shipped). Bump deliberately and check the vendor release pages: [Prometheus](https://github.com/prometheus/prometheus/releases), [Grafana](https://github.com/grafana/grafana/releases), [Loki/Tempo](https://github.com/grafana/loki/releases), [OTel Collector](https://github.com/open-telemetry/opentelemetry-collector-releases/releases).

```yaml
# docker-compose.monitoring.yml
services:
  prometheus:
    image: prom/prometheus:v3.5.0       # 3.x LTS line; verify latest at release page
    volumes:
      - ./prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./prometheus/recording-rules.yml:/etc/prometheus/recording-rules.yml
      - ./prometheus/alerting-rules.yml:/etc/prometheus/alerting-rules.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.retention.time=30d'
      - '--web.enable-lifecycle'
      - '--web.enable-otlp-receiver'     # Prometheus 3.x: ingest OTLP metrics directly
    ports:
      - '9090:9090'

  grafana:
    image: grafana/grafana:12.0.0        # 12.x line; verify latest at release page
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
    image: prom/alertmanager:v0.28.0
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    ports:
      - '9093:9093'

  loki:
    image: grafana/loki:3.5.0            # 3.x line; verify latest at release page
    ports:
      - '3100:3100'
    command: -config.file=/etc/loki/local-config.yaml

  # Trace backend — required for the Tempo datasource and trace-to-log correlation below.
  tempo:
    image: grafana/tempo:2.7.0           # 2.x line; verify latest at release page
    command: ['-config.file=/etc/tempo/tempo.yaml']
    volumes:
      - ./tempo/tempo.yaml:/etc/tempo/tempo.yaml
      - tempo-data:/var/tempo
    ports:
      - '3200:3200'                      # Tempo HTTP API (Grafana datasource)

  # Collector is the single OTLP ingress for apps; it fans out to Tempo (traces)
  # and Prometheus (metrics), and is where tail sampling lives (see below).
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.127.0  # contrib has tail_sampling
    command: ['--config=/etc/otelcol/config.yaml']
    volumes:
      - ./otel/collector.yaml:/etc/otelcol/config.yaml
    ports:
      - '4317:4317'                      # OTLP gRPC
      - '4318:4318'                      # OTLP HTTP

volumes:
  prometheus-data:
  grafana-data:
  tempo-data:
```

Minimal `tempo/tempo.yaml` so the service actually starts (single-binary, local storage — fine for dev, use object storage in prod):

```yaml
# tempo/tempo.yaml
server:
  http_listen_port: 3200
distributor:
  receivers:
    otlp:
      protocols:
        grpc: { endpoint: 0.0.0.0:4317 }
        http: { endpoint: 0.0.0.0:4318 }
storage:
  trace:
    backend: local
    local: { path: /var/tempo/blocks }
    wal: { path: /var/tempo/wal }
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
      # Logs → Traces: extract trace_id from JSON logs and link to Tempo.
      derivedFields:
        - datasourceUid: tempo
          matcherRegex: '"trace_id":"(\w+)"'
          name: TraceID
          url: '$${__value.raw}'

  - name: Tempo
    type: tempo
    access: proxy
    url: http://tempo:3200
    uid: tempo
    jsonData:
      # Traces → Logs: from a span, jump to the matching logs in Loki by trace_id.
      tracesToLogsV2:
        datasourceUid: loki
        filterByTraceID: true
        filterBySpanID: false
        tags: [{ key: 'service.name', value: 'job' }]
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

### Dashboard JSON (RED, as code)

Drop this file in `grafana/dashboards/` and the provider above auto-loads it. It's a trimmed but valid Grafana dashboard model showing the three RED panels driven by the recording rules. `${DS_PROMETHEUS}` is resolved from a dashboard variable so the JSON isn't tied to a specific datasource UID — the portable way to ship dashboards across environments.

```json
{
  "title": "HTTP Overview (RED)",
  "uid": "http-overview",
  "schemaVersion": 39,
  "tags": ["red", "http"],
  "time": { "from": "now-6h", "to": "now" },
  "templating": {
    "list": [
      { "name": "DS_PROMETHEUS", "type": "datasource", "query": "prometheus", "current": {} },
      { "name": "job", "type": "query", "datasource": "${DS_PROMETHEUS}",
        "query": "label_values(http_requests_total, job)", "includeAll": true, "multi": true }
    ]
  },
  "panels": [
    {
      "title": "Request rate (req/s)", "type": "timeseries",
      "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
      "datasource": "${DS_PROMETHEUS}",
      "targets": [
        { "expr": "sum(rate(http_requests_total{job=~\"$job\"}[5m])) by (job)",
          "legendFormat": "{{job}}" }
      ]
    },
    {
      "title": "Error ratio (%)", "type": "timeseries",
      "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 },
      "datasource": "${DS_PROMETHEUS}",
      "fieldConfig": { "defaults": { "unit": "percentunit",
        "thresholds": { "steps": [
          { "color": "green", "value": null }, { "color": "red", "value": 0.05 } ] } } },
      "targets": [
        { "expr": "job:http_error_ratio:rate5m{job=~\"$job\"}", "legendFormat": "{{job}}" }
      ]
    },
    {
      "title": "Latency p95 / p99 (s)", "type": "timeseries",
      "gridPos": { "h": 8, "w": 24, "x": 0, "y": 8 },
      "datasource": "${DS_PROMETHEUS}",
      "fieldConfig": { "defaults": { "unit": "s" } },
      "targets": [
        { "expr": "job:http_latency:p95_5m{job=~\"$job\"}", "legendFormat": "p95 {{job}}" },
        { "expr": "job:http_latency:p99_5m{job=~\"$job\"}", "legendFormat": "p99 {{job}}" }
      ]
    }
  ]
}
```

> Editing dashboards in the UI then committing the exported JSON is the normal loop. Strip the volatile `id`, `version`, and `__inputs` fields before committing so diffs stay clean, and keep a stable `uid` so deep links and alert annotations survive re-imports.

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
    # Modern Alertmanager uses `matchers:` (list of label-matcher strings).
    # The legacy `match:`/`match_re:` maps are deprecated — don't use them.
    - matchers:
        - severity = "critical"
      receiver: 'pagerduty-critical'
      repeat_interval: 1h
    - matchers:
        - severity = "warning"
      receiver: 'slack-warnings'
      repeat_interval: 4h

receivers:
  - name: 'slack-default'
    slack_configs:
      - api_url: '$SLACK_WEBHOOK_URL'   # store the real webhook in a secret, not in git
        channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      # PagerDuty Events API v2 uses `routing_key` (the Integration Key from a
      # service's "Events API v2" integration). `service_key` is the legacy v1 field.
      - routing_key: '$PAGERDUTY_ROUTING_KEY'
        severity: '{{ if eq .CommonLabels.severity "critical" }}critical{{ else }}error{{ end }}'
        description: '{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}'

  - name: 'slack-warnings'
    slack_configs:
      - api_url: '$SLACK_WARN_WEBHOOK_URL'
        channel: '#alerts-warnings'
```

---

## OpenTelemetry: Auto-Instrumentation

### Node.js Setup

> **APIs below target OpenTelemetry JS 2.x** (the line shipping since early 2025). The biggest gotcha vs. 1.x: the `Resource` class is no longer exported — use the `resourceFromAttributes()` / `defaultResource()` functions. If you're on 1.x and can't upgrade yet, swap those for `new Resource({...})`.

```typescript
// tracing.ts — the SDK must start BEFORE any instrumented library is required.
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
// OTel JS 2.x: build the Resource with the helper, not `new Resource(...)`.
import { resourceFromAttributes, defaultResource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
  ATTR_DEPLOYMENT_ENVIRONMENT_NAME,
} from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  // merge over the default resource so process/host/SDK attributes are kept.
  resource: defaultResource().merge(
    resourceFromAttributes({
      [ATTR_SERVICE_NAME]: process.env.SERVICE_NAME || 'api',
      [ATTR_SERVICE_VERSION]: process.env.APP_VERSION || '0.0.0',
      [ATTR_DEPLOYMENT_ENVIRONMENT_NAME]: process.env.NODE_ENV || 'development',
    }),
  ),
  // Point at the Collector's OTLP/HTTP ingress (otel-collector:4318), not Tempo directly.
  // OTEL_EXPORTER_OTLP_ENDPOINT should be the BASE url; the SDK appends /v1/traces etc.
  traceExporter: new OTLPTraceExporter(),
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 15000,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // ignoreIncomingRequestHook replaces the removed ignoreIncomingPaths option.
      '@opentelemetry/instrumentation-http': {
        ignoreIncomingRequestHook: (req) =>
          ['/healthz', '/ready', '/metrics'].includes(req.url ?? ''),
      },
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();
process.on('SIGTERM', () => { void sdk.shutdown(); });
```

**Loading it early enough is the part everyone gets wrong.** Auto-instrumentation works by monkey-patching modules as they're `require()`d, so the SDK must `.start()` *before* `http`, `pg`, `express`, etc. are first loaded. `import './tracing'` at the top of `index.ts` is **not** reliable: ES module imports are hoisted and evaluated together, so a sibling `import express` can run first. Load it out-of-band instead:

```bash
# CommonJS / ts-node: --require runs the file before your app module loads
node --require ./dist/tracing.js dist/index.js

# Native ESM (Node 18.19+/20.6+): --import is the ESM-safe equivalent of --require
node --import ./dist/tracing.js dist/index.js

# Or via env var (handy in Dockerfiles / k8s) — no code change to the entrypoint:
NODE_OPTIONS="--require ./dist/tracing.js" node dist/index.js
```

Set `OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318` (base URL) in the environment.

**Framework caveats — auto-instrumentation often can't run "before everything":**

- **Next.js:** don't use this bootstrap. Next has first-class OTel support: `npm i @vercel/otel` and export `register()` from `instrumentation.ts` at the project root. Next runs it in the Node runtime before request handling. (See sibling skill `nextjs-architecture`.)
- **Serverless (Lambda):** use the OTel Lambda layer / `AWS_LAMBDA_EXEC_WRAPPER`, not a long-lived `NodeSDK`; the process freezes between invocations and a `PeriodicExportingMetricReader` won't flush.
- **Bundled apps (esbuild/webpack):** bundling defeats `require`-time patching. Mark instrumented deps `external`, or use a build-time OTel plugin.

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

      // Nested span for the Stripe API call. Use PaymentIntents (the current API);
      // the legacy Charges API is not the default for new integrations.
      const result = await tracer.startActiveSpan('payment.stripe.payment_intent', async (stripeSpan) => {
        try {
          const intent = await stripe.paymentIntents.create({
            amount,                 // already in the smallest currency unit (cents)
            currency: 'usd',
            automatic_payment_methods: { enabled: true },
          });
          stripeSpan.setAttributes({
            'stripe.payment_intent_id': intent.id,
            'stripe.status': intent.status,
          });
          return intent;
        } catch (err) {
          // catch is `unknown` in TS strict mode — narrow before reading .message.
          const message = err instanceof Error ? err.message : String(err);
          stripeSpan.setStatus({ code: SpanStatusCode.ERROR, message });
          stripeSpan.recordException(err as Error);
          throw err;
        } finally {
          stripeSpan.end();
        }
      });

      span.setAttributes({ 'payment.status': 'success' });
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      span.setStatus({ code: SpanStatusCode.ERROR, message });
      span.recordException(err as Error);
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

        # Use PaymentIntents (current API), not the legacy Charge.create.
        with tracer.start_as_current_span("payment.stripe.payment_intent") as stripe_span:
            intent = stripe.PaymentIntent.create(
                amount=int(amount * 100),  # smallest currency unit (cents)
                currency="usd",
                automatic_payment_methods={"enabled": True},
            )
            stripe_span.set_attribute("stripe.payment_intent_id", intent.id)
            stripe_span.set_attribute("stripe.status", intent.status)
            return intent
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

**Head vs. tail — know which one you can actually use.** A *head* sampler decides at span **start**, before the request has run. At that moment the status code, latency, and most attributes don't exist yet — so a head sampler **cannot** "always keep errors." The common ask ("keep 10% of traffic but 100% of errors and slow requests") is a *tail* decision: it must run after the trace finishes, in the **OTel Collector's `tail_sampling` processor**, never in the SDK.

| | Head sampling (SDK) | Tail sampling (Collector) |
|---|---|---|
| Decides | at trace start | after trace completes |
| Can key on errors/latency? | No (not known yet) | Yes |
| Cost | cheap, no buffering | buffers all spans in memory until decision |
| Where | app process | collector (needs all spans of a trace at one collector) |

**Head sampling — the one thing it's good for (cheap, uniform rate):**

```typescript
import { TraceIdRatioBasedSampler, ParentBasedSampler } from '@opentelemetry/sdk-trace-base';

// Keep 10% of root traces; ALWAYS honor an upstream service's decision so a
// trace is either fully kept or fully dropped across services. Set on NodeSDK
// via `sampler:` (or env: OTEL_TRACES_SAMPLER=parentbased_traceidratio,
// OTEL_TRACES_SAMPLER_ARG=0.1).
const sampler = new ParentBasedSampler({
  root: new TraceIdRatioBasedSampler(0.1),
});
```

**Tail sampling — keep all errors + slow traces, downsample the boring ones.** This lives in the Collector (the `otel-collector` service above; the `-contrib` image has this processor). Apps export 100% to the collector; the collector decides what to keep:

```yaml
# otel/collector.yaml
receivers:
  otlp:
    protocols:
      grpc: { endpoint: 0.0.0.0:4317 }
      http: { endpoint: 0.0.0.0:4318 }

processors:
  # Buffer spans per trace, then apply policies once the trace is complete.
  # Size memory: num_traces ≈ expected_new_traces_per_sec × decision_wait × ~2.
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    expected_new_traces_per_sec: 1000
    policies:
      # 1) Keep every errored trace (status now known — this is the whole point of tail).
      - name: errors
        type: status_code
        status_code: { status_codes: [ERROR] }
      # 2) Keep every slow trace (> 1s end-to-end).
      - name: slow
        type: latency
        latency: { threshold_ms: 1000 }
      # 3) Otherwise keep a 10% probabilistic sample.
      - name: sample-the-rest
        type: probabilistic
        probabilistic: { sampling_percentage: 10 }

exporters:
  otlp/tempo:
    endpoint: tempo:4317
    tls: { insecure: true }              # in-cluster plaintext; use TLS across trust boundaries
  prometheusremotewrite:
    endpoint: http://prometheus:9090/api/v1/write   # Prometheus 3.x remote-write receiver

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling]
      exporters: [otlp/tempo]
    metrics:
      receivers: [otlp]
      exporters: [prometheusremotewrite]
```

> **Scaling caveat:** tail sampling requires *all spans of a trace to reach the same collector instance*. With more than one collector you need a two-tier setup — a routing/load-balancing layer that hashes on `trace_id` (the `loadbalancing` exporter) feeding a pool of tail-sampling collectors. A single replica is fine until you outgrow its memory.

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
sum(rate(http_requests_total[5m]))                      # Traffic
sum(rate(http_requests_total{status_code=~"5.."}[5m]))  # Errors
# Latency: ALWAYS sum buckets by (le) first, then take the quantile. Running
# histogram_quantile over raw per-series buckets gives per-series percentiles
# (one number per pod/path), which is almost never what you want.
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
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
