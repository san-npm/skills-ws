## Contents

- Grafana: Dashboard as Code
- Provisioning with Docker Compose
- Grafana Datasource Provisioning
- Dashboard Provisioning
- Dashboard JSON (RED, as code)
- Alertmanager Routing

## Grafana: Dashboard as Code

### Provisioning with Docker Compose

Image tags below are pinned to the mid-2026 stable lines (Prometheus 3.x, Grafana 13.x, Loki 3.x, Tempo 3.x, OTel Collector 0.15x). **Always pin a real tag, never `:latest`** (`prom/prometheus:latest` notoriously still resolved to a 2.x image long after 3.0 shipped). Bump deliberately and check the vendor release pages: [Prometheus](https://github.com/prometheus/prometheus/releases), [Grafana](https://github.com/grafana/grafana/releases), [Loki/Tempo](https://github.com/grafana/loki/releases), [OTel Collector](https://github.com/open-telemetry/opentelemetry-collector-releases/releases).

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
      - '--web.enable-remote-write-receiver'  # required for the collector's prometheusremotewrite exporter (off by default)
    ports:
      - '9090:9090'

  grafana:
    image: grafana/grafana:13.1.0        # 13.x line; verify latest at release page
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
    image: prom/alertmanager:v0.33.1
    volumes:
      - ./alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    ports:
      - '9093:9093'

  loki:
    image: grafana/loki:3.7.3            # 3.x line; verify latest at release page
    ports:
      - '3100:3100'
    command: -config.file=/etc/loki/local-config.yaml

  # Trace backend — required for the Tempo datasource and trace-to-log correlation below.
  tempo:
    image: grafana/tempo:3.0.2           # 3.x line; verify latest at release page
    command: ['-config.file=/etc/tempo/tempo.yaml']
    volumes:
      - ./tempo/tempo.yaml:/etc/tempo/tempo.yaml
      - tempo-data:/var/tempo
    ports:
      - '3200:3200'                      # Tempo HTTP API (Grafana datasource)

  # Collector is the single OTLP ingress for apps; it fans out to Tempo (traces)
  # and Prometheus (metrics), and is where tail sampling lives (see below).
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.156.0  # contrib has tail_sampling
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
      # Alertmanager does NOT expand env vars in its config: use the *_file
      # fields and mount the secret files at deploy time (compose secrets or a volume).
      - api_url_file: /etc/alertmanager/secrets/slack_webhook_url
        channel: '#alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'

  - name: 'pagerduty-critical'
    pagerduty_configs:
      # PagerDuty Events API v2 uses `routing_key` (the Integration Key from a
      # service's "Events API v2" integration). `service_key` is the legacy v1 field.
      - routing_key_file: /etc/alertmanager/secrets/pagerduty_routing_key
        severity: '{{ if eq .CommonLabels.severity "critical" }}critical{{ else }}error{{ end }}'
        description: '{{ .GroupLabels.alertname }}: {{ .CommonAnnotations.summary }}'

  - name: 'slack-warnings'
    slack_configs:
      - api_url_file: /etc/alertmanager/secrets/slack_warn_webhook_url
        channel: '#alerts-warnings'
```

---
