## Contents

- Rollback Strategies
- Kubernetes Health Check Rollback
- Database Migration Rollback

## Rollback Strategies

### Kubernetes Health Check Rollback

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app
spec:
  replicas: 3
  revisionHistoryLimit: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Zero-downtime
  template:
    spec:
      containers:
        - name: app
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 15
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3
          startupProbe:
            httpGet:
              path: /healthz
              port: 8080
            failureThreshold: 30
            periodSeconds: 2
```

Manual rollback:
```bash
kubectl rollout undo deployment/app --namespace=production
kubectl rollout undo deployment/app --to-revision=3 --namespace=production
```

### Database Migration Rollback

**Rule:** Every migration must be reversible.

```typescript
// migrations/20240301_add_user_email_verified.ts
import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.boolean('email_verified').nullable().defaultTo(null);
  });
  await knex.raw(`
    UPDATE users SET email_verified = true WHERE confirmed_at IS NOT NULL
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('email_verified');
  });
}
```

**Expand-contract pattern for breaking schema changes:**

1. **Expand:** Add new column, dual-write to both old and new
2. **Migrate:** Backfill data from old to new
3. **Switch:** Read from new column
4. **Contract:** Drop old column (separate deploy, days later)

---
