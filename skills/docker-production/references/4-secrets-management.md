## Contents

- 4. Secrets Management
- Compose file-based secrets (single host, no Swarm needed)
- Docker secrets (Swarm mode)
- BuildKit secrets (build-time)
- Environment variable security

## 4. Secrets Management

### Compose file-based secrets (single host, no Swarm needed)

The Compose Specification supports `secrets:` on plain `docker compose up` — each secret is mounted **read-only at `/run/secrets/<name>`**, never placed in the environment or `inspect` output. This is what the §3 compose file uses for `db_password`. Prefer this over `environment:` for anything sensitive:

```yaml
services:
  app:
    secrets:
      - db_password          # available at /run/secrets/db_password (mode 0444)
secrets:
  db_password:
    file: ./secrets/db_password.txt    # chmod 600, gitignored
    # or, to read from the host env instead of a file:
    # environment: DB_PASSWORD          # Compose Spec >= 2.x
```

In your app, read the file — and prefer the `*_FILE` convention many official images support (`POSTGRES_PASSWORD_FILE`, etc.) so the secret never transits an env var:

```js
const password = fs.readFileSync(process.env.DB_PASSWORD_FILE ?? '/run/secrets/db_password', 'utf8').trim();
```

### Docker secrets (Swarm mode)

```bash
# Create secret from stdin (don't pass it as a CLI arg — args leak via `ps`/history)
printf '%s' "$DB_PASSWORD" | docker secret create db_password -

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

# BEST: Compose/Swarm secrets + file reading (never in env, never in inspect)
# In your app:
# const password = fs.readFileSync('/run/secrets/db_password', 'utf8').trim();
```

> `env_file:` keeps secrets out of your *source*, but they are still visible to anyone who can run `docker inspect <container>` or read `/proc/<pid>/environ` on the host. Treat env vars as **non-secret config** (ports, feature flags, log level) and route real credentials through file-based secrets above.

---
