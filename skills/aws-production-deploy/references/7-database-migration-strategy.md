## Contents

- 7. Database Migration Strategy
- Safe migration pattern:
- Dangerous vs safe:
- Rollback:

## 7. Database Migration Strategy

**Golden rule: migrations must be backward-compatible.** Old and new code run simultaneously during deployment.

### Safe migration pattern:
```
Deploy 1: ADD new column (nullable)
Deploy 2: Write to BOTH columns
Deploy 3: Backfill old rows in batches
Deploy 4: Read from new column only
Deploy 5: DROP old column
```

### Dangerous vs safe:
```sql
-- NEVER (locks table):
ALTER TABLE users ADD COLUMN verified boolean NOT NULL DEFAULT false;

-- SAFE (two steps):
ALTER TABLE users ADD COLUMN verified boolean;
-- Backfill in batches:
UPDATE users SET verified = false WHERE verified IS NULL AND id BETWEEN $1 AND $2;
-- Then:
ALTER TABLE users ALTER COLUMN verified SET DEFAULT false;
ALTER TABLE users ALTER COLUMN verified SET NOT NULL;
```

### Rollback:
```bash
aws ecs describe-services --cluster myapp-prod --services myapp-prod \
  --query 'services[0].taskDefinition' --output text > /tmp/last-good
# If things break:
aws ecs update-service --cluster myapp-prod --service myapp-prod \
  --task-definition $(cat /tmp/last-good) --force-new-deployment
```

---
