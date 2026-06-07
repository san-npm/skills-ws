---
name: aleph-cloud-self-deployment
description: "Deploy and operate VMs on Aleph Cloud with the aleph-client CLI — single node or multi-node fleets, Tailscale mesh, HAProxy distribution, backup/recovery, cost control, and security hardening. Use when deploying confidential/persistent VMs (e.g. an OpenClaw agent runtime) on Aleph Cloud, or building an Aleph node fleet."
---

# Aleph Cloud Self-Deployment: VM & Multi-Node Fleet Management

Framework for deploying and managing persistent/confidential VMs on Aleph Cloud's decentralized compute network using the official `aleph-client` CLI, with patterns for running an OpenClaw agent runtime across one or many nodes (Tailscale mesh, HAProxy distribution, pull-based backup, and hardening).

> **Verify before you ship.** Aleph CLI flags, OpenClaw install commands, and pricing change over time. This skill is current as of **Jun 2026**. Authoritative sources, used throughout: the Aleph CLI command reference at https://docs.aleph.cloud/devhub/sdks-and-tools/aleph-cli/ (instance subcommands: https://docs.aleph.cloud/devhub/sdks-and-tools/aleph-cli/commands/instance.html), and OpenClaw docs at https://docs.openclaw.ai/. Run `aleph instance create --help` and `aleph pricing instance` to confirm current flags and prices on your machine.

> **Sibling skills.** This skill focuses on Aleph-specific provisioning and fleet orchestration. For deep, vendor-neutral coverage prefer: `security-hardening` (SSH/firewall/CIS), `monitoring-observability` (metrics, alerting, log pipelines), and `docker-production` (Compose v2, image hygiene). Use those alongside this one rather than duplicating their depth here.

## Table of Contents

