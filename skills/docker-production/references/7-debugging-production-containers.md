## Contents

- 7. Debugging Production Containers
- Debugging networking

## 7. Debugging Production Containers

```bash
# View logs
docker logs myapp --tail 100 -f
docker logs myapp --since 30m

# Execute command in running container
docker exec -it myapp /bin/sh

# Check environment — but DON'T dump it all: `docker exec myapp env`, `docker inspect`,
# and process args all expose secrets (DB passwords, API keys, tokens) to anyone with
# host/Docker access, and may land in logs/screen-shares. Inspect ONE non-secret key:
docker exec myapp printenv NODE_ENV
# Confirm a secret was MOUNTED (correct pattern) without printing its value:
docker exec myapp test -f /run/secrets/db_password && echo "secret present"

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

# Clean up — DESTRUCTIVE. On a prod host, dry-run/scope first; `-f` skips the confirm prompt.
# Run WITHOUT -f so Docker prints what it will delete and asks y/N:
docker system prune                # stopped containers + unused networks + dangling images (prompts)
docker image prune                 # dangling (untagged) images only — safe-ish
#   `image prune -a` removes EVERY image not used by a running container — including ones
#   you'll redeploy in 5 minutes. Scope by age instead of nuking everything:
docker image prune -a --filter "until=168h"     # only images older than 7 days
docker builder prune --filter "until=168h"      # trim build cache older than 7 days

# `docker volume prune` DELETES DATA. Never run blanket on a host with stateful services
# (Postgres/Redis volumes). List first, then remove a specific volume by name:
docker volume ls
docker volume rm <explicit_volume_name>          # never `volume prune -f` in prod

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
