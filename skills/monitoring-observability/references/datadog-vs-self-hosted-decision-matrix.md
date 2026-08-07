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
