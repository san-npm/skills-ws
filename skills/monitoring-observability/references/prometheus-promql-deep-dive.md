## Contents

- Prometheus: PromQL Deep Dive
- Metric Types and When to Use Each
- PromQL: Queries You'll Actually Use
- Scrape Config & Service Discovery
- Long-Term Storage: Remote Write & Retention
- Cardinality Budget — the #1 way to blow up Prometheus
- Recording Rules
- Alerting Rules

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

# Apdex score (satisfied < 0.5s, tolerating < 2.5s)
(
  sum(rate(http_request_duration_seconds_bucket{le="0.5"}[5m]))
  + sum(rate(http_request_duration_seconds_bucket{le="2.5"}[5m]))
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
