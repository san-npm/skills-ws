## Rollback Procedures

```bash
# Kubernetes — roll back the last applied revision
kubectl rollout undo deployment/api
kubectl rollout status deployment/api --timeout=120s

# ECS — point the service back at the previous task-definition revision
aws ecs update-service --cluster prod --service api \
  --task-definition api:PREVIOUS_REVISION --force-new-deployment

# Vercel / Netlify — instant promote of the prior deployment
vercel rollback           # or: vercel promote <previous-deployment-url>
```

**Rollback checklist:**
1. Revert traffic immediately — do not debug in prod.
2. Verify the rollback with health checks / SLO dashboards.
3. Communicate in the incident channel (who, what, ETA).
4. Root-cause only after stability is restored.
5. Add a regression test that reproduces the failure before re-deploying the fix.