1. [Infrastructure Planning & Architecture](#infrastructure-planning--architecture)
2. [Single Node Deployment Foundation](#single-node-deployment-foundation)
3. [Multi-Node Fleet Management](#multi-node-fleet-management)
4. [Auto-Provisioning Protocol (SRP)](#auto-provisioning-protocol-srp)
5. [Inter-VM Communication Networks](#inter-vm-communication-networks)
6. [Load Distribution & Orchestration](#load-distribution--orchestration)
7. [Disaster Recovery & Auto-Recreation](#disaster-recovery--auto-recreation)
8. [Cost Optimization Strategies](#cost-optimization-strategies)
9. [Security Hardening Framework](#security-hardening-framework)
10. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Infrastructure Planning & Architecture

### Aleph Cloud Architecture Overview

**Network Topology:**
```
┌─────────────────────────────────────────────────────────┐
│                   Aleph Cloud Network                   │
├─────────────────┬─────────────────┬─────────────────────┤
│   Primary Node  │  Worker Node 1  │   Worker Node 2     │
│   (Orchestrator)│   (Compute)     │    (Compute)        │
│                 │                 │                     │
│ • Fleet Manager │ • OpenClaw      │  • OpenClaw         │
│ • Load Balancer │ • Tailscale     │  • Tailscale        │
│ • Backup Coord  │ • Health Mon    │  • Health Mon       │
│ • SSH Gateway   │ • Auto-Restart  │  • Auto-Restart     │
└─────────────────┴─────────────────┴─────────────────────┘
         │                 │                 │
         └─────────────────┼─────────────────┘
                  Tailscale Mesh Network
                     SSH Tunnels
```

**Resource Planning Matrix.** Aleph instances are sized in **compute units** (1 CU ≈ 1 vCPU + 2 GiB RAM); you can override with explicit `--vcpus`/`--memory`/`--rootfs-size`. Persistent/confidential VMs run on a specific **CRN** (Compute Resource Node) that you choose by URL or hash.

```yaml
Node Types:
  Orchestrator (Primary):
    Tier: 4 vCPU / 8 GiB RAM / 80–100 GiB rootfs  (≈ 4 compute units)
    CRN: a high-uptime CRN you have verified (see "CRN selection" below)
    Role: fleet manager, HAProxy, backup coordinator, SSH gateway

  Compute Nodes (Workers):
    Tier: 2 vCPU / 4 GiB RAM / 40–50 GiB rootfs  (≈ 2 compute units)
    CRN: spread across 2–3 distinct CRNs for fault isolation
    Role: OpenClaw agent runtime, task execution

  Backup Node (Optional):
    Tier: 1 vCPU / 2 GiB RAM / 20 GiB rootfs  (≈ 1 compute unit)
    CRN: a *different* CRN/region than the primary, for redundancy
    Role: off-node backup target, emergency recovery
```

**Cost model (read this — it changed).** Aleph supports two payment modes, selected with `--payment-type`:

- **`hold`** — lock (don't spend) a quantity of $ALEPH tokens for as long as the VM runs; tokens are released on `delete`. No ongoing burn.
- **`superfluid` / `credit`** — pay-as-you-go streaming (per second) priced in **USD**, settled in $ALEPH or credits. This is the model most users want for fleets.

Do **not** hardcode "ALEPH/month" figures — the token price floats and tiers change. Always read live pricing with the CLI:

```bash
aleph pricing instance                 # all tiers, all payment types
aleph pricing instance --tier 1 --json # one tier, machine-readable
aleph pricing instance --payment-type credit
```

As of **Jun 2026**, pay-as-you-go instance pricing is roughly (confirm with `aleph pricing instance`, do not quote these as fixed):

| Tier | vCPU / RAM / rootfs | Approx. PAYG (USD/hr) | Approx. (USD/mo, 730h) |
|------|---------------------|-----------------------|------------------------|
| 1    | 1 / 2 GiB / 20 GiB  | ~$0.0036              | ~$2.6                  |
| 2    | 2 / 4 GiB / 40 GiB  | ~$0.0066              | ~$4.8                  |
| 3    | 4 / 8 GiB / 80 GiB  | ~$0.0132              | ~$9.6                  |

> These are dated examples for planning only. Confirm current numbers at the Aleph console (https://app.aleph.cloud) or via `aleph pricing instance` before budgeting. A 1 primary + 4 worker fleet on these tiers lands around $30–40/mo PAYG as of Jun 2026 — but verify.

### CRN Selection Strategy

A CRN is the physical node that hosts your persistent/confidential VM. Pick CRNs by **compute availability, payment-mode support, terms acceptance, region, and (for confidential VMs) SEV support** — not by hitting an Aleph API messages endpoint. Discover and inspect CRNs with the CLI rather than guessing URLs:

```bash
#!/bin/bash
# crn-discovery.sh — list and shortlist real CRNs for instance deployment.
set -euo pipefail

echo "=== Available Compute Resource Nodes ==="
# `aleph instance` deployments resolve CRNs from the network; the node index
# is also browsable at https://app.aleph.cloud (Console > Compute) and
# https://docs.aleph.cloud/nodes/compute/ . Prefer the console for capacity,
# version, and reward/uptime score; use --crn-url / --crn-hash from there.

# When creating an instance you may omit --crn-url to let the CLI auto-select
# a CRN, or pin one explicitly. For confidential or Pay-As-You-Go instances a
# CRN is REQUIRED, and you must accept its Terms & Conditions:
#   aleph instance create ... --crn-url "https://<crn-host>" --crn-auto-tac

# Sanity-check a candidate CRN's compute API (this is the CRN's own
# /about endpoint — NOT the Aleph message API):
check_crn() {
    local crn_url="$1" crn_name="$2"
    echo "=== $crn_name ($crn_url) ==="
    echo -n "  Reachable: "
    if curl -fsS --max-time 8 "$crn_url/about/usage/system" >/dev/null 2>&1; then
        echo "yes"
        echo "  Capacity/usage:"
        curl -fsS --max-time 8 "$crn_url/about/usage/system" \
            | jq '{cpu: .cpu, mem: .mem, period}' 2>/dev/null || true
    else
        echo "NO — skip this CRN"
        return 1
    fi
    # Confidential support advertised under /about/capability on SEV-capable CRNs
    echo -n "  Confidential (SEV) capable: "
    curl -fsS --max-time 8 "$crn_url/about/capability" 2>/dev/null \
        | jq -r '.confidential // "unknown"' 2>/dev/null || echo "unknown"
    echo "------------------------"
}

# Replace these with real CRN hosts from https://app.aleph.cloud (Console).
# Do NOT use unrelated services (e.g. storage gateways) as CRNs — they cannot
# host an Aleph instance and `aleph instance create` will fail against them.
# check_crn "https://<crn-1-host>" "CRN 1"
# check_crn "https://<crn-2-host>" "CRN 2"

echo "=== SELECTION GUIDANCE ==="
echo "Primary : highest-uptime CRN with spare capacity and recent node version"
echo "Workers : 2-3 DISTINCT CRNs/regions for fault isolation"
echo "Backup  : a CRN on a different operator/region than the primary"
```

---

## Quick Start — tested single-VM happy path

Do this end-to-end first; the fleet machinery below builds on it. Tear-down is included so you never leak a paid VM.

```bash
# 0. Prereqs (mid-2026): Python 3.10+, jq, an SSH client, and a funded Aleph
#    account. macOS: `brew install libsecp256k1`; Debian/Ubuntu:
#    `sudo apt-get install -y libsecp256k1-dev`.

# 1. Install the official CLI in an isolated env (pipx is the documented method)
python3 -m pip install --user pipx && python3 -m pipx ensurepath   # if needed
pipx install aleph-client
aleph --version

# 2. Create or import an account, then check balance
aleph account create                      # interactive; or import an existing key:
# aleph account create --private-key "0xYOUR_PRIVATE_KEY"   # or --private-key-file PATH
aleph account address                      # your public address (fund it on the right chain)
aleph account balance                      # ALEPH balance / available credits

# 3. Generate an SSH key dedicated to Aleph VMs (ed25519 — modern, small, fast)
mkdir -p ~/.aleph-deploy/keys
ssh-keygen -t ed25519 -f ~/.aleph-deploy/keys/aleph_ed25519 -N "" -C "aleph-fleet-$(date +%Y%m%d)"

# 4. See live pricing, then create ONE pay-as-you-go instance (2 vCPU / 4 GiB / 40 GiB)
aleph pricing instance --payment-type credit
aleph instance create \
  --name openclaw-primary \
  --compute-units 2 \
  --rootfs-size 40960 \
  --ssh-pubkey-file ~/.aleph-deploy/keys/aleph_ed25519.pub \
  --payment-type credit \
  --payment-chain BASE \
  --crn-auto-tac
# The CLI prints the instance item-hash and (for PAYG/confidential) allocates it
# on a CRN, returning the assigned IPv6/IPv4. Save the item-hash it prints:
#   ITEM_HASH=<hash from CLI output>

# 5. Find the instance + its IP from authoritative CLI output (no fake `instance get`)
aleph instance list --json | jq '.[] | {name, item_hash, ipv4: .ipv4, ipv6: .ipv6}'
VM_IP=$(aleph instance list --json | jq -r '.[] | select(.name=="openclaw-primary") | (.ipv4 // .ipv6)' | head -1)

# 6. Verify SSH (accept-new = trust first key, reject changed keys = MITM protection)
ssh -i ~/.aleph-deploy/keys/aleph_ed25519 -o StrictHostKeyChecking=accept-new \
    root@"$VM_IP" "echo 'SSH OK'; cat /etc/os-release | grep PRETTY_NAME"
# Note: the default cloud user is image-dependent (often `root` on Aleph base
# images; `ubuntu` on some). Check with the command above and adjust below.

# 7. Tear down when done so you stop paying / release held tokens
aleph instance delete "$ITEM_HASH"     # irreversible for non-persistent volumes — see guardrails
```

> **Destructive-operation guardrail.** `aleph instance delete` is irreversible and **destroys non-persistent (rootfs/ephemeral) data**. Before any delete/scale-down/recreate: (1) `aleph instance list` and confirm the exact item-hash, (2) back up persistent data first, (3) require an explicit confirmation in scripts. A reusable confirm helper:
>
> ```bash
> confirm_destructive() {  # usage: confirm_destructive "<action>" "<target>"
>     echo "About to: $1 -> $2"
>     read -r -p "Type the target hash to confirm: " ans
>     [[ "$ans" == "$2" ]] || { echo "Aborted."; return 1; }
> }
> ```

## Single Node Deployment Foundation

### Prerequisites & Setup

**Local Environment Setup:**
```bash
#!/bin/bash
# setup-aleph-environment.sh
set -euo pipefail

echo "Setting up Aleph Cloud deployment environment..."

# Install the official Aleph CLI in an isolated environment (documented method).
# https://docs.aleph.cloud/devhub/sdks-and-tools/aleph-cli/
if ! command -v aleph &>/dev/null; then
    echo "Installing aleph-client via pipx..."
    if ! command -v pipx &>/dev/null; then
        python3 -m pip install --user pipx
        python3 -m pipx ensurepath
        echo "Restart your shell, then re-run this script."; exit 1
    fi
    # System dep: libsecp256k1 (macOS: brew install libsecp256k1;
    # Debian/Ubuntu: sudo apt-get install -y libsecp256k1-dev)
    pipx install aleph-client
fi

aleph --version

# Create deployment directory structure
mkdir -p ~/.aleph-deploy/{keys,configs,scripts,backups,logs,reports}

# Generate an ed25519 SSH key pair for VMs (preferred over RSA in 2026)
if [[ ! -f ~/.aleph-deploy/keys/aleph_ed25519 ]]; then
    echo "Generating SSH key pair..."
    ssh-keygen -t ed25519 -f ~/.aleph-deploy/keys/aleph_ed25519 -N "" \
        -C "aleph-fleet-$(date +%Y%m%d)"
fi

echo "Environment setup complete."
echo "Next steps:"
echo "  1. aleph account create        # or import: --private-key / --private-key-file"
echo "  2. Fund the address shown by 'aleph account address' on your payment chain"
echo "  3. aleph pricing instance      # check current tiers/prices"
```

> **Key type note.** This skill standardizes on **ed25519** keys at `~/.aleph-deploy/keys/aleph_ed25519`. If you are upgrading an older deployment that used `aleph_ed25519`, either re-run the generator above or `export ALEPH_SSH_KEY=~/.aleph-deploy/keys/aleph_ed25519` and substitute it in the `ssh -i` calls; every script below reads the same path, so keep them consistent.

**Account Creation & Funding:**
```bash
#!/bin/bash
# account-setup.sh
set -euo pipefail

echo "Setting up Aleph account..."

read -rp "Do you want to (c)reate new account or (i)mport existing? " choice
case "$choice" in
    c|C)
        echo "Creating new account..."
        aleph account create               # add --replace only to overwrite an existing default
        ;;
    i|I)
        echo "Importing an existing key..."
        # Documented import path is `account create` with a key source — there is
        # no `aleph account import-private-key` command.
        read -rsp "Paste private key (hidden), or leave blank to use a file: " pk; echo
        if [[ -n "$pk" ]]; then
            aleph account create --private-key "$pk" --replace
        else
            read -rp "Path to private key file: " pkfile
            aleph account create --private-key-file "$pkfile" --replace
        fi
        ;;
    *)
        echo "Invalid choice"; exit 1 ;;
esac

echo "Active account:"
aleph account show
ADDR=$(aleph account address)
echo "Address: $ADDR"

# Check balance (correct command is `aleph account balance`, not `aleph balance`)
echo "Balance / credits:"
aleph account balance

echo
echo "Funding: send ALEPH (or buy credits) to the address above on your chosen"
echo "payment chain (ETH / BASE / AVAX / SOL). Manage funds in the console:"
echo "  https://app.aleph.cloud"
echo "Budget guidance: run 'aleph pricing instance' for current per-tier USD pricing."
echo "Account setup complete."
```

### Single VM Deployment

**Why provision over SSH, not `--setup-script`.** The Aleph CLI does **not** take a `--setup-script` flag, and there is no `aleph instance status --wait` / `aleph instance get`. The reliable pattern is: create the instance, poll `aleph instance list` for its IP, then run a provisioning script over SSH. This also keeps the (large) setup logic out of the on-chain message.

**Basic VM Deployment Script:**
```bash
#!/bin/bash
# deploy-single-vm.sh — create one instance, then provision it over SSH.
set -euo pipefail

# Configuration
VM_NAME="${1:-openclaw-primary}"
COMPUTE_UNITS="${2:-2}"          # 1 CU ~= 1 vCPU + 2 GiB RAM
ROOTFS_MIB="${3:-40960}"          # 40 GiB in MiB (rootfs-size is in MiB)
PAYMENT_TYPE="${4:-credit}"       # hold | superfluid | credit | nft
PAYMENT_CHAIN="${5:-BASE}"        # ETH | BASE | AVAX | SOL
CRN_URL="${6:-}"                  # optional: pin a CRN you verified; else auto-select
SSH_KEY="${ALEPH_SSH_KEY:-$HOME/.aleph-deploy/keys/aleph_ed25519}"
SSH_USER="${ALEPH_SSH_USER:-root}"   # image-dependent (root on Aleph base images)

echo "Deploying single VM: $VM_NAME ($COMPUTE_UNITS CU, $((ROOTFS_MIB/1024)) GiB)"

# 1. Create the instance with CURRENT flags. (Run `aleph instance create --help`
#    to confirm flags for your CLI version.)
create_args=(
    --name "$VM_NAME"
    --compute-units "$COMPUTE_UNITS"
    --rootfs-size "$ROOTFS_MIB"
    --ssh-pubkey-file "$SSH_KEY.pub"
    --payment-type "$PAYMENT_TYPE"
    --payment-chain "$PAYMENT_CHAIN"
    # Keep agent state on a persistent volume so a VM stop/rebuild doesn't wipe it.
    # Syntax: name=...,mount=...,size_mib=... (see `aleph instance create --help`).
    --persistent-volume "name=data,mount=/data,size_mib=20480"
)
if [[ -n "$CRN_URL" ]]; then
    create_args+=(--crn-url "$CRN_URL" --crn-auto-tac)   # auto-accept that CRN's T&C
fi

# Capture output so we can extract the item-hash the CLI prints.
CREATE_OUT="$(aleph instance create "${create_args[@]}")"
echo "$CREATE_OUT"
ITEM_HASH="$(printf '%s\n' "$CREATE_OUT" | grep -oE '[0-9a-f]{64}' | head -1)"
echo "Instance item-hash: ${ITEM_HASH:-<parse from output above>}"

# 2. Poll `aleph instance list` (the real command) for the assigned IP.
echo "Waiting for an IP to be assigned..."
VM_IP=""
for _ in $(seq 1 30); do
    VM_IP="$(aleph instance list --json \
        | jq -r --arg n "$VM_NAME" '.[] | select(.name==$n) | (.ipv4 // .ipv6 // empty)' \
        | head -1)"
    [[ -n "$VM_IP" ]] && break
    sleep 10
done
[[ -z "$VM_IP" ]] && { echo "No IP yet; check 'aleph instance list' and CRN allocation."; exit 1; }
echo "VM IP: $VM_IP"

# 3. Verify SSH (accept-new: trust first host key, reject changed keys = MITM defense).
echo "Testing SSH connection..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 \
    "$SSH_USER@$VM_IP" "echo 'SSH connection successful'"

# 4. Provision over SSH (kept out of the on-chain message; rerun-safe).
echo "Provisioning $VM_NAME..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER@$VM_IP" \
    "OPENCLAW_PORT=3000 bash -s" <<'PROVISION'
#!/bin/bash
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

# --- Base packages (modern names; ss replaces netstat; net-tools optional) ---
apt-get update && apt-get -y upgrade
apt-get install -y curl wget git htop unzip jq fail2ban ufw ca-certificates \
                   iproute2   # provides `ss`

# --- Docker Engine + Compose v2 plugin (NOT the deprecated docker-compose binary) ---
# Verify checksums in high-security environments; get-docker.sh is Docker's official script.
curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
sh /tmp/get-docker.sh
SUDO_USER_NAME="${SUDO_USER:-$(logname 2>/dev/null || echo root)}"
usermod -aG docker "$SUDO_USER_NAME" || true
docker compose version    # Compose v2 ships as a Docker plugin: `docker compose ...`

# --- Node.js 22.x (OpenClaw requires Node >= 22.19; 24 is recommended) ---
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
node --version

# --- Firewall: deny inbound by default; HTTP/HTTPS only on the public edge.
#     The OpenClaw port is NOT opened publicly (see Security section) — reach it
#     via the Tailscale mesh or behind HAProxy. ---
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw limit ssh
ufw allow 80
ufw allow 443
ufw --force enable

# --- Install OpenClaw (official installer; handles Node if missing) and onboard ---
# Docs: https://docs.openclaw.ai/install . The installer sets up a systemd daemon
# via `--install-daemon`; do not hand-roll an ExecStart=/usr/bin/node server.js unit.
curl -fsSL https://openclaw.ai/install.sh | bash
# Onboarding is interactive by design; for headless provisioning configure tokens
# via env/secret store first, then:
#   openclaw onboard --install-daemon
# Verify once installed:
#   openclaw --version && openclaw doctor && openclaw gateway status

echo "VM base provisioning complete."
PROVISION

echo "Deployment complete."
echo "SSH:     ssh -i $SSH_KEY $SSH_USER@$VM_IP"
echo "OpenClaw: reach it over Tailscale or via HAProxy (NOT a public 3000 port)."
echo "Tear down: aleph instance delete ${ITEM_HASH:-<item-hash>}"
```

> **OpenClaw config note.** OpenClaw is configured through `openclaw onboard` (writing to its own workspace under `~/.openclaw`/the daemon home), **not** by hand-authored `/opt/openclaw/config/production.json` files with keys like `server.cluster` or `aleph.node_id` — those were invented in earlier drafts and OpenClaw does not read them. Treat any per-node "role" we track (primary/worker) as *our* fleet metadata in `fleet.json`, separate from OpenClaw's own config.

---

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
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs

# Create a dedicated non-root user for fleet services. Running all services as
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
curl -fsSL https://openclaw.ai/install.sh | bash
# `openclaw onboard --install-daemon` is interactive; run it manually (or with a
# pre-seeded config/secret store) to create the systemd daemon. Do NOT hand-write
# /opt/openclaw/config/*.json — OpenClaw manages its own config via onboard.

echo "Primary node base setup complete (fleet-manager active on Tailscale)."
PRIMARY_SETUP
    )

    # Create the instance with CURRENT flags, then provision over SSH (the CLI has
    # no --setup-script / --image-ref / --disk-size / --crn). See `... create --help`.
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
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs

# Join the Tailscale mesh BEFORE registering, so `tailscale ip -4` returns a
# reachable mesh address (the control plane is only reachable over the mesh).
curl -fsSL https://tailscale.com/install.sh | sh
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
curl -fsSL https://openclaw.ai/install.sh | bash
# Run `openclaw onboard --install-daemon` to set up the daemon (see docs).

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
curl -fsSL https://tailscale.com/install.sh | sh        # official, OS-detecting installer
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
curl -fsSL https://get.docker.com | sh
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs
curl -fsSL https://tailscale.com/install.sh | sh
[[ -n "${TAILSCALE_AUTH_KEY:-}" ]] && tailscale up --auth-key="$TAILSCALE_AUTH_KEY" --hostname="$NODE_ID"
curl -fsSL https://openclaw.ai/install.sh | bash
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

## Auto-Provisioning Protocol (SRP)

### Agent Continuity System

**Auto-Provisioning Framework:**
> **What this is.** An OPTIONAL OpenClaw-specific "agent continuity" layer that
> replicates an agent's workspace (`SOUL.md`/`AGENTS.md`/`MEMORY.md`/skills) from the
> primary to workers, so a worker can take over the agent's state. It is independent
> of OpenClaw's own config and only meaningful if you run OpenClaw with such a
> workspace. Skip this whole section if you just need plain VMs. This script runs
> **on the primary node** (it is installed there by `setup_continuous_replication`).

```bash
#!/bin/bash
# auto-provisioning-protocol.sh  — runs ON the primary node.
set -euo pipefail

# SRP Configuration
SRP_VERSION="2.0.0"
REPLICATION_DIR="/opt/openclaw/replication"
FLEET_CONFIG="${FLEET_CONFIG:-/opt/fleet-manager/fleet.json}"   # node-local copy if present
BACKUP_RETENTION_DAYS=30

# Control-plane access for replicate_to_fleet(): the fleet manager listens on this
# node's Tailscale IP and needs the shared key. Both come from the root-owned
# EnvironmentFile that the fleet manager itself uses.
[[ -f /etc/fleet-manager.env ]] && { set -a; . /etc/fleet-manager.env; set +a; }
FLEET_MGR_HOST="${BIND_HOST:-127.0.0.1}"

echo "Auto-Provisioning Protocol v$SRP_VERSION"

initialize_srp() {
    echo "🔬 Initializing Auto-Provisioning Protocol..."
    
    # Create replication directory structure
    mkdir -p "$REPLICATION_DIR"/{soul,agents,memory,skills,config,logs}
    
    # Initialize replication manifest
    cat > "$REPLICATION_DIR/manifest.json" << 'MANIFEST'
{
  "srp_version": "2.0.0",
  "initialized": null,
  "last_replication": null,
  "replication_count": 0,
  "source_node": null,
  "target_nodes": [],
  "integrity_hash": null,
  "components": {
    "soul": {
      "path": "SOUL.md",
      "required": true,
      "last_modified": null,
      "hash": null
    },
    "agents": {
      "path": "AGENTS.md",
      "required": true,
      "last_modified": null,
      "hash": null
    },
    "memory": {
      "path": "MEMORY.md",
      "required": false,
      "last_modified": null,
      "hash": null
    },
    "skills": {
      "path": "skills/",
      "required": false,
      "last_modified": null,
      "hash": null
    },
    "user_data": {
      "path": "USER.md",
      "required": false,
      "last_modified": null,
      "hash": null
    }
  }
}
MANIFEST
    
    local tmpfile=$(mktemp)
    jq '.initialized = now | .source_node = env.HOSTNAME' "$REPLICATION_DIR/manifest.json" > "$tmpfile"
    mv "$tmpfile" "$REPLICATION_DIR/manifest.json"
    
    echo "✅ SRP initialized"
}

collect_replication_data() {
    echo "📦 Collecting replication data..."
    
    local openclaw_root="/opt/openclaw"
    local workspace_root="$openclaw_root/workspace"
    
    # Core agent files
    if [[ -f "$workspace_root/SOUL.md" ]]; then
        cp "$workspace_root/SOUL.md" "$REPLICATION_DIR/soul/"
        echo "✅ SOUL.md collected"
    fi
    
    if [[ -f "$workspace_root/AGENTS.md" ]]; then
        cp "$workspace_root/AGENTS.md" "$REPLICATION_DIR/agents/"
        echo "✅ AGENTS.md collected"
    fi
    
    if [[ -f "$workspace_root/MEMORY.md" ]]; then
        cp "$workspace_root/MEMORY.md" "$REPLICATION_DIR/memory/"
        echo "✅ MEMORY.md collected"
    fi
    
    # User configuration
    if [[ -f "$workspace_root/USER.md" ]]; then
        cp "$workspace_root/USER.md" "$REPLICATION_DIR/"
        echo "✅ USER.md collected"
    fi
    
    # Skills directory
    if [[ -d "$workspace_root/skills" ]]; then
        rsync -av "$workspace_root/skills/" "$REPLICATION_DIR/skills/"
        echo "✅ Skills directory synchronized"
    fi
    
    # Memory files (daily logs) — last 30 days. -print0/xargs -0 is space-safe.
    if [[ -d "$workspace_root/memory" ]]; then
        find "$workspace_root/memory" -type f -name "*.md" -mtime -30 -print0 \
            | xargs -0 -I{} cp {} "$REPLICATION_DIR/memory/"
        echo "Recent memory files collected"
    fi
    
    # Configuration backups
    cp -r "$openclaw_root/config" "$REPLICATION_DIR/" 2>/dev/null || true
    
    # Calculate integrity hashes
    update_integrity_hashes
}

# Stable content hash of a directory: hashes per-file (filename + bytes), sorted,
# then hashes that list. NUL-delimited so spaces/newlines in names are safe.
# Always EXCLUDES manifest.json so verification is repeatable (the manifest itself
# is mutated by this very function and must not feed back into the hash).
hash_tree() {
    local dir="$1"
    [[ -d "$dir" ]] || { echo "MISSING"; return; }
    find "$dir" -type f ! -name 'manifest.json' -print0 \
        | sort -z \
        | xargs -0 -r sha256sum \
        | sha256sum | cut -d' ' -f1
}

update_integrity_hashes() {
    echo "Calculating integrity hashes..."
    local manifest_file="$REPLICATION_DIR/manifest.json" tmpfile

    # Per-component hashes
    for component in soul agents memory skills; do
        local path="$REPLICATION_DIR/$component"
        if [[ -d "$path" ]]; then
            local hash; hash="$(hash_tree "$path")"
            tmpfile="$(mktemp)"
            jq --arg comp "$component" --arg hash "$hash" \
                '.components[$comp].hash = $hash' "$manifest_file" > "$tmpfile"
            mv "$tmpfile" "$manifest_file"
        fi
    done

    # Overall hash over the whole replication set, EXCLUDING the mutable manifest.
    local overall_hash; overall_hash="$(hash_tree "$REPLICATION_DIR")"
    tmpfile="$(mktemp)"
    jq --arg hash "$overall_hash" '.integrity_hash = $hash | .last_replication = now' \
        "$manifest_file" > "$tmpfile"
    mv "$tmpfile" "$manifest_file"
    echo "Integrity hashes updated (overall: ${overall_hash:0:12}...)"
}

# Verify a replicated set on the receiving node: recompute the overall hash
# (excluding manifest.json) and compare to manifest.integrity_hash.
verify_integrity() {
    local dir="${1:-$REPLICATION_DIR}"
    local expected actual
    expected="$(jq -r '.integrity_hash' "$dir/manifest.json")"
    actual="$(hash_tree "$dir")"
    if [[ "$expected" == "$actual" ]]; then
        echo "Integrity OK ($actual)"; return 0
    else
        echo "Integrity MISMATCH: expected $expected, got $actual"; return 1
    fi
}

replicate_to_node() {
    local target_node=$1
    local target_ip=$2
    
    echo "🔄 Replicating to node: $target_node ($target_ip)"
    
    # Create replication package
    local package_name="replication-$(date +%Y%m%d-%H%M%S).tar.gz"
    local package_path="/tmp/$package_name"
    
    cd "$REPLICATION_DIR"
    tar -czf "$package_path" .

    local ssh_user; ssh_user="$(jq -r '.ssh_user // "root"' "$FLEET_CONFIG" 2>/dev/null || echo root)"
    # SSH key on the primary: provisioning copies it here (see "key distribution" note).
    local ssh_key="${ALEPH_SSH_KEY:-/root/.ssh/aleph_ed25519}"
    # Transfer package to target node
    scp -i "$ssh_key" -o StrictHostKeyChecking=accept-new \
        "$package_path" "$ssh_user@$target_ip:/tmp/"

    # Execute replication on target node. We pass the package name + the SAME
    # hash_tree() implementation so the receiver can VERIFY BEFORE INSTALLING.
    ssh -i "$ssh_key" -o StrictHostKeyChecking=accept-new \
        "$ssh_user@$target_ip" "PKG='$package_name' bash -s" << 'REMOTE_SCRIPT'
#!/bin/bash
set -euo pipefail

echo "Receiving replication package..."
WORK="$(mktemp -d /tmp/repl.XXXXXX)"   # unique dir — no collisions between runs
trap 'rm -rf "$WORK"' EXIT
tar -xzf "/tmp/$PKG" -C "$WORK"
cd "$WORK"

# Same stable, manifest-excluding hash used on the sender.
hash_tree() {
    find "$1" -type f ! -name 'manifest.json' -print0 | sort -z \
        | xargs -0 -r sha256sum | sha256sum | cut -d' ' -f1
}

# VERIFY BEFORE INSTALLING — abort if the package is corrupt/tampered.
if [[ -f manifest.json ]]; then
    expected="$(jq -r '.integrity_hash' manifest.json)"
    actual="$(hash_tree "$WORK")"
    if [[ "$expected" != "$actual" ]]; then
        echo "Integrity MISMATCH (expected $expected, got $actual) — NOT installing."
        exit 1
    fi
    echo "Integrity OK ($actual)"
fi

# Install atomically-ish into the workspace, owned by the login user.
LOGIN_USER="$(logname 2>/dev/null || echo "${SUDO_USER:-$USER}")"
sudo mkdir -p /opt/openclaw/workspace/{memory,skills}
sudo chown -R "$LOGIN_USER":"$LOGIN_USER" /opt/openclaw/workspace
[[ -f soul/SOUL.md ]]     && cp soul/SOUL.md     /opt/openclaw/workspace/
[[ -f agents/AGENTS.md ]] && cp agents/AGENTS.md /opt/openclaw/workspace/
[[ -f memory/MEMORY.md ]] && cp memory/MEMORY.md /opt/openclaw/workspace/
[[ -f USER.md ]]          && cp USER.md          /opt/openclaw/workspace/
[[ -d skills ]] && rsync -a skills/ /opt/openclaw/workspace/skills/
[[ -d memory ]] && cp memory/*.md /opt/openclaw/workspace/memory/ 2>/dev/null || true

# Reload OpenClaw to pick up new workspace state (daemon-managed).
sudo systemctl restart openclaw || true
rm -f "/tmp/$PKG"
echo "Replication complete on $(hostname)"
REMOTE_SCRIPT

    rm -f "$package_path"
    echo "Replication to $target_node completed"
}

replicate_to_fleet() {
    echo "Initiating fleet-wide replication..."
    collect_replication_data

    # Ask the local fleet manager (Tailscale) for the worker list, authenticated.
    : "${FLEET_API_KEY:?FLEET_API_KEY not found in /etc/fleet-manager.env}"
    local nodes
    nodes="$(curl -fsS -H "x-api-key: $FLEET_API_KEY" "http://$FLEET_MGR_HOST:8080/fleet/status" \
        | jq -r --arg me "$(hostname)" '.nodes[] | select(.node_id != $me) | .ip_address')"

    for node_ip in $nodes; do
        replicate_to_node "worker" "$node_ip" &
    done
    wait
    echo "Fleet replication complete."

    local tmpfile; tmpfile="$(mktemp)"
    jq '.replication_count += 1' "$REPLICATION_DIR/manifest.json" > "$tmpfile"
    mv "$tmpfile" "$REPLICATION_DIR/manifest.json"
}

setup_continuous_replication() {
    echo "Setting up continuous replication..."

    # Install THIS script at a stable path so the cron job can call it. We copy the
    # currently-running file rather than assuming it already exists there.
    install -D -m 755 "$(readlink -f "$0")" /opt/openclaw/replication/auto-provisioning-protocol.sh

    # Cron wrapper INVOKES the script's subcommand (does NOT `source` it — sourcing
    # would run the command dispatcher at the bottom with no args and execute
    # `initialize_srp`, clobbering the manifest as a side effect).
    cat > /opt/openclaw/replication-cron.sh << 'CRON_SCRIPT'
#!/bin/bash
export PATH="/usr/local/bin:/usr/bin:/bin"
SRP=/opt/openclaw/replication/auto-provisioning-protocol.sh
# Only the primary (the node running fleet-manager) drives fleet replication.
if [[ -f /opt/fleet-manager/fleet-manager.js ]]; then
    echo "$(date -Iseconds): scheduled replication from primary"
    "$SRP" replicate
else
    echo "$(date -Iseconds): worker node — skipping"
fi
CRON_SCRIPT
    chmod +x /opt/openclaw/replication-cron.sh

    (crontab -l 2>/dev/null; echo "*/5 * * * * /opt/openclaw/replication-cron.sh >> /var/log/replication.log 2>&1") | crontab -
    echo "Continuous replication configured (every 5 min, primary only)"
}

# Emergency replication trigger
emergency_replicate() {
    local reason="${1:-manual_trigger}"
    
    echo "🚨 Emergency replication triggered: $reason"
    
    # Force immediate collection and replication
    collect_replication_data
    replicate_to_fleet
    
    # Log emergency replication
    echo "$(date -Iseconds): Emergency replication completed - $reason" >> "$REPLICATION_DIR/logs/emergency.log"
}

# Command dispatcher
case "${1:-init}" in
    "init")
        initialize_srp
        ;;
    "collect")
        collect_replication_data
        ;;
    "replicate")
        replicate_to_fleet
        ;;
    "continuous")
        setup_continuous_replication
        ;;
    "emergency")
        emergency_replicate "$2"
        ;;
    *)
        echo "Usage: $0 {init|collect|replicate|continuous|emergency}"
        exit 1
        ;;
esac
```

---

## Inter-VM Communication Networks

### Tailscale Mesh Network Setup

**Tailscale Integration Script:**
```bash
#!/bin/bash
# setup-tailscale-mesh.sh

set -e

TAILSCALE_AUTH_KEY="${1:-}"
FLEET_CONFIG="$HOME/.aleph-deploy/configs/fleet.json"
SSH_KEY="${ALEPH_SSH_KEY:-$HOME/.aleph-deploy/keys/aleph_ed25519}"
SSH_USER="$(jq -r '.ssh_user // "root"' "$FLEET_CONFIG" 2>/dev/null || echo root)"

if [[ -z "$TAILSCALE_AUTH_KEY" ]]; then
    echo "❌ Error: Tailscale auth key required"
    echo "Get your key from: https://login.tailscale.com/admin/settings/keys"
    echo "Usage: $0 <tailscale-auth-key>"
    exit 1
fi

setup_tailscale_node() {
    local node_ip=$1
    local node_name=$2
    local ssh_user="${SSH_USER:-$(jq -r '.ssh_user // "root"' "$FLEET_CONFIG")}"

    echo "Setting up Tailscale on $node_name ($node_ip)..."

    ssh -i ~/.aleph-deploy/keys/aleph_ed25519 -o StrictHostKeyChecking=accept-new \
        "$ssh_user@$node_ip" << TAILSCALE_SETUP
#!/bin/bash
set -euo pipefail

echo "Installing Tailscale..."

# Use the official OS-detecting installer instead of pinning the Ubuntu 22.04
# ("jammy") apt repo — this works on Ubuntu 24.04 and other distros without edits.
curl -fsSL https://tailscale.com/install.sh | sh

# Connect to Tailscale network
# WARNING: Passing --auth-key on the command line exposes it in the process list.
# For production, write the key to a file and use --auth-key=file:/path/to/key
echo "$TAILSCALE_AUTH_KEY" > /tmp/ts-authkey && chmod 600 /tmp/ts-authkey
sudo tailscale up --auth-key="file:/tmp/ts-authkey" --hostname="$node_name"
rm -f /tmp/ts-authkey

# Enable IP forwarding for subnet routing
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.conf
echo 'net.ipv6.conf.all.forwarding = 1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Get Tailscale IP
TAILSCALE_IP=\$(tailscale ip -4)
echo "✅ Tailscale configured. IP: \$TAILSCALE_IP"

# Update local network configuration
cat > /opt/tailscale-info.json << INFO
{
  "tailscale_ip": "\$TAILSCALE_IP",
  "node_name": "$node_name",
  "connected": true,
  "setup_date": "\$(date -Iseconds)"
}
INFO

# Configure Tailscale service for auto-start
sudo systemctl enable tailscaled
sudo systemctl start tailscaled

echo "🎉 Tailscale setup complete on $node_name"
TAILSCALE_SETUP
    
    echo "✅ Tailscale configured on $node_name"
}

configure_mesh_network() {
    echo "🕸️ Configuring Tailscale mesh network..."
    
    # Get all fleet nodes
    local primary_ip=$(jq -r '.primary_node.ip' "$FLEET_CONFIG")
    local primary_name=$(jq -r '.primary_node.name' "$FLEET_CONFIG")
    
    # Setup Tailscale on primary node
    setup_tailscale_node "$primary_ip" "$primary_name"
    
    # Setup Tailscale on worker nodes
    local workers=$(jq -r '.worker_nodes[] | .name + " " + (.ip // "unknown")' "$FLEET_CONFIG")
    
    while IFS=' ' read -r worker_name worker_ip; do
        if [[ "$worker_ip" != "unknown" ]]; then
            setup_tailscale_node "$worker_ip" "$worker_name"
        fi
    done <<< "$workers"
    
    echo "⏳ Waiting for mesh network to stabilize..."
    sleep 30
    
    # Verify mesh connectivity
    echo "🔍 Verifying mesh connectivity..."
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER"@"$primary_ip" << 'VERIFY'
#!/bin/bash
echo "Testing Tailscale mesh connectivity..."

tailscale status --json | jq -r '.Peer[] | .HostName + " -> " + .TailscaleIPs[0]' | while IFS=' -> ' read -r hostname tailscale_ip; do
    echo -n "Ping $hostname ($tailscale_ip): "
    if ping -c 1 -W 2 "$tailscale_ip" >/dev/null 2>&1; then
        echo "✅ Connected"
    else
        echo "❌ Failed"
    fi
done
VERIFY
    
    echo "✅ Tailscale mesh network configured"
}

setup_ssh_tunnels() {
    echo "🚇 Setting up SSH tunnels as backup communication..."
    
    local primary_ip=$(jq -r '.primary_node.ip' "$FLEET_CONFIG")
    
    # Create SSH tunnel configuration
    cat > ~/.aleph-deploy/configs/ssh-tunnels.conf << 'TUNNEL_CONFIG'
# SSH Tunnel Configuration for Fleet Communication
# Format: LocalPort:RemoteHost:RemotePort

# Fleet Manager Access (Primary -> Workers)
8080:localhost:8080

# OpenClaw API Access
3000:localhost:3000

# Health Monitoring
9090:localhost:9090

# Log Aggregation
5514:localhost:514
TUNNEL_CONFIG
    
    # Setup tunnel management script
    cat > ~/.aleph-deploy/scripts/manage-tunnels.sh << 'TUNNEL_SCRIPT'
#!/bin/bash
# manage-tunnels.sh — SSH tunnels as a BACKUP path when Tailscale is unavailable.
# Prefer the Tailscale mesh; use this only as fallback. Tracks its own PIDs so
# `stop` never kills unrelated SSH sessions belonging to the same user.
set -euo pipefail

TUNNEL_CONFIG="$HOME/.aleph-deploy/configs/ssh-tunnels.conf"
FLEET_CONFIG="$HOME/.aleph-deploy/configs/fleet.json"
SSH_KEY="${ALEPH_SSH_KEY:-$HOME/.aleph-deploy/keys/aleph_ed25519}"
SSH_USER="$(jq -r '.ssh_user // "root"' "$FLEET_CONFIG" 2>/dev/null || echo root)"
PID_DIR="$HOME/.aleph-deploy/run/tunnels"
mkdir -p "$PID_DIR"

start_tunnels() {
    local target_ip="$1" target_name="$2"
    echo "Starting SSH tunnels to $target_name ($target_ip)..."
    local last_octet; last_octet="$(echo "$target_ip" | awk -F. '{print $NF+0}')"
    while IFS=':' read -r local_port remote_host remote_port; do
        [[ "$local_port" =~ ^#.*$ || -z "$local_port" ]] && continue
        local unique_port=$((local_port + last_octet))
        # -f backgrounds AFTER auth; capture the resulting PID via a control socket
        # so we can stop exactly this tunnel later (no broad pkill).
        local ctl="$PID_DIR/${target_name}-${unique_port}.ctl"
        ssh -i "$SSH_KEY" -f -N -L "$unique_port:$remote_host:$remote_port" \
            -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=60 \
            -o ControlMaster=yes -o ControlPath="$ctl" \
            "$SSH_USER@$target_ip"
        echo "  Tunnel: localhost:$unique_port -> $target_name:$remote_port (ctl: $ctl)"
    done < "$TUNNEL_CONFIG"
}

stop_tunnels() {
    echo "Stopping SSH tunnels started by this tool..."
    shopt -s nullglob
    for ctl in "$PID_DIR"/*.ctl; do
        # Address the exact control socket; -O exit cleanly closes only that tunnel.
        local host; host="$(basename "$ctl")"
        ssh -O exit -o ControlPath="$ctl" placeholder 2>/dev/null || true
        rm -f "$ctl"
        echo "  closed $host"
    done
}

list_tunnels() {
    echo "Active tunnels (control sockets in $PID_DIR):"
    shopt -s nullglob
    for ctl in "$PID_DIR"/*.ctl; do
        echo -n "  $(basename "$ctl"): "
        ssh -O check -o ControlPath="$ctl" placeholder 2>&1 || echo "stale"
    done
}

case "${1:-start}" in
    "start")
        jq -r '.worker_nodes[] | .name + " " + (.ip // "unknown")' "$FLEET_CONFIG" \
        | while IFS=' ' read -r name ip; do
            [[ "$ip" != "unknown" ]] && start_tunnels "$ip" "$name"
        done
        ;;
    "stop")    stop_tunnels ;;
    "list")    list_tunnels ;;
    "restart") stop_tunnels; sleep 2; "$0" start ;;
    *)
        echo "Usage: $0 {start|stop|list|restart}"
        exit 1
        ;;
esac
TUNNEL_SCRIPT
    
    chmod +x ~/.aleph-deploy/scripts/manage-tunnels.sh
    
    echo "✅ SSH tunnel management configured"
}

# Command dispatcher
case "${1:-configure}" in
    "configure")
        configure_mesh_network
        ;;
    "tunnels")
        setup_ssh_tunnels
        ;;
    *)
        echo "Usage: $0 <tailscale-auth-key> [configure|tunnels]"
        echo ""
        echo "Steps:"
        echo "1. Get Tailscale auth key from https://login.tailscale.com/admin/settings/keys"
        echo "2. Run: $0 <auth-key> configure"
        echo "3. Run: $0 <auth-key> tunnels"
        exit 1
        ;;
esac
```

---

## Load Distribution & Orchestration

### Load Balancer Configuration

**HAProxy Load Balancer Setup:**
```bash
#!/bin/bash
# setup-load-balancer.sh
set -euo pipefail

FLEET_CONFIG="$HOME/.aleph-deploy/configs/fleet.json"
SSH_KEY="${ALEPH_SSH_KEY:-$HOME/.aleph-deploy/keys/aleph_ed25519}"
SSH_USER="$(jq -r '.ssh_user // "root"' "$FLEET_CONFIG" 2>/dev/null || echo root)"
PRIMARY_IP=$(jq -r '.primary_node.ip' "$FLEET_CONFIG")          # public IP (SSH hop only)
PRIMARY_TS_IP=$(jq -r '.primary_node.tailscale_ip' "$FLEET_CONFIG")

# Stats credentials: generate a random password (never a static one) and store it
# locally so you can look it up. The stats page is bound to Tailscale only.
STATS_USER="${STATS_USER:-admin}"
STATS_PASS="${STATS_PASS:-$(openssl rand -hex 16)}"
echo "HAProxy stats login: $STATS_USER / $STATS_PASS"
echo "STATS_USER=$STATS_USER"$'\n'"STATS_PASS=$STATS_PASS" > ~/.aleph-deploy/configs/haproxy-stats.env
chmod 600 ~/.aleph-deploy/configs/haproxy-stats.env

echo "Setting up HAProxy load balancer..."

# Install HAProxy on primary node. Unquoted heredoc so STATS_* and PRIMARY_TS_IP
# expand HERE into the remote script.
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER@$PRIMARY_IP" << HAPROXY_SETUP
#!/bin/bash
set -euo pipefail

echo "Installing HAProxy..."
sudo apt-get update
sudo apt-get install -y haproxy

sudo cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg.backup

# Resolve this node's Tailscale IP for the (private) stats listener.
TS_IP="\$(tailscale ip -4 2>/dev/null || echo '${PRIMARY_TS_IP}')"

# TLS: HAProxy terminates HTTPS with a single COMBINED PEM (fullchain + private
# key concatenated, key last) at this path. Drop a real cert here for production:
#   sudo cat fullchain.pem privkey.pem > \$TLS_PEM   # order matters: cert(s) then key
# (Let's Encrypt: \`cat \$LE/fullchain.pem \$LE/privkey.pem\`.) If no cert is present
# we DO NOT open a bogus plaintext :443 — the 443 listener is added only when the
# PEM exists, so the advertised URL matches what actually serves TLS.
TLS_PEM="/etc/haproxy/certs/site.pem"
sudo mkdir -p /etc/haproxy/certs && sudo chmod 700 /etc/haproxy/certs
if [[ -s "\$TLS_PEM" ]]; then
    sudo chmod 600 "\$TLS_PEM"
    TLS_BIND="bind *:443 ssl crt \$TLS_PEM alpn h2,http/1.1"
    echo "TLS cert found at \$TLS_PEM — enabling HTTPS on :443"
else
    TLS_BIND="# bind *:443 ssl crt \$TLS_PEM   # no cert present — HTTPS disabled (drop a combined PEM here to enable)"
    echo "No TLS cert at \$TLS_PEM — serving HTTP only on :80 (HTTPS not advertised)."
fi

# Create HAProxy configuration. Single-quoted inner heredoc keeps HAProxy's own
# \$-free syntax literal; we inject TS_IP / creds via sed right after.
cat > /tmp/haproxy.cfg << 'HAPROXY_CONFIG'
global
    daemon
    user haproxy
    group haproxy
    log stdout local0 info
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s

defaults
    mode http
    timeout connect 5000ms
    timeout client 50000ms
    timeout server 50000ms
    option httplog
    option dontlognull
    option redispatch
    retries 3

# Statistics interface — bound to the TAILSCALE IP only (never *:9090), with a
# randomly generated password. Reachable only over the private mesh.
listen stats
    bind __TS_IP__:9090
    stats enable
    stats uri /haproxy-stats
    stats realm HAProxy\ Statistics
    stats auth __STATS_USER__:__STATS_PASS__

# Frontend - public entry point. Always listens on :80. The :443 line below is
# injected by sed: a real `bind *:443 ssl crt <combined.pem>` when a cert exists,
# otherwise a commented-out placeholder (so we never expose a plaintext :443 that
# masquerades as HTTPS). See the cert-provisioning note above.
frontend openclaw_frontend
    bind *:80
    __TLS_BIND__

    # Health check endpoint (matches the fleet manager's UNAUTHENTICATED /health)
    monitor-uri /health

    default_backend openclaw_nodes

# Backend - OpenClaw nodes
backend openclaw_nodes
    balance roundrobin
    option httpchk GET /health
    
    # Health check configuration
    default-server check maxconn 50 rise 2 fall 3 inter 2s
    
    # Primary node (higher weight)
    server primary-node localhost:3000 weight 150 check
    
    # Worker nodes will be added dynamically
HAPROXY_CONFIG

# Inject the Tailscale IP, stats credentials, and the TLS bind line (use | as the
# sed delimiter since values contain no pipes; credentials were generated, not
# hardcoded). __TLS_BIND__ becomes a real ssl bind only when a cert exists.
sed -i "s|__TS_IP__|\${TS_IP}|; s|__STATS_USER__|${STATS_USER}|; s|__STATS_PASS__|${STATS_PASS}|; s|__TLS_BIND__|\${TLS_BIND}|" /tmp/haproxy.cfg

# Validate the config BEFORE replacing the live one (avoids a broken restart).
if sudo haproxy -c -f /tmp/haproxy.cfg; then
    sudo mv /tmp/haproxy.cfg /etc/haproxy/haproxy.cfg
    sudo systemctl enable haproxy
    sudo systemctl restart haproxy
    if [[ -s "\$TLS_PEM" ]]; then
        echo "HAProxy installed: HTTP on :80, HTTPS on :443 (cert \$TLS_PEM); stats on \${TS_IP}:9090 (Tailscale only)"
    else
        echo "HAProxy installed: HTTP on :80 only (no TLS cert); stats on \${TS_IP}:9090 (Tailscale only)"
    fi
else
    echo "HAProxy config invalid — not applying."; exit 1
fi
HAPROXY_SETUP

echo "Configuring dynamic backend management..."

# Create backend management script
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER@$PRIMARY_IP" << 'BACKEND_SCRIPT'
#!/bin/bash

cat > /opt/manage-haproxy-backends.sh << 'MANAGE_BACKENDS'
#!/bin/bash

HAPROXY_STATS_SOCKET="/run/haproxy/admin.sock"

# Control-plane access: the fleet manager listens on the node's Tailscale IP and
# requires the shared API key. Both come from the root-owned EnvironmentFile that
# the fleet manager also uses (FLEET_API_KEY, BIND_HOST).
[[ -f /etc/fleet-manager.env ]] && { set -a; . /etc/fleet-manager.env; set +a; }
FLEET_MGR_HOST="${BIND_HOST:-127.0.0.1}"
: "${FLEET_API_KEY:?FLEET_API_KEY not found in /etc/fleet-manager.env}"

add_backend_server() {
    local server_name=$1
    local server_ip=$2
    local server_port=${3:-3000}
    local weight=${4:-100}
    
    echo "Adding backend server: $server_name ($server_ip:$server_port)"
    
    # Add server to HAProxy backend
    echo "add server openclaw_nodes/$server_name $server_ip:$server_port weight $weight check" | \
        sudo socat stdio "$HAPROXY_STATS_SOCKET"
    
    echo "✅ Server $server_name added to load balancer"
}

remove_backend_server() {
    local server_name=$1
    
    echo "Removing backend server: $server_name"
    
    # Disable server first
    echo "disable server openclaw_nodes/$server_name" | sudo socat stdio "$HAPROXY_STATS_SOCKET"
    
    # Remove server from backend
    echo "del server openclaw_nodes/$server_name" | sudo socat stdio "$HAPROXY_STATS_SOCKET"
    
    echo "✅ Server $server_name removed from load balancer"
}

list_backend_servers() {
    echo "📋 Current backend servers:"
    echo "show servers state openclaw_nodes" | sudo socat stdio "$HAPROXY_STATS_SOCKET"
}

update_server_weight() {
    local server_name=$1
    local new_weight=$2
    
    echo "Updating weight for $server_name to $new_weight"
    echo "set weight openclaw_nodes/$server_name $new_weight" | sudo socat stdio "$HAPROXY_STATS_SOCKET"
}

sync_with_fleet() {
    echo "🔄 Syncing backends with fleet registry..."
    
    # Get current fleet status (over Tailscale, authenticated)
    local fleet_nodes=$(curl -fsS -H "x-api-key: $FLEET_API_KEY" "http://$FLEET_MGR_HOST:8080/fleet/status" | jq -r '.nodes[] | .node_id + "," + .ip_address + "," + .status')
    
    # Get current HAProxy backends
    local current_backends=$(echo "show servers state openclaw_nodes" | sudo socat stdio "$HAPROXY_STATS_SOCKET" | awk '{print $4}' | grep -v "#" | sort)
    
    # Add new nodes to HAProxy
    while IFS=',' read -r node_id ip_address status; do
        if [[ "$status" == "active" && "$node_id" != "primary" ]]; then
            # Check if server already exists in HAProxy
            if ! echo "$current_backends" | grep -q "$node_id"; then
                add_backend_server "$node_id" "$ip_address" 3000 100
            fi
        fi
    done <<< "$fleet_nodes"
    
    # Remove offline nodes from HAProxy
    echo "$current_backends" | while read -r backend_name; do
        [[ -z "$backend_name" ]] && continue
        
        # Check if this backend still exists in fleet
        if ! echo "$fleet_nodes" | grep -q "$backend_name,"; then
            echo "⚠️  Backend $backend_name not found in fleet, removing..."
            remove_backend_server "$backend_name"
        fi
    done
    
    echo "✅ Backend synchronization complete"
}

# Auto-sync with fleet every 60 seconds
auto_sync() {
    while true; do
        sync_with_fleet
        sleep 60
    done
}

case "${1:-sync}" in
    "add")
        add_backend_server "$2" "$3" "$4" "$5"
        ;;
    "remove")
        remove_backend_server "$2"
        ;;
    "list")
        list_backend_servers
        ;;
    "weight")
        update_server_weight "$2" "$3"
        ;;
    "sync")
        sync_with_fleet
        ;;
    "auto")
        auto_sync
        ;;
    *)
        echo "Usage: $0 {add|remove|list|weight|sync|auto}"
        echo ""
        echo "Commands:"
        echo "  add <name> <ip> [port] [weight] - Add backend server"
        echo "  remove <name>                   - Remove backend server"
        echo "  list                            - List all backend servers"
        echo "  weight <name> <weight>          - Update server weight"
        echo "  sync                            - Sync with fleet registry"
        echo "  auto                            - Auto-sync daemon"
        exit 1
        ;;
esac
MANAGE_BACKENDS

chmod +x /opt/manage-haproxy-backends.sh

# Install socat for HAProxy socket communication
sudo apt-get install -y socat

# Create systemd service for auto-sync
cat > /etc/systemd/system/haproxy-fleet-sync.service << 'SYNC_SERVICE'
[Unit]
Description=HAProxy Fleet Synchronization
After=haproxy.service fleet-manager.service

[Service]
Type=simple
User=root
EnvironmentFile=/etc/fleet-manager.env
ExecStart=/opt/manage-haproxy-backends.sh auto
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
SYNC_SERVICE

sudo systemctl daemon-reload
sudo systemctl enable haproxy-fleet-sync
sudo systemctl start haproxy-fleet-sync

echo "HAProxy backend management configured"
BACKEND_SCRIPT

echo "Load balancer setup complete."
# Only advertise HTTPS if the combined PEM is actually present on the primary
# (the same condition the HAProxy config uses to add the :443 ssl bind).
if ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER@$PRIMARY_IP" \
       "test -s /etc/haproxy/certs/site.pem" 2>/dev/null; then
    echo "Public load balancer: https://$PRIMARY_IP  (HTTP on http://$PRIMARY_IP)"
else
    echo "Public load balancer: http://$PRIMARY_IP"
    echo "  (HTTPS not enabled — add a combined fullchain+key PEM at"
    echo "   /etc/haproxy/certs/site.pem on the primary and re-run to serve TLS on :443.)"
fi
echo "HAProxy stats (Tailscale only): http://$PRIMARY_TS_IP:9090/haproxy-stats"
echo "Stats login is in ~/.aleph-deploy/configs/haproxy-stats.env"
```

### Request Distribution Strategies

**Load Distribution Algorithm:**
```bash
#!/bin/bash
# intelligent-load-distribution.sh

FLEET_CONFIG="$HOME/.aleph-deploy/configs/fleet.json"
SSH_KEY="${ALEPH_SSH_KEY:-$HOME/.aleph-deploy/keys/aleph_ed25519}"
SSH_USER="$(jq -r '.ssh_user // "root"' "$FLEET_CONFIG" 2>/dev/null || echo root)"
PRIMARY_IP=$(jq -r '.primary_node.ip' "$FLEET_CONFIG")

setup_intelligent_distribution() {
    echo "🧠 Setting up intelligent load distribution..."
    
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER@$PRIMARY_IP" << 'DISTRIBUTION_SETUP'
#!/bin/bash
set -euo pipefail

# Node.js 22.x (OpenClaw and our tooling require Node >= 22.19)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs

# Create intelligent distribution service
mkdir -p /opt/load-distributor
cd /opt/load-distributor

cat > intelligent-distributor.js << 'DISTRIBUTOR_JS'
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

// Fleet manager URL + API key come from the environment (set by the systemd unit
// via /etc/fleet-manager.env). All control-plane calls MUST send x-api-key.
const FLEET_API_KEY = process.env.FLEET_API_KEY;
const FLEET_MGR_URL = `http://${process.env.BIND_HOST || '127.0.0.1'}:8080`;
if (!FLEET_API_KEY) { console.error('FATAL: FLEET_API_KEY missing'); process.exit(1); }
const fleet = axios.create({ baseURL: FLEET_MGR_URL, headers: { 'x-api-key': FLEET_API_KEY }, timeout: 5000 });

class IntelligentDistributor {
    constructor() {
        this.nodes = new Map();
        this.requestHistory = [];
        this.loadMetrics = new Map();
        
        // Load balancing strategies
        this.strategies = {
            'round_robin': this.roundRobin.bind(this),
            'least_connections': this.leastConnections.bind(this),
            'weighted_response_time': this.weightedResponseTime.bind(this),
            'resource_aware': this.resourceAware.bind(this),
            'session_affinity': this.sessionAffinity.bind(this)
        };
        
        this.currentStrategy = 'resource_aware';
        this.updateMetrics();
    }
    
    async updateMetrics() {
        try {
            // Get fleet status (authenticated, over Tailscale)
            const fleetResponse = await fleet.get('/fleet/status');
            const nodes = fleetResponse.data.nodes || [];
            
            // Update node metrics
            for (const node of nodes) {
                if (node.status === 'active') {
                    const metrics = await this.collectNodeMetrics(node);
                    this.loadMetrics.set(node.node_id, metrics);
                }
            }
        } catch (error) {
            console.error('Error updating metrics:', error.message);
        }
        
        // Schedule next update
        setTimeout(() => this.updateMetrics(), 30000); // 30 seconds
    }
    
    async collectNodeMetrics(node) {
        try {
            // Mock metrics collection - replace with actual implementation
            return {
                cpu_usage: Math.random() * 100,
                memory_usage: Math.random() * 100,
                active_connections: Math.floor(Math.random() * 50),
                avg_response_time: Math.random() * 1000,
                error_rate: Math.random() * 0.1,
                last_updated: new Date().toISOString()
            };
        } catch (error) {
            console.error(`Error collecting metrics for ${node.node_id}:`, error.message);
            return null;
        }
    }
    
    // Round Robin Strategy
    roundRobin(availableNodes) {
        if (!this.roundRobinIndex || this.roundRobinIndex >= availableNodes.length) {
            this.roundRobinIndex = 0;
        }
        return availableNodes[this.roundRobinIndex++];
    }
    
    // Least Connections Strategy
    leastConnections(availableNodes) {
        let selectedNode = availableNodes[0];
        let minConnections = Infinity;
        
        for (const node of availableNodes) {
            const metrics = this.loadMetrics.get(node.node_id);
            if (metrics && metrics.active_connections < minConnections) {
                minConnections = metrics.active_connections;
                selectedNode = node;
            }
        }
        
        return selectedNode;
    }
    
    // Weighted Response Time Strategy
    weightedResponseTime(availableNodes) {
        let selectedNode = availableNodes[0];
        let minResponseTime = Infinity;
        
        for (const node of availableNodes) {
            const metrics = this.loadMetrics.get(node.node_id);
            if (metrics && metrics.avg_response_time < minResponseTime) {
                minResponseTime = metrics.avg_response_time;
                selectedNode = node;
            }
        }
        
        return selectedNode;
    }
    
    // Resource Aware Strategy (CPU + Memory + Response Time)
    resourceAware(availableNodes) {
        let selectedNode = availableNodes[0];
        let bestScore = Infinity;
        
        for (const node of availableNodes) {
            const metrics = this.loadMetrics.get(node.node_id);
            if (metrics) {
                // Calculate composite score (lower is better)
                const score = (
                    metrics.cpu_usage * 0.4 +
                    metrics.memory_usage * 0.3 +
                    (metrics.avg_response_time / 10) * 0.2 +
                    metrics.error_rate * 100 * 0.1
                );
                
                if (score < bestScore) {
                    bestScore = score;
                    selectedNode = node;
                }
            }
        }
        
        return selectedNode;
    }
    
    // Session Affinity Strategy
    sessionAffinity(availableNodes, sessionId) {
        if (!sessionId) return this.resourceAware(availableNodes);
        
        // Simple hash-based affinity
        const hash = this.simpleHash(sessionId);
        const nodeIndex = hash % availableNodes.length;
        return availableNodes[nodeIndex];
    }
    
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }
    
    async selectNode(requestInfo = {}) {
        try {
            // Get available nodes (authenticated)
            const fleetResponse = await fleet.get('/fleet/status');
            const availableNodes = fleetResponse.data.nodes.filter(n => n.status === 'active');
            
            if (availableNodes.length === 0) {
                throw new Error('No available nodes');
            }
            
            // Apply distribution strategy
            const strategy = this.strategies[this.currentStrategy];
            const selectedNode = strategy(availableNodes, requestInfo.sessionId);
            
            // Log request for analysis
            this.requestHistory.push({
                timestamp: new Date().toISOString(),
                selected_node: selectedNode.node_id,
                strategy: this.currentStrategy,
                request_info: requestInfo
            });
            
            // Keep only last 1000 requests
            if (this.requestHistory.length > 1000) {
                this.requestHistory = this.requestHistory.slice(-1000);
            }
            
            return selectedNode;
            
        } catch (error) {
            console.error('Error selecting node:', error.message);
            throw error;
        }
    }
}

const distributor = new IntelligentDistributor();

// API Endpoints
app.get('/distribute/node', async (req, res) => {
    try {
        const requestInfo = {
            sessionId: req.headers['x-session-id'],
            requestType: req.query.type,
            clientIp: req.ip
        };
        
        const selectedNode = await distributor.selectNode(requestInfo);
        res.json({
            node_id: selectedNode.node_id,
            ip_address: selectedNode.ip_address,
            strategy: distributor.currentStrategy
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/distribute/metrics', (req, res) => {
    const metrics = {};
    distributor.loadMetrics.forEach((value, key) => {
        metrics[key] = value;
    });
    res.json(metrics);
});

app.get('/distribute/history', (req, res) => {
    res.json(distributor.requestHistory.slice(-100)); // Last 100 requests
});

app.post('/distribute/strategy', (req, res) => {
    const { strategy } = req.body;
    if (distributor.strategies[strategy]) {
        distributor.currentStrategy = strategy;
        res.json({ success: true, strategy });
    } else {
        res.status(400).json({ error: 'Invalid strategy' });
    }
});

const PORT = 8081;
// Bind to localhost only — this is an internal control API consumed by the
// primary's own routing logic, not a public endpoint.
app.listen(PORT, '127.0.0.1', () => {
    console.log(`Intelligent Load Distributor on 127.0.0.1:${PORT}`);
});
DISTRIBUTOR_JS

# Install dependencies
npm init -y
npm install express axios

# Create systemd service
cat > /etc/systemd/system/load-distributor.service << 'DISTRIBUTOR_SERVICE'
[Unit]
Description=Intelligent Load Distributor
After=network.target fleet-manager.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/load-distributor
EnvironmentFile=/etc/fleet-manager.env
ExecStart=/usr/bin/node intelligent-distributor.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
DISTRIBUTOR_SERVICE

sudo systemctl daemon-reload
sudo systemctl enable load-distributor
sudo systemctl start load-distributor

echo "Intelligent load distributor configured (localhost:8081, internal only)"
DISTRIBUTION_SETUP

echo "Intelligent load distribution setup complete."
echo "Distribution API is internal (localhost:8081 on the primary)."
echo "From the primary: curl http://127.0.0.1:8081/distribute/node"
}

> **Metrics note.** `collectNodeMetrics()` below returns **randomized placeholder values** so the strategy code is runnable out of the box. For real distribution, replace it with actual per-node metrics — e.g. scrape `node_exporter`/cAdvisor over the Tailscale mesh, or have each worker POST CPU/mem/conn counts to the fleet manager. See the sibling `monitoring-observability` skill for a production metrics pipeline.

# Execute setup
setup_intelligent_distribution
```

---

## Disaster Recovery & Auto-Recreation

### Automated Backup System

**Comprehensive Backup Framework:**
```bash
#!/bin/bash
# disaster-recovery-system.sh

set -e

FLEET_CONFIG="$HOME/.aleph-deploy/configs/fleet.json"
SSH_KEY="${ALEPH_SSH_KEY:-$HOME/.aleph-deploy/keys/aleph_ed25519}"
SSH_USER="$(jq -r '.ssh_user // "root"' "$FLEET_CONFIG" 2>/dev/null || echo root)"
BACKUP_RETENTION_DAYS=30
BACKUP_STORAGE_PATH="/opt/openclaw/backups"

echo "🛡️ Setting up Disaster Recovery System..."

setup_backup_infrastructure() {
    local primary_ip=$(jq -r '.primary_node.ip' "$FLEET_CONFIG")
    
    echo "📦 Setting up backup infrastructure..."
    
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER"@"$primary_ip" << 'BACKUP_SETUP'
#!/bin/bash
set -e

# Create backup directories. Own them by the ACTUAL login user (root on Aleph
# base images, ubuntu on some) — never hardcode "ubuntu", which does not exist on
# root-only images and would abort this script under `set -e`.
LOGIN_USER="$(logname 2>/dev/null || echo "${SUDO_USER:-root}")"
sudo mkdir -p /opt/openclaw/backups/{fleet,nodes,data,logs}
sudo chown -R "$LOGIN_USER":"$LOGIN_USER" /opt/openclaw/backups

# Install backup tools
sudo apt-get update
sudo apt-get install -y rsync rclone jq awscli

# Create comprehensive backup script
cat > /opt/openclaw/backup-system.sh << 'BACKUP_SCRIPT'
#!/bin/bash
set -uo pipefail

BACKUP_BASE="/opt/openclaw/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS=30
# SSH login user for reaching workers (image-dependent; Aleph base images use root).
REMOTE_USER="${REMOTE_USER:-root}"
SSH_KEY="/root/.ssh/aleph_ed25519"

log_message() {
    echo "$(date -Iseconds): $1" | tee -a "$BACKUP_BASE/backup.log"
}

backup_fleet_config() {
    log_message "📋 Backing up fleet configuration..."
    
    local backup_dir="$BACKUP_BASE/fleet/$TIMESTAMP"
    mkdir -p "$backup_dir"
    
    # Fleet registry
    cp /opt/fleet-manager/nodes.json "$backup_dir/" 2>/dev/null || true
    
    # HAProxy configuration
    cp /etc/haproxy/haproxy.cfg "$backup_dir/" 2>/dev/null || true
    
    # Service configurations
    cp /etc/systemd/system/fleet-manager.service "$backup_dir/" 2>/dev/null || true
    cp /etc/systemd/system/haproxy-fleet-sync.service "$backup_dir/" 2>/dev/null || true
    
    # Network configurations
    cp /opt/tailscale-info.json "$backup_dir/" 2>/dev/null || true
    
    log_message "✅ Fleet configuration backed up to $backup_dir"
}

backup_node_data() {
    local node_ip=$1
    local node_name=$2
    
    log_message "💾 Backing up data from $node_name ($node_ip)..."
    
    local backup_dir="$BACKUP_BASE/nodes/$TIMESTAMP/$node_name"
    mkdir -p "$backup_dir"
    
    # Backup OpenClaw workspace
    rsync -av --compress --delete \
        -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new" \
        "$REMOTE_USER@$node_ip:/opt/openclaw/workspace/" \
        "$backup_dir/workspace/" 2>/dev/null || true
    
    # Backup configurations
    rsync -av --compress \
        -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new" \
        "$REMOTE_USER@$node_ip:/opt/openclaw/config/" \
        "$backup_dir/config/" 2>/dev/null || true
    
    # Backup logs (last 7 days only)
    ssh -i "$SSH_KEY" "$REMOTE_USER@$node_ip" \
        "find /var/log -name '*.log' -mtime -7 -exec tar -czf /tmp/logs-$node_name.tar.gz {} +" 2>/dev/null || true
    
    scp -i "$SSH_KEY" \
        "$REMOTE_USER@$node_ip":/tmp/logs-$node_name.tar.gz \
        "$backup_dir/" 2>/dev/null || true
    
    log_message "✅ Node data backed up for $node_name"
}

backup_all_nodes() {
    log_message "🌐 Starting full fleet backup..."
    
    # Backup fleet configuration
    backup_fleet_config
    
    # Get fleet nodes
    if [[ -f /opt/fleet-manager/nodes.json ]]; then
        local nodes=$(jq -r '.nodes[] | select(.status == "active") | .node_id + "," + .ip_address' /opt/fleet-manager/nodes.json)
        
        # Backup each node in parallel
        while IFS=',' read -r node_id ip_address; do
            backup_node_data "$ip_address" "$node_id" &
        done <<< "$nodes"
        
        # Wait for all backups to complete
        wait
    fi
    
    log_message "✅ Full fleet backup completed"
}

cleanup_old_backups() {
    log_message "🧹 Cleaning up old backups..."
    
    # Remove backups older than retention period
    find "$BACKUP_BASE" -type d -name "20*" -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
    
    log_message "✅ Old backups cleaned up"
}

create_recovery_snapshot() {
    log_message "📸 Creating recovery snapshot..."
    
    local snapshot_file="$BACKUP_BASE/recovery-snapshot-$TIMESTAMP.json"
    
    # Create comprehensive recovery information
    cat > "$snapshot_file" << SNAPSHOT
{
  "timestamp": "$TIMESTAMP",
  "fleet_config": $(cat /opt/fleet-manager/nodes.json 2>/dev/null || echo '{"nodes":[]}'),
  "system_info": {
    "hostname": "$(hostname)",
    "uptime": "$(uptime)",
    "disk_usage": $(df -h / | awk 'NR==2{print "{\\"used\\": \\""$5"\\", \\"available\\": \\""$4"\\"}"}'),
    "memory_usage": $(free -h | awk 'NR==2{print "{\\"total\\": \\""$2"\\", \\"used\\": \\""$3"\\", \\"free\\": \\""$7"\\"}"}')
  },
  "services_status": {
    "fleet_manager": "$(systemctl is-active fleet-manager 2>/dev/null || echo 'inactive')",
    "haproxy": "$(systemctl is-active haproxy 2>/dev/null || echo 'inactive')",
    "openclaw": "$(systemctl is-active openclaw 2>/dev/null || echo 'inactive')"
  },
  "network_info": {
    "tailscale_status": $(tailscale status --json 2>/dev/null || echo '{}'),
    "public_ip": "$(curl -s http://checkip.amazonaws.com 2>/dev/null || echo 'unknown')"
  }
}
SNAPSHOT
    
    log_message "✅ Recovery snapshot created: $snapshot_file"
}

# Main backup execution
case "${1:-full}" in
    "full")
        backup_all_nodes
        create_recovery_snapshot
        cleanup_old_backups
        ;;
    "config")
        backup_fleet_config
        ;;
    "snapshot")
        create_recovery_snapshot
        ;;
    "cleanup")
        cleanup_old_backups
        ;;
    *)
        echo "Usage: $0 {full|config|snapshot|cleanup}"
        exit 1
        ;;
esac
BACKUP_SCRIPT

chmod +x /opt/openclaw/backup-system.sh

# Setup automated backups via cron
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/openclaw/backup-system.sh full >> /var/log/backup.log 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "0 */6 * * * /opt/openclaw/backup-system.sh snapshot >> /var/log/backup.log 2>&1") | crontab -

echo "✅ Backup infrastructure setup complete"
BACKUP_SETUP

echo "✅ Backup infrastructure configured on primary node"
}

setup_node_monitoring() {
    echo "👁️ Setting up node monitoring and auto-recreation..."
    
    local primary_ip=$(jq -r '.primary_node.ip' "$FLEET_CONFIG")
    
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER"@"$primary_ip" << 'MONITORING_SETUP'
#!/bin/bash

# Create node monitoring service
cat > /opt/node-monitor.sh << 'MONITOR_SCRIPT'
#!/bin/bash

FLEET_CONFIG="/opt/fleet-manager/nodes.json"
CHECK_INTERVAL=60
FAILURE_THRESHOLD=3

log_message() {
    echo "$(date -Iseconds): $1" | tee -a "/var/log/node-monitor.log"
}

check_node_health() {
    local node_id=$1
    local node_ip=$2
    
    # SSH login user is image-dependent (root on Aleph base images).
    local ru="${REMOTE_USER:-root}"
    # Check SSH connectivity
    if ! ssh -i /root/.ssh/aleph_ed25519 \
            -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new \
            "$ru@$node_ip" "echo 'alive'" &>/dev/null; then
        return 1
    fi
    
    # Check OpenClaw service
    if ! ssh -i /root/.ssh/aleph_ed25519 \
            "$ru@$node_ip" "systemctl is-active openclaw" &>/dev/null; then
        return 2
    fi
    
    # Check HTTP response
    if ! curl -s --max-time 10 "http://$node_ip:3000/health" &>/dev/null; then
        return 3
    fi
    
    return 0
}

mark_node_unhealthy() {
    local node_id=$1
    local failure_reason=$2
    
    log_message "❌ Node $node_id marked as unhealthy: $failure_reason"
    
    # Update node status in fleet registry
    local tmpfile=$(mktemp)
    jq --arg node "$node_id" --arg status "unhealthy" \
        '.nodes = (.nodes | map(if .node_id == $node then .status = $status else . end))' \
        "$FLEET_CONFIG" > "$tmpfile"
    mv "$tmpfile" "$FLEET_CONFIG"
}

# Recreate a dead worker. REQUIREMENTS on the primary: the aleph-client CLI must be
# installed and a funded account configured (so `aleph instance create` can run
# unattended), plus the fleet SSH private key at /root/.ssh/aleph_ed25519 and the
# fleet API key in /etc/fleet-manager.env. Without these, recreation is skipped
# with a clear log line rather than silently "succeeding".
auto_recreate_node() {
    local node_id="$1"
    log_message "Auto-recreating failed node: $node_id"

    local node_config; node_config="$(jq -c --arg n "$node_id" '.nodes[] | select(.node_id==$n)' "$FLEET_CONFIG")"
    [[ -z "$node_config" || "$node_config" == "null" ]] && { log_message "No config for $node_id"; return 1; }

    command -v aleph >/dev/null || { log_message "aleph CLI not on primary — cannot recreate; alerting operator."; return 1; }
    [[ -f /root/.ssh/aleph_ed25519 ]] || { log_message "Fleet SSH key missing on primary — cannot provision replacement."; return 1; }
    : "${FLEET_API_KEY:?}"; : "${PRIMARY_TS_IP:?PRIMARY_TS_IP must be set in the unit env}"

    # 1. Delete the dead instance if we have its item-hash (frees PAYG billing / held tokens).
    local old_hash; old_hash="$(jq -r '.item_hash // empty' <<< "$node_config")"
    if [[ -n "$old_hash" ]]; then
        log_message "Deleting dead instance $old_hash"
        aleph instance delete "$old_hash" || log_message "WARN: delete failed (already gone?)"
    fi

    # 2. Create a like-for-like replacement (2 CU / 40 GiB worker).
    local out new_hash new_ip
    out="$(aleph instance create --name "$node_id" --compute-units 2 --rootfs-size 40960 \
            --ssh-pubkey-file /root/.ssh/aleph_ed25519.pub \
            --payment-type credit --payment-chain BASE 2>&1)"
    log_message "create: $out"
    new_hash="$(printf '%s\n' "$out" | grep -oE '[0-9a-f]{64}' | head -1)"

    # 3. Wait for an IP via the REAL `aleph instance list`.
    for _ in $(seq 1 30); do
        new_ip="$(aleph instance list --json | jq -r --arg n "$node_id" '.[] | select(.name==$n) | (.ipv4 // .ipv6 // empty)' | head -1)"
        [[ -n "$new_ip" ]] && break; sleep 10
    done
    [[ -z "$new_ip" ]] && { log_message "Replacement $node_id got no IP"; return 1; }

    # 4. Re-provision over SSH: install OpenClaw + Tailscale, re-register with the primary.
    #    ITEM_HASH carries the NEW instance hash so the registry stays able to
    #    delete/recreate this node on the next failure.
    ssh -i /root/.ssh/aleph_ed25519 -o StrictHostKeyChecking=accept-new "root@$new_ip" \
        "NODE_ID='$node_id' PRIMARY_TS_IP='$PRIMARY_TS_IP' FLEET_API_KEY='$FLEET_API_KEY' \
         TAILSCALE_AUTH_KEY='${TAILSCALE_AUTH_KEY:-}' ITEM_HASH='$new_hash' bash -s" <<'REPROV'
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl jq iproute2
curl -fsSL https://get.docker.com | sh
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs
curl -fsSL https://tailscale.com/install.sh | sh
[[ -n "${TAILSCALE_AUTH_KEY:-}" ]] && tailscale up --auth-key="$TAILSCALE_AUTH_KEY" --hostname="$NODE_ID"
curl -fsSL https://openclaw.ai/install.sh | bash
TS_IP="$(tailscale ip -4 2>/dev/null || hostname -I | awk '{print $1}')"
curl -fsS -X POST "http://$PRIMARY_TS_IP:8080/fleet/register" -H "x-api-key: $FLEET_API_KEY" \
  -H 'Content-Type: application/json' \
  -d "{\"node_id\":\"$NODE_ID\",\"ip_address\":\"$TS_IP\",\"item_hash\":\"${ITEM_HASH:-}\",\"capabilities\":[\"compute\",\"openclaw\"]}"
REPROV

    # 5. Update fleet state atomically: new hash/ip, status active, reset failures.
    local tmp; tmp="$(mktemp)"
    jq --arg n "$node_id" --arg h "$new_hash" --arg ip "$new_ip" \
       '.nodes = (.nodes | map(if .node_id==$n then (.item_hash=$h | .ip_address=$ip | .status="active" | .failure_count=0) else . end))' \
       "$FLEET_CONFIG" > "$tmp" && mv "$tmp" "$FLEET_CONFIG"
    log_message "Node $node_id recreated: $new_ip ($new_hash)"
}

monitor_fleet() {
    log_message "🔍 Starting fleet monitoring cycle..."
    
    if [[ ! -f "$FLEET_CONFIG" ]]; then
        log_message "⚠️ Fleet configuration not found"
        return 1
    fi
    
    local nodes=$(jq -r '.nodes[] | select(.status != "unhealthy") | .node_id + "," + .ip_address' "$FLEET_CONFIG")
    
    while IFS=',' read -r node_id ip_address; do
        [[ -z "$node_id" ]] && continue
        
        log_message "Checking health of $node_id ($ip_address)..."
        
        if ! check_node_health "$node_id" "$ip_address"; then
            local failure_count=$(jq -r --arg node "$node_id" '.nodes[] | select(.node_id == $node) | .failure_count // 0' "$FLEET_CONFIG")
            failure_count=$((failure_count + 1))
            
            # Update failure count
            local tmpfile=$(mktemp)
            jq --arg node "$node_id" --argjson count "$failure_count" \
                '.nodes = (.nodes | map(if .node_id == $node then .failure_count = $count else . end))' \
                "$FLEET_CONFIG" > "$tmpfile"
            mv "$tmpfile" "$FLEET_CONFIG"
            
            if (( failure_count >= FAILURE_THRESHOLD )); then
                mark_node_unhealthy "$node_id" "Health check failed $failure_count times"
                
                # Auto-recreate if enabled
                if [[ "$AUTO_RECREATE" == "true" ]]; then
                    auto_recreate_node "$node_id"
                fi
            else
                log_message "⚠️ Node $node_id health check failed ($failure_count/$FAILURE_THRESHOLD)"
            fi
        else
            # Reset failure count on successful check
            local tmpfile=$(mktemp)
            jq --arg node "$node_id" '.nodes = (.nodes | map(if .node_id == $node then .failure_count = 0 else . end))' \
                "$FLEET_CONFIG" > "$tmpfile"
            mv "$tmpfile" "$FLEET_CONFIG"
            
            log_message "✅ Node $node_id healthy"
        fi
    done <<< "$nodes"
}

# Continuous monitoring loop
while true; do
    monitor_fleet
    sleep $CHECK_INTERVAL
done
MONITOR_SCRIPT

chmod +x /opt/node-monitor.sh

# Create systemd service for monitoring. AUTO_RECREATE defaults to FALSE — it
# deletes+recreates paid instances and needs the aleph CLI, a funded account,
# TAILSCALE_AUTH_KEY, and PRIMARY_TS_IP. Turn it on deliberately once those are
# in /etc/fleet-manager.env. With it off, the monitor only marks nodes unhealthy
# and logs, so an operator can decide.
cat > /etc/systemd/system/node-monitor.service << 'MONITOR_SERVICE'
[Unit]
Description=Fleet Node Monitor
After=network.target fleet-manager.service

[Service]
Type=simple
User=root
EnvironmentFile=/etc/fleet-manager.env
ExecStart=/opt/node-monitor.sh
Restart=always
RestartSec=30
# Set AUTO_RECREATE=true in /etc/fleet-manager.env to enable destructive recreation.
Environment=AUTO_RECREATE=false

[Install]
WantedBy=multi-user.target
MONITOR_SERVICE

sudo systemctl daemon-reload
sudo systemctl enable node-monitor
sudo systemctl start node-monitor

echo "Node monitoring service configured (AUTO_RECREATE off by default)"
MONITORING_SETUP

echo "Node monitoring and auto-recreation configured"
}

create_disaster_recovery_runbook() {
    echo "📖 Creating disaster recovery runbook..."
    
    cat > ~/.aleph-deploy/DISASTER_RECOVERY_RUNBOOK.md << 'RUNBOOK'
# Disaster Recovery Runbook

## Emergency Response Procedures

### 1. Primary Node Failure

**Symptoms:**
- Fleet manager unreachable
- Load balancer not responding
- Cannot access fleet status API

**Recovery Steps:**
1. Check instance status: `aleph instance list` (find the primary by name; note its item-hash/IP).
2. If the instance is gone, recreate the primary and restore its state from your
   off-node backups (the backup target on a different CRN, or local pulls):
   ```bash
   cd ~/.aleph-deploy
   ./deploy-fleet.sh openclaw-fleet 1     # deploy a fresh primary
   # Restore /opt/fleet-manager and /opt/openclaw/config from the latest backup
   # under ~/.aleph-deploy/backups (or the backup node), e.g.:
   rsync -a ~/.aleph-deploy/backups/fleet/<latest>/  "$SSH_USER@<new_primary_ip>:/tmp/restore/"
   ```
3. Update DNS/routing to the new primary IP.
4. Workers re-register automatically once the fleet manager is back on the mesh.

### 2. Multiple Worker Node Failures

**Symptoms:**
- Reduced capacity
- Load balancer showing failed backends
- High response times

**Recovery Steps:**
1. Check fleet status: `./fleet-control.sh status` (uses the authenticated mgr helper).
2. Identify failed nodes.
3. If AUTO_RECREATE is enabled it triggers automatically; otherwise restore capacity:
   ```bash
   ./fleet-control.sh scale 5   # recreate workers up to the target (confirms deletes)
   ```
4. Monitor recovery progress.

### 3. Complete Fleet Failure

**Symptoms:**
- All nodes unreachable
- Complete service outage

**Recovery Steps:**
1. Confirm what still exists: `aleph instance list`.
2. Deploy a fresh primary, then workers:
   ```bash
   ./deploy-single-vm.sh openclaw-recovery-primary
   ./deploy-fleet.sh openclaw-recovery 5
   ```
3. Restore fleet/config/workspace from your latest off-node backup (see case 1).
4. Update external DNS/routing.

### 4. Data Loss Recovery

**Symptoms:**
- Missing user data
- Corrupted configurations
- Lost agent workspace state

**Recovery Steps:**
1. List available backups: `ls -la ~/.aleph-deploy/backups/  /opt/openclaw/backups/`
2. Verify a backup's integrity, then restore the needed components (rsync the relevant
   `nodes/<ts>/<node>/workspace` or `fleet/<ts>` directory back to the node).
3. If using the OpenClaw replication layer, re-run a verified replication:
   ```bash
   ssh "$SSH_USER@<primary_ts_ip>" '/opt/openclaw/replication/auto-provisioning-protocol.sh replicate'
   ```
4. Verify data integrity and restart affected services.

## Backup Verification

**Daily Checks:**
- [ ] Backup completion status: `tail /var/log/backup.log`
- [ ] Backup size consistency
- [ ] Recovery snapshot validity

**Weekly Checks:**
- [ ] Test restore procedure on staging
- [ ] Verify backup accessibility
- [ ] Check backup retention policy

## Contact Information

**Emergency Contacts:**
- Primary Admin: [Your contact info]
- Backup Admin: [Backup contact info]
- Aleph Cloud support / community: https://docs.aleph.cloud and the Aleph Cloud Telegram/Discord (see the docs site footer)

**Service URLs:**
- Fleet Manager (Tailscale only): http://<PRIMARY_TAILSCALE_IP>:8080
- Load Balancer (public): http://<PRIMARY_PUBLIC_IP>
- HAProxy stats (Tailscale only): http://<PRIMARY_TAILSCALE_IP>:9090/haproxy-stats

## Post-Incident Procedures

1. Document incident in `/opt/openclaw/incidents/`
2. Review and update recovery procedures
3. Test improvements on staging environment
4. Update team on lessons learned
RUNBOOK

echo "✅ Disaster recovery runbook created at ~/.aleph-deploy/DISASTER_RECOVERY_RUNBOOK.md"
}

# Execute all disaster recovery setup
setup_backup_infrastructure
setup_node_monitoring
create_disaster_recovery_runbook

echo "🛡️ Disaster Recovery System setup complete!"
echo ""
echo "Key Components:"
echo "- Automated daily backups at 2 AM"
echo "- Node health monitoring every 60 seconds"
echo "- Auto-recreation of failed nodes (configurable)"
echo "- Comprehensive recovery runbook"
echo ""
echo "View backup logs: ssh root@PRIMARY_IP tail -f /var/log/backup.log"
echo "View monitoring logs: ssh root@PRIMARY_IP tail -f /var/log/node-monitor.log"
```

---

## Cost Optimization Strategies

### Dynamic Resource Management

**Cost Optimization Framework:**
```bash
#!/bin/bash
# cost-optimization.sh

set -e

FLEET_CONFIG="$HOME/.aleph-deploy/configs/fleet.json"
SSH_KEY="${ALEPH_SSH_KEY:-$HOME/.aleph-deploy/keys/aleph_ed25519}"
SSH_USER="$(jq -r '.ssh_user // "root"' "$FLEET_CONFIG" 2>/dev/null || echo root)"

echo "💰 Setting up cost optimization strategies..."

analyze_costs() {
    echo "Analyzing current fleet costs from LIVE pricing..."
    local worker_count; worker_count="$(jq '.worker_nodes | length' "$FLEET_CONFIG")"

    # Pull real per-hour USD pricing from the CLI rather than hardcoding ALEPH/mo.
    # Tier 3 ~= the 4 CU primary; Tier 2 ~= the 2 CU workers (adjust to your tiers).
    local primary_hr worker_hr
    primary_hr="$(aleph pricing instance --tier 3 --payment-type credit --json 2>/dev/null \
        | jq -r '.price_per_hour // .usd_per_hour // empty' 2>/dev/null || true)"
    worker_hr="$(aleph pricing instance --tier 2 --payment-type credit --json 2>/dev/null \
        | jq -r '.price_per_hour // .usd_per_hour // empty' 2>/dev/null || true)"
    : "${primary_hr:=0.0132}"   # dated fallback (~Jun 2026); verify with `aleph pricing instance`
    : "${worker_hr:=0.0066}"

    local hours=730  # ~1 month
    local monthly; monthly="$(echo "($primary_hr + $worker_count * $worker_hr) * $hours" | bc -l)"

    cat > ~/.aleph-deploy/cost-analysis.json << COST_ANALYSIS
{
  "analysis_date": "$(date -Iseconds)",
  "pricing_source": "aleph pricing instance (USD/hour, PAYG)",
  "rates_usd_per_hour": { "primary": $primary_hr, "worker": $worker_hr },
  "node_breakdown": [
    { "type": "primary", "count": 1, "usd_per_hour": $primary_hr, "specs": "4 vCPU / 8 GiB / 80 GiB" },
    { "type": "worker",  "count": $worker_count, "usd_per_hour": $worker_hr, "specs": "2 vCPU / 4 GiB / 40 GiB" }
  ],
  "estimated_total_monthly_usd": $(printf '%.2f' "$monthly")
}
COST_ANALYSIS

    printf 'Estimated monthly cost: $%.2f USD (1 primary + %s workers, PAYG)\n' "$monthly" "$worker_count"
    echo "Source rates from 'aleph pricing instance'. Saved to cost-analysis.json."
    echo "NOTE: 'hold' payment locks ALEPH instead of streaming USD — see the pricing note at the top."
}

setup_cost_tiers() {
    echo "Setting up cost optimization tiers..."

    # estimated_monthly_usd uses the dated Jun-2026 PAYG example rates
    # (primary ~$10/mo, worker ~$5/mo). These are ESTIMATES — confirm with
    # `aleph pricing instance`. They are NOT ALEPH-token amounts.
    cat > ~/.aleph-deploy/cost-tiers.json << 'COST_TIERS'
{
  "_note": "estimated_monthly_usd are dated (~Jun 2026) PAYG examples; verify with 'aleph pricing instance'.",
  "tiers": {
    "minimal": {
      "description": "Single node for development/testing",
      "nodes": {
        "primary": 1,
        "workers": 0
      },
      "estimated_monthly_usd": 10,
      "use_cases": ["Development", "Testing", "Personal projects"]
    },
    "balanced": {
      "description": "Cost-effective production setup",
      "nodes": {
        "primary": 1,
        "workers": 2
      },
      "estimated_monthly_usd": 20,
      "use_cases": ["Small production", "Side projects", "Limited budget"]
    },
    "standard": {
      "description": "Recommended production configuration",
      "nodes": {
        "primary": 1,
        "workers": 4
      },
      "estimated_monthly_usd": 30,
      "use_cases": ["Production workloads", "Medium traffic", "Business use"]
    },
    "high_availability": {
      "description": "Enterprise-grade reliability",
      "nodes": {
        "primary": 1,
        "workers": 6,
        "backup": 1
      },
      "estimated_monthly_usd": 45,
      "use_cases": ["Critical applications", "High traffic", "Enterprise"]
    }
  },
  "optimization_strategies": {
    "spot_instances": {
      "description": "Use lower-cost CRNs for worker nodes",
      "savings_potential": "15-30%",
      "risk_level": "medium"
    },
    "auto_scaling": {
      "description": "Scale workers based on demand",
      "savings_potential": "20-40%",
      "risk_level": "low"
    },
    "mixed_crn": {
      "description": "Distribute across different CRN pricing",
      "savings_potential": "10-25%",
      "risk_level": "low"
    },
    "scheduled_scaling": {
      "description": "Reduce capacity during off-hours",
      "savings_potential": "25-50%",
      "risk_level": "low"
    }
  }
}
COST_TIERS

    echo "✅ Cost tiers configuration created"
}

setup_auto_scaling() {
    echo "📈 Setting up auto-scaling for cost optimization..."
    
    local primary_ip=$(jq -r '.primary_node.ip' "$FLEET_CONFIG")
    
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER"@"$primary_ip" << 'AUTOSCALE_SETUP'
#!/bin/bash

# Create auto-scaling service
cat > /opt/auto-scaler.sh << 'AUTOSCALER'
#!/bin/bash

FLEET_CONFIG="/opt/fleet-manager/nodes.json"
MIN_WORKERS=2
MAX_WORKERS=8
CPU_THRESHOLD_UP=75
CPU_THRESHOLD_DOWN=25
SCALE_COOLDOWN=300  # 5 minutes

log_message() {
    echo "$(date -Iseconds): $1" | tee -a "/var/log/auto-scaler.log"
}

get_average_cpu_usage() {
    local total_cpu=0
    local node_count=0

    # Use process substitution (< <(...)) instead of pipe (|).
    # A pipe runs `while` in a subshell, so variable updates to
    # total_cpu and node_count are lost when the subshell exits.
    while read -r ip; do
        local cpu_usage=$(ssh -i /root/.ssh/aleph_ed25519 \
                             -o ConnectTimeout=5 "${REMOTE_USER:-root}@$ip" \
                             "top -bn1 | grep 'Cpu(s)' | awk '{print \$2}' | cut -d'%' -f1" 2>/dev/null || echo "0")

        if [[ "$cpu_usage" =~ ^[0-9.]+$ ]]; then
            total_cpu=$(echo "$total_cpu + $cpu_usage" | bc -l)
            node_count=$((node_count + 1))
        fi
    done < <(jq -r '.nodes[] | select(.status == "active" and .node_id != "primary") | .ip_address' "$FLEET_CONFIG")

    if (( node_count > 0 )); then
        echo "scale=2; $total_cpu / $node_count" | bc -l
    else
        echo "0"
    fi
}

# Real scale-up: create + provision a new worker via the aleph CLI, then let it
# register. Requires the aleph CLI + funded account + key + env on the primary.
scale_up() {
    local current_workers; current_workers="$(jq '[.nodes[] | select(.status=="active" and .node_id!="primary")] | length' "$FLEET_CONFIG")"
    (( current_workers >= MAX_WORKERS )) && { log_message "At MAX_WORKERS ($MAX_WORKERS)"; return 1; }
    command -v aleph >/dev/null || { log_message "aleph CLI absent on primary — cannot scale up."; return 1; }
    : "${FLEET_API_KEY:?}"; : "${PRIMARY_TS_IP:?}"

    local name="auto-worker-$(date +%s)" out hash ip
    log_message "Scaling up: creating $name"
    out="$(aleph instance create --name "$name" --compute-units 2 --rootfs-size 40960 \
            --ssh-pubkey-file /root/.ssh/aleph_ed25519.pub --payment-type credit --payment-chain BASE 2>&1)"
    hash="$(printf '%s\n' "$out" | grep -oE '[0-9a-f]{64}' | head -1)"
    for _ in $(seq 1 30); do
        ip="$(aleph instance list --json | jq -r --arg n "$name" '.[]|select(.name==$n)|(.ipv4//.ipv6//empty)' | head -1)"
        [[ -n "$ip" ]] && break; sleep 10
    done
    [[ -z "$ip" ]] && { log_message "Scale-up: $name got no IP"; return 1; }
    # ITEM_HASH is passed through so the registry records this instance's hash;
    # scale_down() reads .item_hash to delete the right instance.
    ssh -i /root/.ssh/aleph_ed25519 -o StrictHostKeyChecking=accept-new "root@$ip" \
        "NODE_ID='$name' PRIMARY_TS_IP='$PRIMARY_TS_IP' FLEET_API_KEY='$FLEET_API_KEY' TAILSCALE_AUTH_KEY='${TAILSCALE_AUTH_KEY:-}' ITEM_HASH='$hash' bash -s" <<'REPROV'
set -euo pipefail; export DEBIAN_FRONTEND=noninteractive
apt-get update && apt-get install -y curl jq iproute2
curl -fsSL https://get.docker.com | sh
curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && apt-get install -y nodejs
curl -fsSL https://tailscale.com/install.sh | sh
[[ -n "${TAILSCALE_AUTH_KEY:-}" ]] && tailscale up --auth-key="$TAILSCALE_AUTH_KEY" --hostname="$NODE_ID"
curl -fsSL https://openclaw.ai/install.sh | bash
TS_IP="$(tailscale ip -4 2>/dev/null || hostname -I | awk '{print $1}')"
curl -fsS -X POST "http://$PRIMARY_TS_IP:8080/fleet/register" -H "x-api-key: $FLEET_API_KEY" \
  -H 'Content-Type: application/json' -d "{\"node_id\":\"$NODE_ID\",\"ip_address\":\"$TS_IP\",\"item_hash\":\"${ITEM_HASH:-}\",\"capabilities\":[\"compute\",\"openclaw\"]}"
REPROV
    log_message "Scale-up complete: $name ($ip). haproxy-fleet-sync will add it within 60s."
    echo "$(date +%s)" > /tmp/last-scale-action
}

# Real scale-down: drain in HAProxy, deregister, then DELETE the Aleph instance.
scale_down() {
    local current_workers; current_workers="$(jq '[.nodes[]|select(.status=="active" and .node_id!="primary")]|length' "$FLEET_CONFIG")"
    (( current_workers <= MIN_WORKERS )) && { log_message "At MIN_WORKERS ($MIN_WORKERS)"; return 1; }
    command -v aleph >/dev/null || { log_message "aleph CLI absent on primary — cannot scale down."; return 1; }

    local victim; victim="$(jq -r '[.nodes[]|select(.status=="active" and .node_id!="primary")]|sort_by(.cpu_usage // 0)|first|.node_id' "$FLEET_CONFIG")"
    [[ -z "$victim" || "$victim" == "null" ]] && return 0
    local hash; hash="$(jq -r --arg n "$victim" '.nodes[]|select(.node_id==$n)|.item_hash // empty' "$FLEET_CONFIG")"
    log_message "Scaling down: draining $victim"
    # 1. Mark draining; 2. remove from HAProxy; 3. delete instance; 4. drop from state.
    local tmpfile; tmpfile="$(mktemp)"
    jq --arg n "$victim" '.nodes = (.nodes | map(if .node_id==$n then .status="draining" else . end))' "$FLEET_CONFIG" > "$tmpfile" && mv "$tmpfile" "$FLEET_CONFIG"
    /opt/manage-haproxy-backends.sh remove "$victim" 2>/dev/null || true
    sleep 10   # let in-flight requests finish
    if [[ -n "$hash" ]]; then
        aleph instance delete "$hash" && log_message "Deleted instance $hash ($victim)"
    fi
    tmpfile="$(mktemp)"
    jq --arg n "$victim" '.nodes |= map(select(.node_id != $n))' "$FLEET_CONFIG" > "$tmpfile" && mv "$tmpfile" "$FLEET_CONFIG"
    log_message "Scale-down complete: removed $victim"
    echo "$(date +%s)" > /tmp/last-scale-action
}

check_scaling_needed() {
    log_message "🔍 Checking if scaling is needed..."
    
    # Check cooldown period
    if [[ -f /tmp/last-scale-action ]]; then
        local last_action=$(cat /tmp/last-scale-action)
        local current_time=$(date +%s)
        local time_diff=$((current_time - last_action))
        
        if (( time_diff < SCALE_COOLDOWN )); then
            log_message "⏳ Still in cooldown period ($((SCALE_COOLDOWN - time_diff))s remaining)"
            return 0
        fi
    fi
    
    local avg_cpu=$(get_average_cpu_usage)
    log_message "📊 Current average CPU usage: $avg_cpu%"
    
    if (( $(echo "$avg_cpu > $CPU_THRESHOLD_UP" | bc -l) )); then
        log_message "🔺 CPU usage above threshold ($CPU_THRESHOLD_UP%), scaling up..."
        scale_up
    elif (( $(echo "$avg_cpu < $CPU_THRESHOLD_DOWN" | bc -l) )); then
        log_message "🔻 CPU usage below threshold ($CPU_THRESHOLD_DOWN%), scaling down..."
        scale_down
    else
        log_message "✅ CPU usage within acceptable range"
    fi
}

# Dispatcher: `daemon` runs the loop (used by systemd); the others let the
# scheduled-scaler (and operators) invoke a single action.
case "${1:-daemon}" in
    daemon)     while true; do check_scaling_needed; sleep 60; done ;;
    once)       check_scaling_needed ;;
    scale-up)   scale_up ;;
    scale-down) scale_down ;;
    *) echo "Usage: $0 {daemon|once|scale-up|scale-down}"; exit 1 ;;
