## 3. Compose for Production

> **No top-level `version:` key.** It's **obsolete** under the current **Compose Specification** (Compose v2, the `docker compose` plugin) — Compose now warns `the attribute version is obsolete, it will be ignored`. Delete it. Likewise the `docker-compose` (v1, Python, hyphenated) binary is **EOL**; use `docker compose` (space).
>
> **`deploy:` is mostly Swarm-only.** A plain `docker compose up` on a single host **ignores** `deploy.replicas`, `deploy.restart_policy`, `deploy.update_config`, `deploy.rollback_config`, and `deploy.placement`; those only take effect under `docker stack deploy` (Swarm). The only `deploy` fields single-host Compose honors are **`deploy.resources.limits`** (cpus/memory → container limits) and **`deploy.resources.reservations`** (soft). For single-host equivalents use top-level **`restart:` `unless-stopped`** (not `deploy.restart_policy`) and run multiple instances with `docker compose up --scale app=3` behind a load balancer (though for real replicas/rolling updates you want Swarm, K8s, or ECS, see §9). The keys below are annotated with which mode honors them.

```yaml
# docker-compose.production.yml  — Compose Specification (no version: key)
services:
  app:
    image: registry.example.com/myapp:${VERSION}        # require an explicit tag; never :latest
    restart: unless-stopped                              # single-host restart (honored by `compose up`)
    deploy:
      # replicas/restart_policy below are SWARM-ONLY — ignored by `docker compose up`.
      # Kept for `docker stack deploy`; on a single host use `--scale app=3` + the
      # top-level `restart:` above instead.
      replicas: 3                                        # SWARM ONLY
      resources:
        limits:                                          # HONORED by single-host compose
          cpus: "1.0"
          memory: 1G
        reservations:                                    # HONORED (soft) by single-host compose
          cpus: "0.25"
          memory: 256M
      restart_policy:                                    # SWARM ONLY
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
    image: postgres:17-alpine    # 18 once your extensions (pgvector, PostGIS, etc.) ship 18 builds
    restart: unless-stopped
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
    image: redis:8-alpine        # or valkey/valkey:8-alpine — the BSD-licensed fork, drop-in for most uses
    restart: unless-stopped
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
    restart: unless-stopped
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
