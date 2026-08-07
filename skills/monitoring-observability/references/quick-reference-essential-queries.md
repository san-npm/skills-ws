## Contents

- Quick Reference: Essential Queries
- Prometheus
- Loki (LogQL)

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
