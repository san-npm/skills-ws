## Contents

- Multi-Node Fleet Management
- Fleet Deployment Orchestrator
- Fleet Management Commands

## Multi-Node Fleet Management

### Fleet Deployment Orchestrator

**Master Deployment Script:**
**Before you run this:** generate ONE persistent `FLEET_API_KEY` locally and export it. Both the deploy script and the fleet manager must use the *same* key, and it must survive restarts (the manager must not invent a new random key each boot).

```bash
# Generate once and store it safely (NOT in git, NOT in shell history files):
export FLEET_API_KEY="$(openssl rand -hex 32)"
echo "FLEET_API_KEY=$FLEET_API_KEY" >> ~/.aleph-deploy/configs/fleet.env   # chmod 600 this file
chmod 600 ~/.aleph-deploy/configs/fleet.env
```

```bash
#!/bin/bash
# deploy-fleet.sh
set -euo pipefail

# Fleet Configuration
FLEET_NAME="${1:-openclaw-fleet}"
NODE_COUNT="${2:-5}"
SSH_KEY="${ALEPH_SSH_KEY:-$HOME/.aleph-deploy/keys/aleph_ed25519}"
SSH_USER="${ALEPH_SSH_USER:-root}"
: "${FLEET_API_KEY:?Set FLEET_API_KEY (see fleet.env) before deploying}"

# Pin CRNs you have ACTUALLY verified with crn-discovery.sh. Leave empty to let
# the CLI auto-select. Never list non-compute services here (a storage gateway
# or NFT pinning API is NOT a CRN and cannot host an instance).
PRIMARY_CRN="${PRIMARY_CRN:-}"                 # e.g. https://<verified-crn-host>
WORKER_CRNS=(${WORKER_CRNS:-})                 # e.g. ("https://<crn-a>" "https://<crn-b>")

echo "Deploying fleet: $FLEET_NAME with $NODE_COUNT nodes"

# Fleet configuration. worker_nodes entries WILL record ip + item_hash (added at
# create time) so networking/backup/security scripts can find every worker.
cat > ~/.aleph-deploy/configs/fleet.json << EOF
{
  "fleet_name": "$FLEET_NAME",
  "deployment_date": "$(date -Iseconds)",
  "node_count": $NODE_COUNT,
  "ssh_user": "$SSH_USER",
  "primary_node": null,
  "worker_nodes": [],
  "network": {
    "ssh_tunnel_port": 2222,
    "load_balancer_port": 8080
  },
  "replication": {
    "enabled": true,
    "sync_interval": 300,
    "backup_retention": 7
  }
}
EOF

deploy_primary_node() {
    echo "📊 Deploying Primary Node (Orchestrator)..."
    
    local node_name="${FLEET_NAME}-primary"
    # The primary setup script is parameterized with the (persistent) fleet key so
    # the manager and workers share ONE key. We export it into the heredoc env.
    local setup_script
    setup_script=$(FLEET_API_KEY="$FLEET_API_KEY" envsubst '$FLEET_API_KEY' << 'PRIMARY_SETUP'
#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# Standard VM setup. Modern package set: Docker Engine + Compose v2 plugin
# (installed via get.docker.com below), Node 22 via NodeSource, iproute2 for `ss`.
apt-get update && apt-get -y upgrade
apt-get install -y curl wget git htop jq fail2ban ufw ca-certificates iproute2 gettext-base

curl -fsSL https://get.docker.com -o /tmp/get-docker.sh && sh /tmp/get-docker.sh
installer_1="$(mktemp)"
curl -fsSL https://deb.nodesource.com/setup_22.x -o "$installer_1"
less "$installer_1"  # Review before execution; verify the release checksum/signature when published.
bash "$installer_1" - && apt-get install -y nodejs

# Create a dedicated non-root user for fleet services. Running all services as
rm -f "$installer_1"
# root is a security risk — a compromise in any service gives full system access.
useradd -r -s /usr/sbin/nologin -d /opt/fleet-manager fleetmgr || true

# Install fleet management tools
mkdir -p /opt/fleet-manager
cd /opt/fleet-manager

# Fleet Manager Application
cat > fleet-manager.js << 'FLEET_MANAGER'
const express = require('express');
const fs = require('fs');
const app = express();

app.use(express.json());

// API key auth. The key MUST be provided via the environment (root-owned
// EnvironmentFile, see below) so it is stable across restarts and is never
// generated/logged. Fail fast if it is missing rather than minting a random one.
const FLEET_API_KEY = process.env.FLEET_API_KEY;
if (!FLEET_API_KEY || FLEET_API_KEY.length < 32) {
    console.error('FATAL: FLEET_API_KEY env var missing or too short. Refusing to start.');
    process.exit(1);
}
// Constant-time comparison; header-only (never accept keys in the query string —
// URLs are logged and cached, leaking the secret).
const crypto = require('crypto');
function keyMatches(provided) {
    if (typeof provided !== 'string') return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(FLEET_API_KEY);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function requireAuth(req, res, next) {
    if (!keyMatches(req.headers['x-api-key'])) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// Health check FIRST and UNAUTHENTICATED — HAProxy/`option httpchk` calls this
// without an API key. Keep it non-sensitive (no node data).
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Everything below requires the API key.
app.use(requireAuth);

// Fleet status endpoint
app.get('/fleet/status', (req, res) => {
    try {
        const data = fs.readFileSync('/opt/fleet-manager/nodes.json', 'utf8');
        res.json(JSON.parse(data));
    } catch (err) {
        if (err.code === 'ENOENT') {
            res.json({ nodes: [] });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

// (Health check is defined above, before requireAuth, so HAProxy/httpchk can
// reach it without an API key. Do not re-add an authenticated /health here.)

// Node registration endpoint
app.post('/fleet/register', (req, res) => {
    const { node_id, ip_address, capabilities, item_hash } = req.body;

    let fleet;
    try {
        fleet = JSON.parse(fs.readFileSync('/opt/fleet-manager/nodes.json', 'utf8'));
    } catch {
        fleet = { nodes: [] };
    }

    // Update or add node. We persist item_hash (the Aleph instance hash captured
    // at create time) so the autoscale/auto-recreate paths can delete/recreate
    // this exact instance later. Heartbeats omit item_hash, so on re-register we
    // preserve whatever hash we already stored for this node.
    const existingIndex = fleet.nodes.findIndex(n => n.node_id === node_id);
    const prior = existingIndex >= 0 ? fleet.nodes[existingIndex] : {};
    const nodeData = {
        node_id,
        ip_address,
        capabilities,
        item_hash: item_hash || prior.item_hash || null,
        last_seen: new Date().toISOString(),
        status: 'active'
    };

    if (existingIndex >= 0) {
        fleet.nodes[existingIndex] = nodeData;
    } else {
        fleet.nodes.push(nodeData);
    }

    fs.writeFileSync('/opt/fleet-manager/nodes.json', JSON.stringify(fleet, null, 2));
    res.json({ success: true });
});

// Load distribution endpoint
app.get('/fleet/distribute/:task', (req, res) => {
    const task = req.params.task;
    let nodes;
    try {
        nodes = JSON.parse(fs.readFileSync('/opt/fleet-manager/nodes.json', 'utf8'));
    } catch {
        nodes = { nodes: [] };
    }
    
    // Simple round-robin distribution
    const activeNodes = nodes.nodes.filter(n => n.status === 'active');
    if (activeNodes.length === 0) {
        return res.status(503).json({ error: 'No active nodes available' });
    }
    
    const assignedNode = activeNodes[Math.floor(Math.random() * activeNodes.length)];
    res.json({ 
        task,
        assigned_node: assignedNode.node_id,
        node_ip: assignedNode.ip_address 
    });
});

const PORT = process.env.PORT || 8080;
// Bind to the Tailscale interface (or localhost) — NEVER 0.0.0.0. The systemd
// unit sets BIND_HOST to the node's Tailscale IP so workers on the mesh can
// register, while the public internet cannot reach the control plane.
const BIND_HOST = process.env.BIND_HOST || '127.0.0.1';
app.listen(PORT, BIND_HOST, () => {
    console.log(`Fleet Manager listening on ${BIND_HOST}:${PORT}`);
});
FLEET_MANAGER

# Install dependencies and start fleet manager
npm init -y
npm install express
chmod +x fleet-manager.js

# Provision the SHARED, PERSISTENT FLEET_API_KEY via a root-owned EnvironmentFile.
# The key was injected into this setup script by deploy-fleet.sh (envsubst) and is
# never logged. BIND_HOST is resolved to the Tailscale IP after the mesh is up
# (a drop-in updates it; until then it stays on localhost).
install -o root -g root -m 600 /dev/null /etc/fleet-manager.env
{
  echo "FLEET_API_KEY=${FLEET_API_KEY}"
  echo "PORT=8080"
  echo "BIND_HOST=127.0.0.1"
} > /etc/fleet-manager.env

# Create systemd service
cat > /etc/systemd/system/fleet-manager.service << 'SERVICE'
[Unit]
Description=OpenClaw Fleet Manager
After=network.target

[Service]
Type=simple
User=fleetmgr
WorkingDirectory=/opt/fleet-manager
EnvironmentFile=/etc/fleet-manager.env
ExecStart=/usr/bin/node fleet-manager.js
Restart=always
RestartSec=10
# Harden: no new privileges, read-only system except its own dir.
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=/opt/fleet-manager

[Install]
WantedBy=multi-user.target
SERVICE

# Set ownership so fleetmgr user can read/write
chown -R fleetmgr:fleetmgr /opt/fleet-manager

# Initialize nodes registry BEFORE starting fleet-manager.
# fleet-manager.js reads this file on startup — if it doesn't exist,
# the readFileSync call will throw ENOENT and crash the service.
echo '{"nodes": []}' > /opt/fleet-manager/nodes.json
chown fleetmgr:fleetmgr /opt/fleet-manager/nodes.json

systemctl daemon-reload
systemctl enable fleet-manager
systemctl start fleet-manager

# Install OpenClaw on the primary (official installer + onboarding daemon).
# Docs: https://docs.openclaw.ai/install . Requires Node >= 22.19 (installed above).
installer_2="$(mktemp)"
curl -fsSL https://openclaw.ai/install.sh -o "$installer_2"
less "$installer_2"  # Review before execution; verify the release checksum/signature when published.
bash "$installer_2"
# `openclaw onboard --install-daemon` is interactive; run it manually (or with a
rm -f "$installer_2"
# pre-seeded config/secret store) to create the systemd daemon. Do NOT hand-write
# /opt/openclaw/config/*.json — OpenClaw manages its own config via onboard.

echo "Primary node base setup complete (fleet-manager active on Tailscale)."
PRIMARY_SETUP
    )

    # Create the instance with CURRENT flags, then provision over SSH (the Python
    # aleph-client has no --setup-script / --image-ref / --disk-size / --crn; the
    # rewritten aleph-cli does have --disk-size). See `... create --help`.
    local create_args=(
        --name "$node_name"
        --compute-units 4 --memory 8192
        --rootfs-size 81920
        --ssh-pubkey-file "$SSH_KEY.pub"
        --payment-type credit --payment-chain BASE
        --persistent-volume "name=fleet,mount=/opt/fleet-manager,size_mib=10240"
    )
    [[ -n "$PRIMARY_CRN" ]] && create_args+=(--crn-url "$PRIMARY_CRN" --crn-auto-tac)

    local out item_hash primary_ip
    out="$(aleph instance create "${create_args[@]}")"
    echo "$out"
    item_hash="$(printf '%s\n' "$out" | grep -oE '[0-9a-f]{64}' | head -1)"
    primary_ip="$(wait_for_ip "$node_name")" || { echo "Primary got no IP"; return 1; }

    # Provision over SSH using the injected, persistent FLEET_API_KEY.
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER@$primary_ip" \
        "FLEET_API_KEY='$FLEET_API_KEY' bash -s" <<< "$setup_script"

    # Record name, IP, and item_hash so every later script can reach/destroy it.
    local tmpfile; tmpfile="$(mktemp)"
    jq --arg n "$node_name" --arg ip "$primary_ip" --arg h "$item_hash" \
       '.primary_node = {name:$n, ip:$ip, item_hash:$h}' \
       ~/.aleph-deploy/configs/fleet.json > "$tmpfile"
    mv "$tmpfile" ~/.aleph-deploy/configs/fleet.json

    echo "Primary node deployed: $primary_ip ($item_hash)"
    return 0
}

# Poll the REAL `aleph instance list` for a named instance's IP (no fake commands).
wait_for_ip() {
    local name="$1" ip=""
    for _ in $(seq 1 30); do
        ip="$(aleph instance list --json \
            | jq -r --arg n "$name" '.[] | select(.name==$n) | (.ipv4 // .ipv6 // empty)' \
            | head -1)"
        [[ -n "$ip" ]] && { echo "$ip"; return 0; }
        sleep 10
    done
    return 1
}

deploy_worker_node() {
    local node_id="$1" crn_url="$2" primary_ip="$3"
    local node_name="${FLEET_NAME}-worker-${node_id}"
    echo "Deploying worker node $node_id ($node_name)..."

    # Worker provisioning script. The worker JOINS the Tailscale mesh FIRST, then
    # registers with the primary over that mesh (primary_tailscale_ip), so the
    # address it registers is always its reachable Tailscale IP — never a
    # firewalled public/private address. We pass primary's Tailscale IP, the
    # shared key, the Tailscale auth key, and the instance ITEM_HASH in as env
    # vars at SSH time.
    local setup_script
    setup_script=$(cat <<'WORKER_SETUP'
#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

apt-get update && apt-get -y upgrade
apt-get install -y curl wget git htop jq ca-certificates iproute2
curl -fsSL https://get.docker.com -o /tmp/get-docker.sh && sh /tmp/get-docker.sh
installer_3="$(mktemp)"
curl -fsSL https://deb.nodesource.com/setup_22.x -o "$installer_3"
less "$installer_3"  # Review before execution; verify the release checksum/signature when published.
bash "$installer_3" - && apt-get install -y nodejs

# Join the Tailscale mesh BEFORE registering, so `tailscale ip -4` returns a
rm -f "$installer_3"
# reachable mesh address (the control plane is only reachable over the mesh).
# Official Tailscale installer; review first via:
#   curl -fsSL https://tailscale.com/install.sh -o /tmp/ts-install.sh && less /tmp/ts-install.sh
installer_4="$(mktemp)"
curl -fsSL https://tailscale.com/install.sh -o "$installer_4"
less "$installer_4"  # Review before execution; verify the release checksum/signature when published.
sh "$installer_4"
rm -f "$installer_4"
: "${TAILSCALE_AUTH_KEY:?TAILSCALE_AUTH_KEY required to join the mesh before registering}"
printf '%s' "$TAILSCALE_AUTH_KEY" > /tmp/ts && chmod 600 /tmp/ts
tailscale up --auth-key="file:/tmp/ts" --hostname="$NODE_ID"
rm -f /tmp/ts
# Confirm we actually have a mesh IP before going any further.
for _ in $(seq 1 12); do
  TS_IP="$(tailscale ip -4 2>/dev/null || true)"
  [[ -n "$TS_IP" ]] && break
  sleep 5
done
[[ -n "${TS_IP:-}" ]] || { echo "Worker never obtained a Tailscale IP — aborting"; exit 1; }

# Install OpenClaw (official installer; Node already present).
installer_5="$(mktemp)"
curl -fsSL https://openclaw.ai/install.sh -o "$installer_5"
less "$installer_5"  # Review before execution; verify the release checksum/signature when published.
bash "$installer_5"
# Run `openclaw onboard --install-daemon` to set up the daemon (see docs).
rm -f "$installer_5"

# Registration: POST to the primary over Tailscale, key from EnvironmentFile.
# NODE_ID / PRIMARY_TS_IP / FLEET_API_KEY / ITEM_HASH are provided via /etc/worker.env.
install -o root -g root -m 600 /dev/null /etc/worker.env
cat > /etc/worker.env <<ENVF
NODE_ID=${NODE_ID}
PRIMARY_TS_IP=${PRIMARY_TS_IP}
FLEET_API_KEY=${FLEET_API_KEY}
ITEM_HASH=${ITEM_HASH}
ENVF

cat > /opt/register-worker.sh <<'REGISTER'
#!/bin/bash
set -euo pipefail
set -a; . /etc/worker.env; set +a
# Use the Tailscale IP as our reachable address. We already joined the mesh in
# the setup phase, so this must succeed; bail rather than register an
# unreachable public/private fallback address.
LOCAL_IP="$(tailscale ip -4 2>/dev/null || true)"
[[ -n "$LOCAL_IP" ]] || { echo "No Tailscale IP yet — not registering an unreachable address"; exit 1; }
curl -fsS -X POST "http://${PRIMARY_TS_IP}:8080/fleet/register" \
  -H "Content-Type: application/json" \
  -H "x-api-key: ${FLEET_API_KEY}" \
  -d "{\"node_id\":\"${NODE_ID}\",\"ip_address\":\"${LOCAL_IP}\",\"item_hash\":\"${ITEM_HASH}\",\"capabilities\":[\"compute\",\"openclaw\"]}"
REGISTER
chmod +x /opt/register-worker.sh

# Register once now (Tailscale is already up), then keep a heartbeat going.
/opt/register-worker.sh

# Heartbeat as a supervised systemd timer (re-registers every 30s; updates last_seen).
cat > /etc/systemd/system/heartbeat.service <<'HB_SVC'
[Unit]
Description=Worker node heartbeat
After=network-online.target tailscaled.service
[Service]
Type=oneshot
EnvironmentFile=/etc/worker.env
ExecStart=/opt/register-worker.sh
HB_SVC
cat > /etc/systemd/system/heartbeat.timer <<'HB_TIMER'
[Unit]
Description=Run worker heartbeat every 30s
[Timer]
OnBootSec=30
OnUnitActiveSec=30
[Install]
WantedBy=timers.target
HB_TIMER
systemctl daemon-reload
systemctl enable --now heartbeat.timer

echo "Worker node setup complete (joined mesh, registered over Tailscale)."
WORKER_SETUP
    )

    local create_args=(
        --name "$node_name"
        --compute-units 2 --memory 4096
        --rootfs-size 40960
        --ssh-pubkey-file "$SSH_KEY.pub"
        --payment-type credit --payment-chain BASE
    )
    [[ -n "$crn_url" ]] && create_args+=(--crn-url "$crn_url" --crn-auto-tac)

    local out item_hash worker_ip
    out="$(aleph instance create "${create_args[@]}")"
    echo "$out"
    item_hash="$(printf '%s\n' "$out" | grep -oE '[0-9a-f]{64}' | head -1)"
    worker_ip="$(wait_for_ip "$node_name")" || { echo "Worker $node_id got no IP"; return 1; }

    # primary_ip here is the primary's TAILSCALE IP (resolved by the caller after
    # the mesh is up). Provision over SSH with NODE_ID/PRIMARY_TS_IP/FLEET_API_KEY/
    # TAILSCALE_AUTH_KEY (so the worker joins the mesh first) and ITEM_HASH (so the
    # primary's registry records the instance hash for later delete/recreate).
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER@$worker_ip" \
        "NODE_ID='$node_name' PRIMARY_TS_IP='$primary_ip' FLEET_API_KEY='$FLEET_API_KEY' \
         TAILSCALE_AUTH_KEY='$TAILSCALE_AUTH_KEY' ITEM_HASH='$item_hash' bash -s" \
        <<< "$setup_script"

    # Record name, id, crn, IP, and item_hash. IP is REQUIRED by Tailscale/backup/
    # security scripts — never omit it.
    local worker_info tmpfile
    worker_info="$(jq -n --arg n "$node_name" --argjson id "$node_id" \
        --arg crn "$crn_url" --arg ip "$worker_ip" --arg h "$item_hash" \
        '{name:$n, id:$id, crn:$crn, ip:$ip, item_hash:$h}')"
    tmpfile="$(mktemp)"
    jq --argjson w "$worker_info" '.worker_nodes += [$w]' \
        ~/.aleph-deploy/configs/fleet.json > "$tmpfile"
    mv "$tmpfile" ~/.aleph-deploy/configs/fleet.json

    echo "Worker node $node_id deployed on ${crn_url:-auto-selected CRN}: $worker_ip"
}

# Main deployment sequence
echo "Starting fleet deployment sequence..."

# 1. Deploy + provision the primary (installs the fleet manager on its Tailscale IP).
deploy_primary_node
primary_public_ip="$(jq -r '.primary_node.ip' ~/.aleph-deploy/configs/fleet.json)"

# 2. Bring the primary onto Tailscale and capture its mesh IP. Workers register
#    against THIS address (the control plane is never reachable on the public IP).
#    Requires TAILSCALE_AUTH_KEY in the environment (see "Tailscale Mesh" section).
: "${TAILSCALE_AUTH_KEY:?Set TAILSCALE_AUTH_KEY before deploying the fleet}"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER@$primary_public_ip" \
    "TAILSCALE_AUTH_KEY='$TAILSCALE_AUTH_KEY' bash -s" <<'TS_BOOT'
set -euo pipefail
installer_6="$(mktemp)"
curl -fsSL https://tailscale.com/install.sh -o "$installer_6"
less "$installer_6"  # Review before execution; verify the release checksum/signature when published.
sh "$installer_6"        # official, OS-detecting installer
rm -f "$installer_6"
printf '%s' "$TAILSCALE_AUTH_KEY" > /tmp/ts && chmod 600 /tmp/ts
tailscale up --auth-key="file:/tmp/ts" --hostname="$(hostname)"
rm -f /tmp/ts
# Re-point the fleet manager at the Tailscale interface and restart it.
TS_IP="$(tailscale ip -4)"
sed -i "s/^BIND_HOST=.*/BIND_HOST=${TS_IP}/" /etc/fleet-manager.env
systemctl restart fleet-manager
echo "PRIMARY_TS_IP=${TS_IP}"
TS_BOOT

primary_ts_ip="$(ssh -i "$SSH_KEY" "$SSH_USER@$primary_public_ip" "tailscale ip -4")"
jq --arg ip "$primary_ts_ip" '.primary_node.tailscale_ip=$ip' \
    ~/.aleph-deploy/configs/fleet.json > /tmp/fleet.$$ && \
    mv /tmp/fleet.$$ ~/.aleph-deploy/configs/fleet.json
echo "Primary Tailscale IP: $primary_ts_ip"

# 3. Deploy workers. Each worker's setup script JOINS the Tailscale mesh FIRST
#    and only THEN registers — so it registers against the primary's Tailscale IP
#    using its own reachable Tailscale IP (never a firewalled public address).
worker_total=$((NODE_COUNT - 1))
for i in $(seq 1 "$worker_total"); do
    if (( ${#WORKER_CRNS[@]} > 0 )); then
        crn_url="${WORKER_CRNS[$(((i - 1) % ${#WORKER_CRNS[@]}))]}"
    else
        crn_url=""   # let the CLI auto-select a CRN
    fi
    deploy_worker_node "$i" "$crn_url" "$primary_ts_ip" &
    sleep 30   # stagger to avoid overwhelming CRNs
done
wait

echo "Fleet deployment complete."
echo "Fleet manager (PRIVATE, Tailscale only): http://$primary_ts_ip:8080"
echo "Status: curl -H \"x-api-key: \$FLEET_API_KEY\" http://$primary_ts_ip:8080/fleet/status"
echo "Next: run setup-tailscale-mesh.sh to verify the mesh, then setup-load-balancer.sh."
jq . ~/.aleph-deploy/configs/fleet.json
```

