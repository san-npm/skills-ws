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
