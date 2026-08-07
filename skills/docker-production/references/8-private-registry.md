## Contents

- 8. Private Registry
- Self-hosted with Docker Registry
- Image signing with Cosign
- Garbage collection (causes downtime — schedule it)

## 8. Private Registry

### Self-hosted with Docker Registry

> For most teams, **don't self-host**: use a managed registry (GitHub Container Registry / GHCR, GitLab, AWS ECR, Google Artifact Registry, Docker Hub). They handle auth, TLS, replication, vuln scanning, and retention for you. Self-host only when you need air-gapped or on-prem control. The `registry:3` (CNCF Distribution) setup below is a baseline for that case.

```yaml
# registry/docker-compose.yml
services:
  registry:
    image: registry:3
    restart: unless-stopped
    # Bind to localhost only and terminate TLS at a reverse proxy (below), OR
    # publish 5000 and set the REGISTRY_HTTP_TLS_* vars to serve TLS directly.
    ports:
      - "127.0.0.1:5000:5000"
    volumes:
      - registry_data:/var/lib/registry
      - ./auth:/auth:ro
    environment:
      REGISTRY_AUTH: htpasswd
      REGISTRY_AUTH_HTPASSWD_REALM: "Registry Realm"
      REGISTRY_AUTH_HTPASSWD_PATH: /auth/htpasswd
      REGISTRY_STORAGE_DELETE_ENABLED: "true"   # required for GC to reclaim space
    deploy:
      resources:
        limits:
          memory: 512M

volumes:
  registry_data:
```

```bash
# Create the auth file. -B = bcrypt. Do NOT pass the password on the command line with -b:
# `htpasswd -Bbn user pass` leaks the password into your shell history and the process
# args (visible via `ps`/`docker inspect`). Use -i to read it from STDIN instead:
mkdir -p auth
read -rs -p "Registry password: " REG_PW && echo
printf '%s' "$REG_PW" | docker run --rm -i --entrypoint htpasswd httpd:2 -iBn myuser > auth/htpasswd
unset REG_PW
chmod 600 auth/htpasswd            # readers: registry only
#   (-b reads from CLI = leak; -i reads from STDIN = safe. Keep -i for real credentials.)

# Login and push (you'll be prompted for the password, not pass it as an arg)
docker login registry.example.com
docker tag myapp registry.example.com/myapp:1.0.0
docker push registry.example.com/myapp:1.0.0
```

**Terminate TLS at a reverse proxy** (Caddy/Nginx/Traefik) rather than juggling cert files in the registry env — you get automatic Let's Encrypt renewal and HTTP/2:

```caddyfile
# Caddyfile — Caddy auto-provisions + renews the TLS cert
registry.example.com {
    reverse_proxy 127.0.0.1:5000
    request_body { max_size 0 }   # don't cap large image-layer uploads
}
```

### Image signing with Cosign

Prefer **keyless** signing in CI (see §4b) — no private key to store or rotate. The keypair flow below is for local/offline use; if you keep a key, store it in a secrets manager (not the repo) and protect it with `COSIGN_PASSWORD`:

```bash
# Install cosign
brew install cosign  # or: go install github.com/sigstore/cosign/v2/cmd/cosign@latest

# Keyless (recommended) — signs against your OIDC identity:
cosign sign --yes registry.example.com/myapp:1.0.0

# Keypair (offline) — guard the private key:
cosign generate-key-pair                                   # creates cosign.key (KEEP SECRET) + cosign.pub
cosign sign --key cosign.key registry.example.com/myapp:1.0.0
cosign verify --key cosign.pub registry.example.com/myapp:1.0.0
```

### Garbage collection (causes downtime — schedule it)

Deleting a tag only removes the *reference*; the blobs stay until GC runs. **GC requires the registry to be read-only** for correctness — concurrent pushes during GC can corrupt or lose layers. Treat it as a maintenance window:

```bash
# 1. Put the registry in read-only mode (REGISTRY_STORAGE_MAINTENANCE_READONLY_ENABLED=true)
#    or stop pushes, then run GC. -m also purges now-unreferenced manifests:
docker exec registry bin/registry garbage-collect --delete-untagged \
    /etc/distribution/config.yml
# 2. Restart in read-write mode.

# Retention: registry:3 has no built-in tag retention. Prune old tags out-of-band before GC,
# e.g. with a script over the v2 API, or run a tool with policies (Harbor, JFrog) for real RBAC,
# replication, scanning, and tag-retention rules — graduate to one of those at scale.
```

> Enabling upload purging (clears *stalled* uploads, not old tags) in `config.yml`:
> ```yaml
> storage:
>   maintenance:
>     uploadpurging:
>       enabled: true
>       age: 168h        # 1 week
>       interval: 24h
> ```

---