> **Ordering note.** Workers reach the fleet manager over Tailscale, so the primary joins the mesh *before* workers are provisioned (step 2). Each worker's setup script then joins Tailscale **first** and only **then** registers, so the address it registers is always its reachable Tailscale IP. This requires `TAILSCALE_AUTH_KEY` in the environment (passed through to each worker at SSH time). You can still run `setup-tailscale-mesh.sh` (next section) afterward to verify mesh connectivity. The public IPs are used only for the initial SSH provisioning hop.

> **Primary needs the fleet SSH key (one-time).** Several primary-resident services (replication, backups, node monitor, key rotation) SSH from the primary to workers, so the primary must hold the **private** key. Copy it once, locked down, after the primary is up — prefer Tailscale for the hop:
>
> ```bash
> PRIMARY_TS_IP="$(jq -r '.primary_node.tailscale_ip' ~/.aleph-deploy/configs/fleet.json)"
> scp -i "$SSH_KEY" "$SSH_KEY" "$SSH_USER@$PRIMARY_TS_IP:/root/.ssh/aleph_ed25519"
> ssh -i "$SSH_KEY" "$SSH_USER@$PRIMARY_TS_IP" "chmod 600 /root/.ssh/aleph_ed25519"
> ```
>
> Primary-side scripts read `ALEPH_SSH_KEY` (default `/root/.ssh/aleph_ed25519`). Treat this key as sensitive: it grants root on every worker. Rotate it (see the rotation tool) if the primary is ever compromised, and never bake the private key into an instance setup message.

