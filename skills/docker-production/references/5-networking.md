## Contents

- 5. Networking
- Custom networks for isolation
- Service discovery
- DNS resolution debugging

## 5. Networking

### Custom networks for isolation

```yaml
networks:
  # Frontend network — nginx + app
  frontend:
    driver: bridge

  # Backend network — app + db + redis
  # internal: true means no external access
  backend:
    driver: bridge
    internal: true

  # Monitoring network
  monitoring:
    driver: bridge
    internal: true
```

### Service discovery

```yaml
# Services on the same network can reach each other by service name
services:
  app:
    environment:
      - DATABASE_URL=postgresql://myapp:pass@postgres:5432/myapp
      - REDIS_URL=redis://redis:6379
    networks:
      - backend

  postgres:
    networks:
      - backend  # Reachable as "postgres" from app
```

### DNS resolution debugging

```bash
# Check DNS from inside a container
docker exec -it myapp nslookup postgres
docker exec -it myapp ping redis

# Inspect network
docker network inspect backend

# Check which networks a container is on
docker inspect myapp --format '{{json .NetworkSettings.Networks}}' | jq
```

---