esac
AUTOSCALER

chmod +x /opt/auto-scaler.sh

# Create systemd service (disabled by default)
cat > /etc/systemd/system/auto-scaler.service << 'SCALER_SERVICE'
[Unit]
Description=Fleet Auto Scaler
After=network.target fleet-manager.service

[Service]
Type=simple
User=root
EnvironmentFile=/etc/fleet-manager.env
ExecStart=/opt/auto-scaler.sh
Restart=always
RestartSec=30
Environment=AUTO_SCALING_ENABLED=false

[Install]
WantedBy=multi-user.target
SCALER_SERVICE

# Disabled by default. Auto-scaling CREATES and DELETES paid instances, so enable
# it only after confirming the aleph CLI, a funded account, the fleet SSH key, and
# FLEET_API_KEY/PRIMARY_TS_IP/TAILSCALE_AUTH_KEY are present in /etc/fleet-manager.env.
echo "Auto-scaler configured (disabled by default)"
echo "To enable: systemctl enable --now auto-scaler"
AUTOSCALE_SETUP

echo "✅ Auto-scaling configured on primary node"
}

setup_scheduled_scaling() {
    echo "⏰ Setting up scheduled scaling for off-hours cost savings..."
    
    local primary_ip=$(jq -r '.primary_node.ip' "$FLEET_CONFIG")
    
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER"@"$primary_ip" << 'SCHEDULED_SETUP'
#!/bin/bash

# Create scheduled scaling script
cat > /opt/scheduled-scaler.sh << 'SCHEDULER'
#!/bin/bash
set -euo pipefail

# cron has a bare environment — load the shared key/host so the delegated
# auto-scaler actions (which call the aleph CLI over the mesh) have what they need.
[[ -f /etc/fleet-manager.env ]] && { set -a; . /etc/fleet-manager.env; set +a; }

FLEET_CONFIG="/opt/fleet-manager/nodes.json"

log_message() {
    echo "$(date -Iseconds): $1" | tee -a "/var/log/scheduled-scaler.log"
}

# Drive worker count to a target by invoking the auto-scaler's single-step actions
# (which perform real aleph create/delete). One step per loop, with a short pause.
scale_to_count() {
    local target_count="$1" reason="$2"
    log_message "Scaling to $target_count workers: $reason"
    local current_count; current_count="$(jq '[.nodes[]|select(.status=="active" and .node_id!="primary")]|length' "$FLEET_CONFIG")"

    if (( target_count == current_count )); then
        log_message "Already at target capacity ($target_count)"; return 0
    fi
    if (( target_count > current_count )); then
        local n=$((target_count - current_count))
        log_message "Adding $n worker(s) via auto-scaler"
        for ((i=0; i<n; i++)); do /opt/auto-scaler.sh scale-up || break; sleep 15; done
    else
        local n=$((current_count - target_count))
        log_message "Removing $n worker(s) via auto-scaler"
        for ((i=0; i<n; i++)); do /opt/auto-scaler.sh scale-down || break; sleep 5; done
    fi
}

# Scaling schedules based on time
current_hour=$(date +%H)
current_day=$(date +%u)  # 1=Monday, 7=Sunday

# Business hours scaling (9 AM - 6 PM weekdays)
if (( current_day <= 5 && current_hour >= 9 && current_hour <= 18 )); then
    scale_to_count 4 "Business hours scaling"
# Evening hours (6 PM - 11 PM)
elif (( current_day <= 5 && current_hour >= 19 && current_hour <= 23 )); then
    scale_to_count 2 "Evening hours scaling"
# Night/weekend minimal capacity
else
    scale_to_count 1 "Off-hours minimal scaling"
fi
SCHEDULER

chmod +x /opt/scheduled-scaler.sh

# Setup cron jobs for scheduled scaling
(crontab -l 2>/dev/null; echo "0 9 * * 1-5 /opt/scheduled-scaler.sh >> /var/log/scheduled-scaler.log 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "0 18 * * 1-5 /opt/scheduled-scaler.sh >> /var/log/scheduled-scaler.log 2>&1") | crontab -
(crontab -l 2>/dev/null; echo "0 23 * * * /opt/scheduled-scaler.sh >> /var/log/scheduled-scaler.log 2>&1") | crontab -

echo "✅ Scheduled scaling configured"
echo "Schedules:"
echo "- Business hours (9 AM): Scale to 4 workers"
echo "- Evening hours (6 PM): Scale to 2 workers"  
echo "- Night/weekends (11 PM): Scale to 1 worker"
SCHEDULED_SETUP

echo "✅ Scheduled scaling configured"
}

create_cost_monitoring() {
    echo "📈 Setting up cost monitoring dashboard..."
    
    cat > ~/.aleph-deploy/scripts/cost-monitor.sh << 'COST_MONITOR'
#!/bin/bash
# cost-monitor.sh — fleet cost report from LIVE `aleph pricing` (USD, PAYG).
# Run from a machine on the tailnet (queries the fleet manager over Tailscale).
set -euo pipefail

FLEET_CONFIG="$HOME/.aleph-deploy/configs/fleet.json"
SSH_KEY="${ALEPH_SSH_KEY:-$HOME/.aleph-deploy/keys/aleph_ed25519}"
SSH_USER="$(jq -r '.ssh_user // "root"' "$FLEET_CONFIG" 2>/dev/null || echo root)"
: "${FLEET_API_KEY:?Set FLEET_API_KEY (see fleet.env)}"
MGR_HOST="$(jq -r '.primary_node.tailscale_ip // .primary_node.ip' "$FLEET_CONFIG")"
mkdir -p ~/.aleph-deploy/reports

# Live USD/hour rates (tier 3 ~ primary, tier 2 ~ worker). Dated fallbacks if the
# CLI is unavailable; ALWAYS verify with `aleph pricing instance`.
rate() { aleph pricing instance --tier "$1" --payment-type credit --json 2>/dev/null \
    | jq -r '.price_per_hour // .usd_per_hour // empty' 2>/dev/null || true; }

generate_cost_report() {
    local report_date; report_date="$(date +%Y-%m-%d)"
    local fleet_status active_workers
    fleet_status="$(curl -fsS -H "x-api-key: $FLEET_API_KEY" "http://$MGR_HOST:8080/fleet/status" 2>/dev/null || echo '{"nodes":[]}')"
    active_workers="$(echo "$fleet_status" | jq '[.nodes[]|select(.status=="active" and .node_id!="primary")]|length')"

    local p_hr w_hr; p_hr="$(rate 3)"; w_hr="$(rate 2)"
    : "${p_hr:=0.0132}"; : "${w_hr:=0.0066}"     # ~Jun 2026 fallback — verify!
    local monthly daily
    monthly="$(echo "($p_hr + $active_workers * $w_hr) * 730" | bc -l)"
    daily="$(echo "$monthly / 30" | bc -l)"

    cat > ~/.aleph-deploy/reports/cost-report-$report_date.json << REPORT
{
  "report_date": "$report_date",
  "pricing_source": "aleph pricing instance (USD/hour, PAYG)",
  "rates_usd_per_hour": { "primary": $p_hr, "worker": $w_hr },
  "fleet": { "primary_nodes": 1, "worker_nodes": $active_workers, "total_nodes": $((active_workers + 1)) },
  "estimated_monthly_usd": $(printf '%.2f' "$monthly"),
  "estimated_daily_usd": $(printf '%.2f' "$daily"),
  "recommendations": ["Enable scheduled scaling for off-hours", "Right-size worker count to real load"]
}
REPORT

    echo "COST SUMMARY ($report_date)"
    echo "Active nodes: $((active_workers + 1)) (1 primary + $active_workers workers)"
    printf 'Estimated monthly: $%.2f USD   daily: $%.2f USD (PAYG)\n' "$monthly" "$daily"
    echo "Rates from 'aleph pricing instance'. Report: ~/.aleph-deploy/reports/cost-report-$report_date.json"
}

generate_cost_report
(crontab -l 2>/dev/null; echo "0 8 * * * $HOME/.aleph-deploy/scripts/cost-monitor.sh >> /var/log/cost-monitor.log 2>&1") | crontab -
COST_MONITOR

chmod +x ~/.aleph-deploy/scripts/cost-monitor.sh
    
echo "✅ Cost monitoring configured"
}

# Execute cost optimization setup
analyze_costs
setup_cost_tiers  
setup_auto_scaling
setup_scheduled_scaling
create_cost_monitoring

echo "💰 Cost optimization setup complete!"
echo ""
echo "Available cost optimization features:"
echo "- Auto-scaling based on CPU usage (disabled by default)"
echo "- Scheduled scaling for off-hours savings"
echo "- Daily cost reporting and monitoring"
echo "- Multiple deployment tiers (minimal to high-availability)"
echo ""
echo "Enable auto-scaling: ssh root@PRIMARY_IP 'sudo systemctl enable auto-scaler && sudo systemctl start auto-scaler'"
echo "View cost reports: ls ~/.aleph-deploy/reports/"
echo "Monitor costs: ~/.aleph-deploy/scripts/cost-monitor.sh"
```

---

## Security Hardening Framework

### Comprehensive Security Configuration

**Security Hardening Script:**
```bash
#!/bin/bash
# security-hardening.sh

set -e

FLEET_CONFIG="$HOME/.aleph-deploy/configs/fleet.json"
SSH_KEY="${ALEPH_SSH_KEY:-$HOME/.aleph-deploy/keys/aleph_ed25519}"
SSH_USER="$(jq -r '.ssh_user // "root"' "$FLEET_CONFIG" 2>/dev/null || echo root)"

echo "🔒 Implementing comprehensive security hardening..."

setup_firewall_rules() {
    local node_ip=$1
    local node_type=$2
    local ssh_user="${SSH_USER:-$(jq -r '.ssh_user // "root"' "$FLEET_CONFIG")}"
    local ssh_key="${ALEPH_SSH_KEY:-$HOME/.aleph-deploy/keys/aleph_ed25519}"

    echo "Configuring UFW firewall on $node_type ($node_ip)..."

    # Unquoted heredoc so $node_type expands HERE (operator side) into the remote
    # script. Tailscale's CGNAT range is 100.64.0.0/10; the mesh interface is
    # tailscale0. The OpenClaw agent runtime port is NEVER opened to the internet.
    ssh -i "$ssh_key" -o StrictHostKeyChecking=accept-new "$ssh_user@$node_ip" << FIREWALL_SETUP
#!/bin/bash
set -euo pipefail

echo "Configuring UFW firewall rules..."
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw limit ssh   # rate-limit SSH brute force

# Allow all traffic on the Tailscale mesh interface (private, authenticated mesh).
sudo ufw allow in on tailscale0
sudo ufw allow 41641/udp   # Tailscale direct connections

if [[ "$node_type" == "primary" ]]; then
    # Public edge: only the load balancer's HTTP/HTTPS.
    sudo ufw allow 80
    sudo ufw allow 443
    # Fleet Manager (8080), Load Distributor (8081), HAProxy stats (9090) bind to
    # the Tailscale IP and are reachable ONLY over the mesh (allowed above by the
    # 'in on tailscale0' rule). Do NOT open them publicly.
    echo "Primary node firewall rules applied"
else
    # Worker: NO public OpenClaw port. The agent runtime (3000) is reachable ONLY
    # over Tailscale (handled by 'allow in on tailscale0'); HAProxy on the primary
    # also reaches workers over the mesh. Public 3000 on an agent that can execute
    # actions is a critical exposure — never do it.
    echo "Worker node firewall rules applied (OpenClaw private to mesh)"
fi

# Security hardening rules
sudo ufw deny 23    # Telnet
sudo ufw deny 135   # RPC
sudo ufw deny 139   # NetBIOS
sudo ufw deny 445   # SMB

# Enable firewall
sudo ufw --force enable

# Display status
sudo ufw status verbose

echo "🛡️ Firewall configuration complete"
FIREWALL_SETUP
    
    echo "✅ Firewall configured on $node_type node"
}

setup_ssh_hardening() {
    local node_ip=$1
    
    echo "🔑 Hardening SSH configuration on $node_ip..."
    
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER"@"$node_ip" << 'SSH_HARDENING'
#!/bin/bash
set -e

echo "🔧 Hardening SSH configuration..."

# Backup original SSH config
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Create hardened SSH configuration
sudo tee /etc/ssh/sshd_config << 'SSHD_CONFIG'
# SSH Hardened Configuration for Aleph Cloud Fleet

# Basic settings
Port 22
Protocol 2
HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ecdsa_key
HostKey /etc/ssh/ssh_host_ed25519_key

# Authentication
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes

# Security restrictions. NOTE: PermitRootLogin is set dynamically below based on
# the actual login user — on Aleph base images the only user is root, so we use
# `prohibit-password` (key-only root) there rather than `no`, which would lock you out.
MaxAuthTries 3
MaxSessions 2
MaxStartups 2:30:10
LoginGraceTime 30

# Disable dangerous features by default
X11Forwarding no
AllowTcpForwarding no
GatewayPorts no
PermitTunnel no
AllowAgentForwarding no

# Network settings
AddressFamily inet
ListenAddress 0.0.0.0
TCPKeepAlive yes
ClientAliveInterval 300
ClientAliveCountMax 2

# Logging
SyslogFacility AUTH
LogLevel VERBOSE

# Miscellaneous
PrintMotd no
PrintLastLog yes
Compression no
UseDNS no

# Subsystem
Subsystem sftp /usr/lib/openssh/sftp-server -l INFO
SSHD_CONFIG

# Restrict logins and re-enable TCP forwarding for OUR login user only (the user
# is image-dependent — root on Aleph base images, ubuntu on some — so derive it
# at runtime rather than hardcoding "ubuntu". TCP forwarding is needed for SSH
# tunnels (Section 5) and is harmless for Tailscale, which doesn't use sshd.)
LOGIN_USER="$(logname 2>/dev/null || echo "${SUDO_USER:-$USER}")"
if [[ "$LOGIN_USER" == "root" ]]; then ROOT_POLICY="prohibit-password"; else ROOT_POLICY="no"; fi
{
  echo ""
  echo "PermitRootLogin ${ROOT_POLICY}"
  echo "AllowUsers ${LOGIN_USER}"
  echo "Match User ${LOGIN_USER}"
  echo "    AllowTcpForwarding yes"
} | sudo tee -a /etc/ssh/sshd_config >/dev/null

# Validate BEFORE reloading; if invalid, restore the backup so we keep access.
if sudo sshd -t; then
    sudo systemctl reload ssh
    echo "SSH hardening complete (login user: ${LOGIN_USER})"
else
    echo "sshd config invalid — restoring backup, NOT reloading."
    sudo cp /etc/ssh/sshd_config.backup /etc/ssh/sshd_config
    exit 1
fi
SSH_HARDENING
    
    echo "SSH hardened on node: $node_ip"
}

setup_key_rotation() {
    echo "Installing SSH key rotation tool..."

    # ── scripts/rotate-ssh-keys.sh ───────────────────────────────────────────
    # Correct, verify-before-activate rotation. Key invariants:
    #  - generates an ed25519 key into aleph_ed25519-new (matches the key TYPE);
    #  - tests the NEW key against EVERY node BEFORE activating it (rollback-safe);
    #  - the OLD key stays authorized until the new key is proven, so you can never
    #    lock yourself out; cleanup removes the old key by EXACT LINE (grep -Fvx).
    cat > ~/.aleph-deploy/scripts/rotate-ssh-keys.sh << 'KEY_ROTATION'
#!/bin/bash
set -euo pipefail

FLEET_CONFIG="$HOME/.aleph-deploy/configs/fleet.json"
SSH_KEY="${ALEPH_SSH_KEY:-$HOME/.aleph-deploy/keys/aleph_ed25519}"
SSH_USER="$(jq -r '.ssh_user // "root"' "$FLEET_CONFIG" 2>/dev/null || echo root)"
KEY_DIR="$HOME/.aleph-deploy/keys"
BACKUP_DIR="$HOME/.aleph-deploy/key-backups"
mkdir -p "$BACKUP_DIR" "$HOME/.aleph-deploy/logs"

log() { echo "$(date -Iseconds): $1" | tee -a "$HOME/.aleph-deploy/logs/key-rotation.log"; }

# All node IPs (primary + every worker). Workers without an IP are skipped with a warning.
all_node_ips() {
    jq -r '[.primary_node.ip] + [.worker_nodes[].ip] | .[] | select(. != null and . != "")' "$FLEET_CONFIG"
}

generate_new_keys() {
    local d; d="$(date +%Y%m%d-%H%M%S)"
    log "Backing up current key and generating a new ed25519 pair..."
    [[ -f "$KEY_DIR/aleph_ed25519" ]] && {
        cp "$KEY_DIR/aleph_ed25519"     "$BACKUP_DIR/aleph_ed25519-$d"
        cp "$KEY_DIR/aleph_ed25519.pub" "$BACKUP_DIR/aleph_ed25519.pub-$d"
    }
    # ed25519 (not RSA) — matches the active key type and the file name.
    ssh-keygen -t ed25519 -f "$KEY_DIR/aleph_ed25519-new" -N "" -C "aleph-fleet-$d"
}

deploy_new_keys() {
    log "Appending NEW public key to authorized_keys on all nodes (old key stays valid)..."
    local newpub; newpub="$(cat "$KEY_DIR/aleph_ed25519-new.pub")"
    while read -r ip; do
        log "  -> $ip"
        # Still authenticate with the CURRENT (old) key; just append the new one.
        ssh -i "$KEY_DIR/aleph_ed25519" -o StrictHostKeyChecking=accept-new "$SSH_USER@$ip" \
            "mkdir -p ~/.ssh && touch ~/.ssh/authorized_keys && \
             grep -qxF '$newpub' ~/.ssh/authorized_keys || echo '$newpub' >> ~/.ssh/authorized_keys && \
             chmod 600 ~/.ssh/authorized_keys"
    done < <(all_node_ips)
}

# Verify the NEW key works against EVERY node BEFORE we activate it.
test_new_keys() {
    log "Verifying NEW key connectivity on all nodes..."
    local ok=0 fail=0
    while read -r ip; do
        if ssh -i "$KEY_DIR/aleph_ed25519-new" -o ConnectTimeout=10 \
               -o StrictHostKeyChecking=accept-new "$SSH_USER@$ip" "true" &>/dev/null; then
            ok=$((ok+1))
        else
            log "  FAILED on $ip"; fail=$((fail+1))
        fi
    done < <(all_node_ips)
    log "New-key check: $ok ok, $fail failed"
    (( fail == 0 ))
}

activate_new_keys() {
    log "Promoting NEW key to active (old key archived for rollback)..."
    mv "$KEY_DIR/aleph_ed25519"     "$KEY_DIR/aleph_ed25519-old"
    mv "$KEY_DIR/aleph_ed25519.pub" "$KEY_DIR/aleph_ed25519.pub-old"
    mv "$KEY_DIR/aleph_ed25519-new"     "$KEY_DIR/aleph_ed25519"
    mv "$KEY_DIR/aleph_ed25519-new.pub" "$KEY_DIR/aleph_ed25519.pub"
    chmod 600 "$KEY_DIR/aleph_ed25519"; chmod 644 "$KEY_DIR/aleph_ed25519.pub"
}

cleanup_old_keys() {
    local oldpub; oldpub="$(cat "$KEY_DIR/aleph_ed25519.pub-old" 2>/dev/null || true)"
    [[ -z "$oldpub" ]] && return 0
    log "Removing OLD key from all nodes (exact-line match)..."
    while read -r ip; do
        # grep -Fvx: fixed-string, whole-LINE, inverted — removes ONLY the exact old
        # key line, never a substring or an unrelated key. Connect with the new key.
        ssh -i "$KEY_DIR/aleph_ed25519" "$SSH_USER@$ip" \
            "grep -Fvx '$oldpub' ~/.ssh/authorized_keys > ~/.ssh/ak.tmp && \
             mv ~/.ssh/ak.tmp ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys" \
            || log "  WARN: could not clean $ip (left old key in place)"
    done < <(all_node_ips)
    rm -f "$KEY_DIR/aleph_ed25519-old" "$KEY_DIR/aleph_ed25519.pub-old"
}

rotate_keys() {
    log "Starting SSH key rotation..."
    generate_new_keys
    deploy_new_keys
    sleep 5
    if test_new_keys; then          # MUST pass on every node before we switch over
        activate_new_keys
        cleanup_old_keys            # old key only removed AFTER new key is active+proven
        log "SSH key rotation completed successfully."
    else
        log "New key failed on at least one node — NOT activating. Old key still works."
        rm -f "$KEY_DIR/aleph_ed25519-new" "$KEY_DIR/aleph_ed25519-new.pub"
        return 1
    fi
}

case "${1:-rotate}" in
    rotate) rotate_keys ;;
    test)   test_new_keys ;;
    *)      echo "Usage: $0 {rotate|test}"; exit 1 ;;