### Fleet Management Commands

**Fleet Control Script.** Run this from a machine that is **on the tailnet** (the control plane lives on the primary's Tailscale IP). It reads SSH user/key and the manager host from config/env.

```bash
#!/bin/bash
# fleet-control.sh
set -euo pipefail

FLEET_CONFIG="$HOME/.aleph-deploy/configs/fleet.json"
SSH_KEY="${ALEPH_SSH_KEY:-$HOME/.aleph-deploy/keys/aleph_ed25519}"
SSH_USER="$(jq -r '.ssh_user // "root"' "$FLEET_CONFIG" 2>/dev/null || echo root)"
SSH_OPTS=(-i "$SSH_KEY" -o StrictHostKeyChecking=accept-new)
# All fleet manager endpoints require x-api-key auth. Keep the key in fleet.env
# (chmod 600), source it before running, or export it; never hardcode it.
FLEET_API_KEY="${FLEET_API_KEY:?FLEET_API_KEY env var is required (see fleet.env)}"

# Control-plane base URL = primary's TAILSCALE IP:8080 (NOT the public IP).
MGR_HOST="$(jq -r '.primary_node.tailscale_ip // .primary_node.ip' "$FLEET_CONFIG")"
mgr() {  # mgr <path> [curl args...]
    curl -fsS -H "x-api-key: $FLEET_API_KEY" "http://$MGR_HOST:8080$1" "${@:2}"
}

fleet_status() {
    echo "Fleet status:"
    mgr /fleet/status | jq '.' || { echo "Unable to reach fleet manager (on tailnet?)"; return 1; }
}

fleet_health() {
    echo "Fleet health check:"
    local nodes; nodes="$(mgr /fleet/status | jq -r '.nodes[].ip_address')"
    for node_ip in $nodes; do
        echo "Checking node: $node_ip"
        if ssh "${SSH_OPTS[@]}" -o ConnectTimeout=5 "$SSH_USER@$node_ip" \
               "systemctl is-active openclaw" &>/dev/null; then
            echo "  OK   $node_ip - OpenClaw running"
        else
            echo "  DOWN $node_ip - OpenClaw not responding"
        fi
    done
}

fleet_restart() {
    local service_name=$1
    [[ "$service_name" =~ ^[a-zA-Z0-9_.-]+$ ]] || { echo "Invalid service: $service_name"; return 1; }
    echo "Restarting $service_name on all nodes..."
    for node_ip in $(mgr /fleet/status | jq -r '.nodes[].ip_address'); do
        echo "  $node_ip"
        ssh "${SSH_OPTS[@]}" "$SSH_USER@$node_ip" "sudo systemctl restart $service_name"
    done
}

fleet_deploy() {
    local script_path=$1
    echo "Deploying script to all nodes: $script_path"
    [[ -f "$script_path" ]] || { echo "Script not found: $script_path"; return 1; }
    for node_ip in $(mgr /fleet/status | jq -r '.nodes[].ip_address'); do
        echo "  $node_ip"
        scp "${SSH_OPTS[@]}" "$script_path" "$SSH_USER@$node_ip":/tmp/deploy-script.sh
        ssh "${SSH_OPTS[@]}" "$SSH_USER@$node_ip" "chmod +x /tmp/deploy-script.sh && sudo /tmp/deploy-script.sh"
    done
}

# Real scale operation. Up: create+provision new workers, register them, let
# haproxy-fleet-sync pick them up. Down: drain HAProxy backend, deregister, then
# DELETE the Aleph instance (irreversible for non-persistent volumes — confirmed).
# Requires FLEET_API_KEY, TAILSCALE_AUTH_KEY, and the deploy/worker helpers; the
# simplest robust approach is to re-invoke deploy-fleet.sh's worker function. Here
# we implement it inline so fleet-control.sh is self-contained.
fleet_scale() {
    local target=$1
    [[ "$target" =~ ^[0-9]+$ ]] || { echo "Target must be an integer"; return 1; }
    local cur; cur="$(jq '.worker_nodes | length' "$FLEET_CONFIG")"   # worker count
    local want=$((target - 1))                                        # minus the primary
    (( want < 0 )) && { echo "Target must be >= 1 (includes primary)"; return 1; }
    echo "Scaling workers from $cur to $want (fleet total $((cur+1)) -> $target)..."

    local primary_ts; primary_ts="$(jq -r '.primary_node.tailscale_ip' "$FLEET_CONFIG")"
    local fleet_name; fleet_name="$(jq -r '.fleet_name' "$FLEET_CONFIG")"

    if (( want > cur )); then
        : "${TAILSCALE_AUTH_KEY:?TAILSCALE_AUTH_KEY required to add workers}"
        command -v aleph >/dev/null || { echo "aleph CLI required on this host to add workers"; return 1; }
        for ((i=cur+1; i<=want; i++)); do
            local wname="${fleet_name}-worker-${i}" wout whash wip
            echo "Adding worker $i ($wname)..."
            # Real create (current flags), then poll the REAL `aleph instance list`.
            wout="$(aleph instance create --name "$wname" --compute-units 2 --rootfs-size 40960 \
                    --ssh-pubkey-file "$SSH_KEY.pub" --payment-type credit --payment-chain BASE 2>&1)"
            echo "$wout"
            whash="$(printf '%s\n' "$wout" | grep -oE '[0-9a-f]{64}' | head -1)"
            wip=""
            for _ in $(seq 1 30); do
                wip="$(aleph instance list --json \
                    | jq -r --arg n "$wname" '.[]|select(.name==$n)|(.ipv4//.ipv6//empty)' | head -1)"
                [[ -n "$wip" ]] && break; sleep 10
            done
            [[ -z "$wip" ]] && { echo "  $wname got no IP — skipping"; continue; }
            # Provision over SSH: Tailscale join + register with the primary over the mesh.
            # ITEM_HASH is passed through so the primary's registry records this
            # instance's hash for later delete/recreate.
            ssh "${SSH_OPTS[@]}" "$SSH_USER@$wip" \
                "NODE_ID='$wname' PRIMARY_TS_IP='$primary_ts' FLEET_API_KEY='$FLEET_API_KEY' \
                 TAILSCALE_AUTH_KEY='$TAILSCALE_AUTH_KEY' ITEM_HASH='$whash' bash -s" <<'REPROV'
set -euo pipefail; export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl jq iproute2
installer_7="$(mktemp)"
curl -fsSL https://get.docker.com -o "$installer_7"
less "$installer_7"  # Review before execution; verify the release checksum/signature when published.
sh "$installer_7"
rm -f "$installer_7"
installer_8="$(mktemp)"
curl -fsSL https://deb.nodesource.com/setup_22.x -o "$installer_8"
less "$installer_8"  # Review before execution; verify the release checksum/signature when published.
bash "$installer_8" - && apt-get install -y nodejs
rm -f "$installer_8"
installer_9="$(mktemp)"
curl -fsSL https://tailscale.com/install.sh -o "$installer_9"
less "$installer_9"  # Review before execution; verify the release checksum/signature when published.
sh "$installer_9"
# file: pattern keeps the auth key out of the process list (see Tailscale section)
rm -f "$installer_9"
[[ -n "${TAILSCALE_AUTH_KEY:-}" ]] && { printf '%s' "$TAILSCALE_AUTH_KEY" > /tmp/ts && chmod 600 /tmp/ts && tailscale up --auth-key="file:/tmp/ts" --hostname="$NODE_ID"; rm -f /tmp/ts; }
installer_10="$(mktemp)"
curl -fsSL https://openclaw.ai/install.sh -o "$installer_10"
less "$installer_10"  # Review before execution; verify the release checksum/signature when published.
bash "$installer_10"
rm -f "$installer_10"
TS_IP="$(tailscale ip -4 2>/dev/null || hostname -I | awk '{print $1}')"
curl -fsS -X POST "http://$PRIMARY_TS_IP:8080/fleet/register" -H "x-api-key: $FLEET_API_KEY" \
  -H 'Content-Type: application/json' \
  -d "{\"node_id\":\"$NODE_ID\",\"ip_address\":\"$TS_IP\",\"item_hash\":\"${ITEM_HASH:-}\",\"capabilities\":[\"compute\",\"openclaw\"]}"
REPROV
            # Append {name,id,ip,item_hash} to fleet.json atomically.
            local wtmp; wtmp="$(mktemp)"
            jq --arg n "$wname" --argjson id "$i" --arg ip "$wip" --arg h "$whash" \
               '.worker_nodes += [{name:$n, id:$id, crn:"", ip:$ip, item_hash:$h}]' \
               "$FLEET_CONFIG" > "$wtmp" && mv "$wtmp" "$FLEET_CONFIG"
            echo "  Added $wname ($wip)."
        done
        echo "New workers register automatically; haproxy-fleet-sync adds them within 60s."
    elif (( want < cur )); then
        local n=$((cur - want))
        echo "Removing $n least-recently-active worker(s)..."
        # Pick workers to remove (last in the list = most recently added).
        local victims; victims="$(jq -r '.worker_nodes[-'"$n"':][] | .name + " " + .ip + " " + .item_hash' "$FLEET_CONFIG")"
        while read -r name ip hash; do
            [[ -z "$name" ]] && continue
            echo "Draining $name ($ip)..."
            # 1. Drain in HAProxy so no new requests go to it, then deregister.
            ssh "${SSH_OPTS[@]}" "$SSH_USER@$primary_ts" \
                "sudo /opt/manage-haproxy-backends.sh remove '$name' || true"
            # 2. Confirm before the irreversible delete.
            echo "About to DELETE Aleph instance $name ($hash). Non-persistent data is lost."
            read -r -p "Type the item-hash to confirm: " ans
            if [[ "$ans" == "$hash" ]]; then
                aleph instance delete "$hash"
                # 3. Atomically drop it from fleet.json.
                local tmp; tmp="$(mktemp)"
                jq --arg n "$name" '.worker_nodes |= map(select(.name != $n))' \
                    "$FLEET_CONFIG" > "$tmp" && mv "$tmp" "$FLEET_CONFIG"
                echo "Removed $name."
            else
                echo "Skipped $name (hash mismatch)."
            fi
        done <<< "$victims"
    else
        echo "Fleet already at target size."
    fi
    # Keep node_count in sync with reality.
    local tmp; tmp="$(mktemp)"
    jq --argjson c "$target" '.node_count=$c' "$FLEET_CONFIG" > "$tmp" && mv "$tmp" "$FLEET_CONFIG"
}

fleet_logs() {
    local service_name="${1:-openclaw}" lines="${2:-50}"
    [[ "$service_name" =~ ^[a-zA-Z0-9_.-]+$ ]] || { echo "Invalid service: $service_name"; return 1; }
    [[ "$lines" =~ ^[0-9]+$ ]] || { echo "Invalid line count: $lines"; return 1; }
    echo "Collecting logs from all nodes..."
    for node_ip in $(mgr /fleet/status | jq -r '.nodes[].ip_address'); do
        echo "=== $node_ip ==="
        ssh "${SSH_OPTS[@]}" "$SSH_USER@$node_ip" "sudo journalctl -u $service_name -n $lines --no-pager"
        echo ""
    done
}

# Command dispatcher
case "${1:-status}" in
    "status")
        fleet_status
        ;;
    "health")
        fleet_health
        ;;
    "restart")
        fleet_restart "${2:-openclaw}"
        ;;
    "deploy")
        fleet_deploy "$2"
        ;;
    "scale")
        fleet_scale "$2"
        ;;
    "logs")
        fleet_logs "$2" "$3"
        ;;
    *)
        echo "Usage: $0 {status|health|restart|deploy|scale|logs}"
        echo ""
        echo "Commands:"
        echo "  status          - Show fleet status"
        echo "  health          - Check health of all nodes"
        echo "  restart [svc]   - Restart service on all nodes"
        echo "  deploy <script> - Deploy script to all nodes"
        echo "  scale <count>   - Scale fleet to N nodes"
        echo "  logs [svc] [n]  - Collect logs from all nodes"
        exit 1
        ;;
esac
```

---
