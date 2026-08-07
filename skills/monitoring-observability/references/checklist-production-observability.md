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