esac
KEY_ROTATION

    chmod +x ~/.aleph-deploy/scripts/rotate-ssh-keys.sh

    # Rotate ON DEMAND, not on a forced monthly schedule. Automatic forced rotation
    # of SSH keys provides little security benefit and risks lock-out if a node is
    # unreachable when the cron fires. Rotate when a key may be compromised or when
    # an operator leaves. To opt into scheduled rotation, uncomment:
    # (crontab -l 2>/dev/null; echo "0 3 1 * * $HOME/.aleph-deploy/scripts/rotate-ssh-keys.sh rotate >> $HOME/.aleph-deploy/logs/key-rotation.log 2>&1") | crontab -
    echo "SSH key rotation tool installed: ~/.aleph-deploy/scripts/rotate-ssh-keys.sh rotate"
}

setup_intrusion_detection() {
    echo "👁️ Setting up intrusion detection system..."
    
    local primary_ip=$(jq -r '.primary_node.ip' "$FLEET_CONFIG")
    
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER"@"$primary_ip" << 'IDS_SETUP'
#!/bin/bash
set -e

echo "🔍 Installing and configuring intrusion detection..."

# Install fail2ban
sudo apt-get update
sudo apt-get install -y fail2ban

# Create custom jail configuration
sudo tee /etc/fail2ban/jail.local << 'JAIL_CONFIG'
[DEFAULT]
# Ban time: 1 hour
bantime = 3600
# Find time: 10 minutes
findtime = 600
# Max retry: 3 attempts
maxretry = 3
# Ignore local IPs
ignoreip = 127.0.0.1/8 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

[sshd-ddos]
enabled = true
port = ssh
filter = sshd-ddos
logpath = /var/log/auth.log
maxretry = 2
bantime = 3600

# OpenClaw service protection
[openclaw]
enabled = true
port = 3000
filter = openclaw
logpath = /var/log/openclaw/access.log
maxretry = 10
bantime = 1800

# Fleet manager protection
[fleet-manager]
enabled = true
port = 8080
filter = fleet-manager
logpath = /var/log/fleet-manager.log
maxretry = 5
bantime = 1800
JAIL_CONFIG

# Create custom filters
sudo mkdir -p /etc/fail2ban/filter.d

# OpenClaw filter
sudo tee /etc/fail2ban/filter.d/openclaw.conf << 'OPENCLAW_FILTER'
[Definition]
failregex = .*Failed authentication from <HOST>.*
            .*Invalid request from <HOST>.*
            .*Rate limit exceeded from <HOST>.*
ignoreregex =
OPENCLAW_FILTER

# Fleet manager filter
sudo tee /etc/fail2ban/filter.d/fleet-manager.conf << 'FLEET_FILTER'
[Definition]
failregex = .*Unauthorized access attempt from <HOST>.*
            .*Invalid API key from <HOST>.*
ignoreregex =
FLEET_FILTER

# Enable and start fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create monitoring script
cat > /opt/security-monitor.sh << 'SEC_MONITOR'
#!/bin/bash

log_security_event() {
    local event_type=$1
    local details=$2
    echo "$(date -Iseconds): [$event_type] $details" | tee -a /var/log/security-events.log
}

check_failed_logins() {
    local failed_logins=$(grep "Failed password" /var/log/auth.log | grep "$(date +%b\ %d)" | wc -l)
    
    if (( failed_logins > 10 )); then
        log_security_event "HIGH_FAILED_LOGINS" "Detected $failed_logins failed login attempts today"
    fi
}

check_banned_ips() {
    local banned_count=$(sudo fail2ban-client status sshd | grep "Currently banned:" | awk '{print $3}')
    
    if (( banned_count > 0 )); then
        local banned_ips=$(sudo fail2ban-client status sshd | grep "Banned IP list:" | cut -d: -f2)
        log_security_event "IPS_BANNED" "Currently banned IPs: $banned_ips"
    fi
}

check_unusual_processes() {
    # Check for processes consuming high CPU
    local high_cpu_procs=$(ps aux --sort=-%cpu | head -6 | tail -5 | awk '$3 > 80')
    
    if [[ -n "$high_cpu_procs" ]]; then
        log_security_event "HIGH_CPU_USAGE" "Processes consuming high CPU detected"
    fi
}

check_network_connections() {
    # Check for unusual network connections
    # `ss` is the default on modern Ubuntu (netstat needs the net-tools package).
    local external_connections=$(ss -tn state established | tail -n +2 | grep -v "127.0.0.1\|10.\|172.16\|192.168" | wc -l)
    
    if (( external_connections > 50 )); then
        log_security_event "HIGH_EXTERNAL_CONNECTIONS" "Detected $external_connections external connections"
    fi
}

# Run security checks
check_failed_logins
check_banned_ips  
check_unusual_processes
check_network_connections

# Generate daily security summary
if [[ "$(date +%H:%M)" == "23:59" ]]; then
    log_security_event "DAILY_SUMMARY" "Security monitoring completed for $(date +%Y-%m-%d)"
fi
SEC_MONITOR

chmod +x /opt/security-monitor.sh

# Setup security monitoring cron
(crontab -l 2>/dev/null; echo "*/15 * * * * /opt/security-monitor.sh") | crontab -

echo "✅ Intrusion detection system configured"
IDS_SETUP

echo "✅ Intrusion detection configured on primary node"
}

