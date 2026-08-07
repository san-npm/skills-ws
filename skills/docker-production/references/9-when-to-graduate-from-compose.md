## Contents

- 9. When to Graduate from Compose
- Stay on Compose when:
- Move to Kubernetes when:
- Move to ECS/Fargate when:
- Hybrid approach (common):

## 9. When to Graduate from Compose

### Stay on Compose when:
- Single host deployment
- < 10 services
- Simple scaling needs (`docker compose up --scale app=N` behind a proxy; or `docker stack deploy` to a one-node Swarm if you want `deploy.replicas`)
- Team is small and doesn't need multi-host

### Move to Kubernetes when:
- Multi-host / multi-region required
- Need auto-scaling based on metrics
- Zero-downtime rolling updates are critical
- Service mesh (mTLS between services)
- Team has K8s expertise

### Move to ECS/Fargate when:
- Want managed orchestration without K8s complexity
- Already on AWS
- Need auto-scaling but not the full K8s feature set
- Small team, want less operational overhead

### Hybrid approach (common):

```bash
# Use Compose for development
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Use Compose for staging (single host)
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d

# Use ECS/K8s for production
# Same Dockerfiles, different orchestration
```

---
