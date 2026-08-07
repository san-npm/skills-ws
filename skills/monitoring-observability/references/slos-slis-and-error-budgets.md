## Contents

- SLOs, SLIs, and Error Budgets
- Defining SLIs
- SLO Targets and Error Budgets
- Burn Rate Alerts

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