setup_log_monitoring() {
    echo "📋 Setting up centralized log monitoring..."
    
    local primary_ip=$(jq -r '.primary_node.ip' "$FLEET_CONFIG")
    
    # Setup log aggregation on primary node
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER"@"$primary_ip" << 'LOG_SETUP'
#!/bin/bash
set -e

echo "📊 Setting up centralized logging..."

# Install rsyslog for log aggregation
sudo apt-get update
sudo apt-get install -y rsyslog

# Configure rsyslog as log server
sudo tee /etc/rsyslog.conf << 'RSYSLOG_CONFIG'
# Provides TCP syslog reception
$ModLoad imtcp
$InputTCPServerRun 514

# Provides UDP syslog reception
$ModLoad imudp
$InputUDPServerRun 514

# Log templates
$template RemoteLogs,"/var/log/remote/%HOSTNAME%/%PROGRAMNAME%.log"
*.* ?RemoteLogs
& ~

# Local logging
$ActionFileDefaultTemplate RSYSLOG_TraditionalFileFormat
auth,authpriv.*                 /var/log/auth.log
*.*;auth,authpriv.none         -/var/log/syslog
daemon.*                       -/var/log/daemon.log
kern.*                         -/var/log/kern.log
mail.*                         -/var/log/mail.log
user.*                         -/var/log/user.log

# Emergency messages to all logged in users
*.emerg                         :omusrmsg:*
RSYSLOG_CONFIG

# Create log directories
sudo mkdir -p /var/log/remote
sudo chown -R syslog:syslog /var/log/remote

# Restart rsyslog
sudo systemctl restart rsyslog

# Create log analysis script
cat > /opt/log-analyzer.sh << 'LOG_ANALYZER'
#!/bin/bash

LOG_DIR="/var/log"
REPORT_DIR="/opt/log-reports"
REPORT_DATE=$(date +%Y-%m-%d)

mkdir -p "$REPORT_DIR"

generate_security_report() {
    echo "🔍 Generating security log analysis..."
    
    local report_file="$REPORT_DIR/security-report-$REPORT_DATE.txt"
    
    {
        echo "SECURITY LOG ANALYSIS - $REPORT_DATE"
        echo "=================================="
        echo ""
        
        echo "SSH Login Attempts:"
        grep "sshd" "$LOG_DIR/auth.log" | grep "$(date +%b\ %d)" | grep "Failed password" | wc -l
        echo ""
        
        echo "Successful SSH Logins:"
        grep "sshd" "$LOG_DIR/auth.log" | grep "$(date +%b\ %d)" | grep "Accepted password" | wc -l
        echo ""
        
        echo "Fail2ban Actions:"
        grep "fail2ban" "$LOG_DIR/fail2ban.log" | grep "$(date +%Y-%m-%d)" | tail -10
        echo ""
        
        echo "Top Source IPs (Failed Logins):"
        grep "Failed password" "$LOG_DIR/auth.log" | grep "$(date +%b\ %d)" | awk '{print $(NF-3)}' | sort | uniq -c | sort -nr | head -5
        echo ""
        
        echo "OpenClaw Service Status:"
        systemctl status openclaw --no-pager || echo "Service not found"
        echo ""
        
        echo "Fleet Manager Status:"
        systemctl status fleet-manager --no-pager || echo "Service not found"
        
    } > "$report_file"
    
    echo "✅ Security report generated: $report_file"
}

generate_performance_report() {
    echo "📈 Generating performance log analysis..."
    
    local report_file="$REPORT_DIR/performance-report-$REPORT_DATE.txt"
    
    {
        echo "PERFORMANCE LOG ANALYSIS - $REPORT_DATE"
        echo "====================================="
        echo ""
        
        echo "System Load Average:"
        uptime
        echo ""
        
        echo "Memory Usage:"
        free -h
        echo ""
        
        echo "Disk Usage:"
        df -h
        echo ""
        
        echo "Top Processes by CPU:"
        ps aux --sort=-%cpu | head -6
        echo ""
        
        echo "Top Processes by Memory:"
        ps aux --sort=-%mem | head -6
        echo ""
        
        echo "Network Connections (established):"
        ss -tn state established | tail -n +2 | wc -l
        
    } > "$report_file"
    
    echo "✅ Performance report generated: $report_file"
}

# Generate reports
generate_security_report
generate_performance_report

# Cleanup old reports (keep 30 days)
find "$REPORT_DIR" -name "*.txt" -mtime +30 -delete
LOG_ANALYZER

chmod +x /opt/log-analyzer.sh

# Setup daily log analysis
(crontab -l 2>/dev/null; echo "0 1 * * * /opt/log-analyzer.sh") | crontab -

echo "✅ Centralized logging configured"
LOG_SETUP

echo "✅ Log monitoring configured on primary node"
}

