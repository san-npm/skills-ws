## 10. Debugging ECS in Production

```bash
# Open an interactive shell via ECS Exec (Session Manager, NOT SSH).
# Requires: enable_execute_command on the service, the four ssmmessages:* perms
# on the TASK role (section 2), and a shell in the image. Distroless/no-shell
# images have no /bin/sh — bake in a debug shell or use an ephemeral sidecar.
aws ecs execute-command --cluster myapp-prod --task TASK_ID \
  --container app --interactive --command /bin/sh

# Verify Exec is actually enabled on a running task (look for enableExecuteCommand):
aws ecs describe-tasks --cluster myapp-prod --tasks TASK_ARN \
  --query 'tasks[0].enableExecuteCommand'

# Tail logs
aws logs tail /ecs/myapp-production/app --since 30m --follow

# Check why tasks are failing
aws ecs describe-tasks --cluster myapp-prod --tasks TASK_ARN \
  --query 'tasks[0].stoppedReason'

# Force redeploy (ECS rolling controller only — a CODE_DEPLOY service rejects
# this; trigger a CodeDeploy deployment instead, see section 5 variant A).
aws ecs update-service --cluster myapp-prod --service myapp-prod --force-new-deployment
```

---
