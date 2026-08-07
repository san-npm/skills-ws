## First Response (< 5 minutes)
1. Check Grafana dashboard: https://grafana.internal/d/http-overview
2. Check if it's a single endpoint or service-wide
3. Check recent deployments: `kubectl rollout history deployment/app`
4. If a recent deploy correlates: `kubectl rollout undo deployment/app`