# Execute security hardening for all nodes
harden_all_nodes() {
    echo "🔒 Hardening security on all fleet nodes..."
    
    local primary_ip=$(jq -r '.primary_node.ip' "$FLEET_CONFIG")
    local worker_ips=($(jq -r '.worker_nodes[] | .ip // empty' "$FLEET_CONFIG"))
    
    # Harden primary node
    echo "🛡️ Hardening primary node..."
    setup_firewall_rules "$primary_ip" "primary"
    setup_ssh_hardening "$primary_ip"
    
    # Harden worker nodes
    for worker_ip in "${worker_ips[@]}"; do
        [[ -z "$worker_ip" || "$worker_ip" == "null" ]] && continue
        
        echo "🛡️ Hardening worker node: $worker_ip..."
        setup_firewall_rules "$worker_ip" "worker"
        setup_ssh_hardening "$worker_ip"
    done
}

# Create security status checker
create_security_checker() {
    echo "🔍 Creating security status checker..."
    
    cat > ~/.aleph-deploy/scripts/security-status.sh << 'SEC_STATUS'
#!/bin/bash

FLEET_CONFIG="$HOME/.aleph-deploy/configs/fleet.json"
SSH_KEY="${ALEPH_SSH_KEY:-$HOME/.aleph-deploy/keys/aleph_ed25519}"
SSH_USER="$(jq -r '.ssh_user // "root"' "$FLEET_CONFIG" 2>/dev/null || echo root)"

check_node_security() {
    local node_ip=$1
    local node_type=$2
    
    echo "🔍 Checking security status of $node_type node ($node_ip)..."
    
    # Check UFW status
    echo -n "  Firewall: "
    if ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER"@"$node_ip" "sudo ufw status" | grep -q "Status: active"; then
        echo "✅ Active"
    else
        echo "❌ Inactive"
    fi
    
    # Check SSH configuration
    echo -n "  SSH Security: "
    local ssh_score=0
    if ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER"@"$node_ip" "grep -q 'PasswordAuthentication no' /etc/ssh/sshd_config"; then
        ssh_score=$((ssh_score + 1))
    fi
    # Accept either 'no' or 'prohibit-password' (the latter is used on root-only images).
    if ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER"@"$node_ip" "grep -Eq 'PermitRootLogin (no|prohibit-password)' /etc/ssh/sshd_config"; then
        ssh_score=$((ssh_score + 1))
    fi
    if ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER"@"$node_ip" "grep -q 'MaxAuthTries 3' /etc/ssh/sshd_config"; then
        ssh_score=$((ssh_score + 1))
    fi
    
    if (( ssh_score >= 2 )); then
        echo "✅ Hardened ($ssh_score/3)"
    else
        echo "⚠️ Needs attention ($ssh_score/3)"
    fi
    
    # Check fail2ban (primary node only)
    if [[ "$node_type" == "primary" ]]; then
        echo -n "  Intrusion Detection: "
        if ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER"@"$node_ip" "systemctl is-active fail2ban" &>/dev/null; then
            echo "✅ Active"
        else
            echo "❌ Inactive"
        fi
    fi
    
    # Check system updates
    echo -n "  System Updates: "
    local updates=$(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new "$SSH_USER"@"$node_ip" "apt list --upgradable 2>/dev/null | grep -c upgradable || echo 0")
    if (( updates == 0 )); then
        echo "✅ Up to date"
    else
        echo "⚠️ $updates updates available"
    fi
    
    echo ""
}

# Check all fleet nodes
check_fleet_security() {
    local primary_ip=$(jq -r '.primary_node.ip' "$FLEET_CONFIG")

    echo "🔒 FLEET SECURITY STATUS"
    echo "========================"
    echo ""

    check_node_security "$primary_ip" "primary"

    local worker_ips=($(jq -r '.worker_nodes[] | .ip // empty' "$FLEET_CONFIG"))
    for worker_ip in "${worker_ips[@]}"; do
        [[ -z "$worker_ip" || "$worker_ip" == "null" ]] && continue
        check_node_security "$worker_ip" "worker"
    done
}

check_fleet_security
SEC_STATUS

chmod +x ~/.aleph-deploy/scripts/security-status.sh

echo "✅ Security status checker created"
}

