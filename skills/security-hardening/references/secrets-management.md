## Contents

- Secrets Management
- Why Not Environment Variables?
- Vault Pattern

## Secrets Management

### Why Not Environment Variables?

```bash
# Environment variables leak:
# 1. Process listing: ps auxe shows the environment of your own processes (root sees all)
# 2. Error logs: unhandled exception dumps process.env
# 3. Docker inspect: docker inspect container_id
# 4. /proc filesystem: cat /proc/<pid>/environ
# 5. Child processes inherit all env vars
```

### Vault Pattern

```typescript
// Use a secrets manager, inject at runtime
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManagerClient({ region: 'us-east-1' });

async function getSecret(secretId: string): Promise<string> {
  const command = new GetSecretValueCommand({ SecretId: secretId });
  const response = await client.send(command);
  return response.SecretString!;
}

// At app startup
const dbPassword = await getSecret('prod/database/password');
const jwtSecret = await getSecret('prod/jwt-secret');

// Rotation: AWS Secrets Manager supports automatic rotation
// Set rotation schedule in AWS Console or via CloudFormation
```

---
