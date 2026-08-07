## Mitigation
- **Bad deploy:** Roll back immediately
- **Database overload:** Enable read replicas, kill long queries
- **External dependency:** Enable circuit breaker, serve degraded
- **Traffic spike:** Scale up pods: `kubectl scale deployment/app --replicas=10`