# Execute all security hardening
harden_all_nodes
setup_key_rotation
setup_intrusion_detection
setup_log_monitoring
create_security_checker

echo "🔒 Security hardening complete!"
echo ""
echo "Security components:"
echo "- UFW firewall configured on all nodes"
echo "- SSH hardened (key-only; root login set to prohibit-password on root-only images)"
echo "- On-demand SSH key rotation (verify-before-activate; not a forced schedule)"
echo "- Fail2ban intrusion detection"
echo "- Centralized logging"
echo ""
echo "Check security status: ~/.aleph-deploy/scripts/security-status.sh"
```

---

## Monitoring & Maintenance

### Routine Maintenance Checklist

**Daily:**
- Check fleet status: `./fleet-control.sh status`
- Review backup logs: `tail /var/log/backup.log`
- Check security events: `tail /var/log/security-events.log`

**Weekly:**
- Review cost reports: `ls ~/.aleph-deploy/reports/`
- Check node health: `./fleet-control.sh health`
- Verify backup integrity: run a test restore on staging

**Monthly / as needed:**
- Update system packages: `./fleet-control.sh deploy update-packages.sh`
- Re-check CRN pricing and availability: `aleph pricing instance`
- Rotate `FLEET_API_KEY` if a node/operator may be compromised (regenerate, update `/etc/fleet-manager.env` on the primary, restart fleet-manager/sync/distributor)

**On a security event (not on a fixed schedule):**
- Rotate SSH keys: `~/.aleph-deploy/scripts/rotate-ssh-keys.sh rotate` (verify-before-activate; old key kept until new one is proven)

### Quick Reference Commands

```bash
# Fleet operations
./fleet-control.sh status        # View fleet status
./fleet-control.sh health        # Health check all nodes
./fleet-control.sh restart openclaw  # Restart service on all nodes
./fleet-control.sh logs openclaw 100 # Collect last 100 log lines

