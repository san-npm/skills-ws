## Contents

- 6. Logging
- JSON structured logging
- Docker logging drivers
- Log rotation (don't fill your disk)

## 6. Logging

### JSON structured logging

```typescript
// Use JSON logging — parseable by any log aggregator
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  // Don't pretty-print in production
  transport: process.env.NODE_ENV !== 'production'
    ? { target: 'pino-pretty' }
    : undefined,
});

// Structured context
logger.info({ userId: '123', action: 'login', ip: '1.2.3.4' }, 'User logged in');
// Output: {"level":"info","time":1234567890,"userId":"123","action":"login","msg":"User logged in"}
```

### Docker logging drivers

```yaml
# JSON file (default) — good for small deployments
logging:
  driver: json-file
  options:
    max-size: "10m"
    max-file: "5"

# Fluentd — forward to ELK/Loki
logging:
  driver: fluentd
  options:
    fluentd-address: localhost:24224
    tag: "docker.{{.Name}}"

# Loki — native Grafana integration
logging:
  driver: loki
  options:
    loki-url: "http://loki:3100/loki/api/v1/push"
    loki-batch-size: "400"
    loki-retries: "3"
```

### Log rotation (don't fill your disk)

```json
// /etc/docker/daemon.json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "5"
  }
}
```

---
