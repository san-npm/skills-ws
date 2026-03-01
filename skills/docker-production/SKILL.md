---
name: docker-production
description: "Production Docker: multi-stage builds, security hardening, Compose for production, secrets, networking, logging, and registry management."
---

# Docker Production

Production Docker patterns. Multi-stage builds that actually minimize image size, security hardening, Compose configs that survive real traffic, and debugging techniques.

---

## 1. Multi-Stage Builds

### Node.js

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production && \
    cp -R node_modules /prod_modules && \
    npm ci

# Stage 2: Build
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production
FROM node:20-alpine AS production
WORKDIR /app

# Security: non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

# Only production deps + build output
COPY --from=deps /prod_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./

# Use tini for proper signal handling (must run before USER directive)
RUN apk add --no-cache tini

# Don't run as root
USER appuser

EXPOSE 3000
ENV NODE_ENV=production

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/server.js"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
```

**Result:** ~150MB instead of ~1.2GB with naive approach.

### Python

```dockerfile
FROM python:3.12-slim AS build
WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

FROM python:3.12-slim AS production
WORKDIR /app

# Runtime dependencies only
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 tini && \
    rm -rf /var/lib/apt/lists/*

# Non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup -d /app appuser

COPY --from=build /install /usr/local
COPY . .

USER appuser
EXPOSE 8000
ENTRYPOINT ["tini", "--"]
CMD ["gunicorn", "app:create_app()", "-w", "4", "-b", "0.0.0.0:8000", "--access-logfile", "-"]

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1
```

### Go

```dockerfile
FROM golang:1.22-alpine AS build
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /server ./cmd/server

# Scratch image — literally nothing except your binary
FROM scratch AS production
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /server /server

EXPOSE 8080
ENTRYPOINT ["/server"]
```

**Result:** ~10MB image. No shell, no OS, nothing to exploit.

### Rust

```dockerfile
FROM rust:1.77-slim AS build
WORKDIR /app

# Cache dependencies (build empty project first)
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs
RUN cargo build --release && rm -rf src

# Build real app
COPY src ./src
RUN touch src/main.rs && cargo build --release

FROM debian:bookworm-slim AS production
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates tini && \
    rm -rf /var/lib/apt/lists/*

RUN groupadd -r app && useradd -r -g app app
COPY --from=build /app/target/release/myapp /usr/local/bin/

USER app
EXPOSE 8080
ENTRYPOINT ["tini", "--"]
CMD ["myapp"]
```

---

## 2. Security Hardening

### Non-root users (mandatory)

```dockerfile
# Alpine
RUN addgroup -g 1001 -S app && adduser -S app -u 1001 -G app
USER app

# Debian/Ubuntu
RUN groupadd -r app && useradd -r -g app -d /app app
USER app
```

### Read-only filesystem

```yaml
# docker-compose.yml
services:
  app:
    image: myapp:latest
    read_only: true
    tmpfs:
      - /tmp:noexec,nosuid,size=100m
      - /app/cache:noexec,nosuid,size=50m
    security_opt:
      - no-new-privileges:true
```

### Vulnerability scanning with Trivy

```bash
# Scan image
trivy image myapp:latest

# Scan and fail CI if HIGH/CRITICAL found
trivy image --exit-code 1 --severity HIGH,CRITICAL myapp:latest

# Scan Dockerfile
trivy config Dockerfile

# In GitHub Actions:
- name: Scan image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: myapp:${{ github.sha }}
    format: table
    exit-code: 1
    severity: HIGH,CRITICAL
```

### .dockerignore (don't ship your secrets)

```
.git
.github
.env
.env.*
node_modules
*.md
Dockerfile
docker-compose*.yml
.dockerignore
coverage
.nyc_output
__tests__
*.test.*
.vscode
.idea
```

### No `latest` tag — ever

```bash
# BAD: which version is "latest"? Nobody knows.
docker pull myapp:latest

# GOOD: semantic version or commit SHA
docker pull myapp:1.4.2
docker pull myapp:abc123f

# In CI, tag with both:
docker tag myapp:$SHA myapp:$VERSION
docker tag myapp:$SHA myapp:latest  # Only for convenience, never for deploys
```

---

## 3. Compose for Production

```yaml
# docker-compose.production.yml
version: "3.8"

services:
  app:
    image: registry.example.com/myapp:${VERSION}
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: "1.0"
          memory: 1G
        reservations:
          cpus: "0.25"
          memory: 256M
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
    env_file:
      - .env.production
    networks:
      - frontend
      - backend
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "5"
        tag: "{{.Name}}"
    read_only: true
    tmpfs:
      - /tmp:size=100m
    security_opt:
      - no-new-privileges:true

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: myapp
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myapp"]
      interval: 10s
      timeout: 5s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 4G
    shm_size: 256mb  # Important for PG performance
    networks:
      - backend
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  redis:
    image: redis:7-alpine
    command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru --appendonly yes
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 512M
    networks:
      - backend

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - app
    networks:
      - frontend
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 128M

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true  # No external access — only inter-service

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local

secrets:
  db_password:
    file: ./secrets/db_password.txt
```

---

## 4. Secrets Management

### Docker secrets (Swarm mode)

```bash
# Create secret
echo "my-database-password" | docker secret create db_password -

# Use in service
docker service create --secret db_password myapp

# In container, secret is at /run/secrets/db_password
```

### BuildKit secrets (build-time)

```dockerfile
# Don't bake secrets into layers!
# BAD:
COPY .npmrc /app/.npmrc
RUN npm ci
RUN rm /app/.npmrc  # Still in layer history!

# GOOD: BuildKit mount secret
RUN --mount=type=secret,id=npmrc,target=/app/.npmrc npm ci
# Secret never appears in any layer
```

```bash
docker build --secret id=npmrc,src=.npmrc -t myapp .
```

### Environment variable security

```bash
# BAD: secrets in docker-compose.yml or CLI
environment:
  - DB_PASSWORD=hunter2  # Visible in docker inspect

# BETTER: env_file (still visible in inspect, but not in source)
env_file:
  - .env.production

# BEST: Docker secrets + file reading
# In your app:
# const password = fs.readFileSync('/run/secrets/db_password', 'utf8').trim();
```

---

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

## 7. Debugging Production Containers

```bash
# View logs
docker logs myapp --tail 100 -f
docker logs myapp --since 30m

# Execute command in running container
docker exec -it myapp /bin/sh
docker exec myapp env  # Check environment

# Resource usage (CPU, memory, network, disk I/O)
docker stats myapp
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}"

# Events (container lifecycle)
docker events --filter container=myapp --since 1h

# Inspect everything
docker inspect myapp | jq '.[0].State'
docker inspect myapp | jq '.[0].NetworkSettings.Networks'

# Disk usage
docker system df
docker system df -v  # Verbose — shows per-image/container/volume

# Clean up
docker system prune -f             # Remove stopped containers, unused networks
docker image prune -a -f           # Remove all unused images
docker volume prune -f             # Remove unused volumes (careful!)
docker builder prune -f            # Remove build cache

# Copy files from container
docker cp myapp:/app/logs/error.log ./error.log

# Check why a container exited
docker inspect myapp --format '{{.State.ExitCode}} {{.State.Error}}'
```

### Debugging networking

```bash
# Check if service is listening
docker exec myapp netstat -tlnp
docker exec myapp ss -tlnp

# DNS resolution
docker exec myapp nslookup postgres

# Test connectivity
docker exec myapp wget -qO- http://api:3000/health
docker exec myapp curl -v telnet://postgres:5432

# Packet capture (needs NET_ADMIN capability)
docker exec myapp tcpdump -i eth0 port 5432 -nn
```

---

## 8. Private Registry

### Self-hosted with Docker Registry

```yaml
# registry/docker-compose.yml
services:
  registry:
    image: registry:2
    ports:
      - "5000:5000"
    volumes:
      - registry_data:/var/lib/registry
      - ./auth:/auth
      - ./certs:/certs
    environment:
      REGISTRY_AUTH: htpasswd
      REGISTRY_AUTH_HTPASSWD_REALM: "Registry Realm"
      REGISTRY_AUTH_HTPASSWD_PATH: /auth/htpasswd
      REGISTRY_HTTP_TLS_CERTIFICATE: /certs/domain.crt
      REGISTRY_HTTP_TLS_KEY: /certs/domain.key
      REGISTRY_STORAGE_DELETE_ENABLED: "true"
    deploy:
      resources:
        limits:
          memory: 512M

volumes:
  registry_data:
```

```bash
# Create auth file
docker run --entrypoint htpasswd httpd:2 -Bbn myuser mypassword > auth/htpasswd

# Login and push
docker login registry.example.com:5000
docker tag myapp registry.example.com:5000/myapp:1.0.0
docker push registry.example.com:5000/myapp:1.0.0
```

### Image signing with Cosign

```bash
# Install cosign
brew install cosign  # or: go install github.com/sigstore/cosign/v2/cmd/cosign@latest

# Generate key pair
cosign generate-key-pair

# Sign image
cosign sign --key cosign.key registry.example.com/myapp:1.0.0

# Verify
cosign verify --key cosign.pub registry.example.com/myapp:1.0.0
```

### Garbage collection

```bash
# Registry fills up fast. Run GC periodically:
docker exec registry bin/registry garbage-collect /etc/docker/registry/config.yml

# Or enable it in config:
# storage:
#   maintenance:
#     uploadpurging:
#       enabled: true
#       age: 168h  # 1 week
#       interval: 24h
```

---

## 9. When to Graduate from Compose

### Stay on Compose when:
- Single host deployment
- < 10 services
- Simple scaling needs (replicas via `deploy.replicas`)
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

## 10. Production Dockerfile Checklist

```markdown
- [ ] Multi-stage build (deps → build → production)
- [ ] Specific base image tag (node:20.11-alpine, not node:latest)
- [ ] .dockerignore includes .git, node_modules, .env, tests
- [ ] Non-root user (USER directive)
- [ ] HEALTHCHECK defined
- [ ] Signal handling (tini or dumb-init)
- [ ] No secrets in layers (use BuildKit secrets)
- [ ] COPY before RUN for better layer caching
- [ ] Single CMD (not multiple processes — use Compose)
- [ ] Trivy scan passes (no HIGH/CRITICAL vulnerabilities)
- [ ] Labels for metadata (version, build date, commit)
```

```dockerfile
# Good label practice
LABEL org.opencontainers.image.source="https://github.com/org/repo"
LABEL org.opencontainers.image.version="${VERSION}"
LABEL org.opencontainers.image.created="${BUILD_DATE}"
LABEL org.opencontainers.image.revision="${COMMIT_SHA}"
```