# Backup & Recovery
ssh root@PRIMARY_IP '/opt/openclaw/backup-system.sh full'
ssh root@PRIMARY_IP '/opt/openclaw/backup-system.sh snapshot'

# Security
~/.aleph-deploy/scripts/security-status.sh
~/.aleph-deploy/scripts/rotate-ssh-keys.sh rotate

# Cost monitoring
~/.aleph-deploy/scripts/cost-monitor.sh

# Auto-scaling (enable/disable)
ssh root@PRIMARY_IP 'sudo systemctl enable auto-scaler && sudo systemctl start auto-scaler'
ssh root@PRIMARY_IP 'sudo systemctl stop auto-scaler && sudo systemctl disable auto-scaler'

# Replication
ssh root@PRIMARY_IP '/opt/openclaw/replication/auto-provisioning-protocol.sh replicate'
ssh root@PRIMARY_IP '/opt/openclaw/replication/auto-provisioning-protocol.sh emergency manual'

# Tailscale mesh
ssh root@PRIMARY_IP 'tailscale status'
```

### Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Fleet manager 401 | Missing x-api-key header | Add `-H "x-api-key: $FLEET_API_KEY"` to curl calls |
| Worker can't register | Fleet manager not reachable | Check Tailscale connectivity and UFW rules |
| nodes.json ENOENT | File not created before service start | Create `echo '{"nodes":[]}' > /opt/fleet-manager/nodes.json` and restart |
| HAProxy backend stale | Fleet sync not running | Check `systemctl status haproxy-fleet-sync` |
| SSH key rotation fails | New key not propagated | Old key still works (rotation is verify-before-activate); re-run `rotate-ssh-keys.sh rotate`, or manually append: `ssh-copy-id -i KEY "$SSH_USER@NODE"` |
| Auto-scaler variables lost | Pipe subshell scoping | Use `while read ... done < <(cmd)` process substitution |
| Replication files missing | Wrong extract paths | Files are under `soul/`, `agents/`, `memory/` subdirectories |
| High CPU but no scale-up | Cooldown period active | Wait 5 minutes or reset `/tmp/last-scale-action` |