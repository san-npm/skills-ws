## Contents

- Single Node Deployment Foundation
- Prerequisites & Setup
- Single VM Deployment

## Single Node Deployment Foundation

### Prerequisites & Setup

**Local Environment Setup:**
```bash
#!/bin/bash
# setup-aleph-environment.sh
set -euo pipefail

echo "Setting up Aleph Cloud deployment environment..."

# Install the Python aleph-client CLI (PyPI, v1.9.x) in an isolated environment.
# The flags used throughout this skill target this client, not the newer
# aleph-cli documented at https://docs.aleph.cloud/devhub/sdks-and-tools/aleph-cli/
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

> **Key type note.** This skill standardizes on **ed25519** keys at `~/.aleph-deploy/keys/aleph_ed25519`. If you are upgrading an older deployment that used a different key (for example `~/.aleph-deploy/keys/aleph_rsa`), either re-run the generator above or `export ALEPH_SSH_KEY=<path-to-your-existing-key>` and keep it consistent; every script below reads the same variable.

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
    "OPENCLAW_GATEWAY_PORT=18789 bash -s" <<'PROVISION'
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
# Official NodeSource installer; to review first:
#   curl -fsSL https://deb.nodesource.com/setup_22.x -o /tmp/ns.sh && less /tmp/ns.sh
installer_1="$(mktemp)"
curl -fsSL https://deb.nodesource.com/setup_22.x -o "$installer_1"
less "$installer_1"  # Review before execution; verify the release checksum/signature when published.
bash "$installer_1" -
rm -f "$installer_1"
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
# Official OpenClaw installer (docs.openclaw.ai/install); download and review the
# script first in high-security environments.
installer_2="$(mktemp)"
curl -fsSL https://openclaw.ai/install.sh -o "$installer_2"
less "$installer_2"  # Review before execution; verify the release checksum/signature when published.
bash "$installer_2"
# Onboarding is interactive by design; for headless provisioning configure tokens
rm -f "$installer_2"
# via env/secret store first, then:
#   openclaw onboard --install-daemon
# Verify once installed:
#   openclaw --version && openclaw doctor && openclaw gateway status
# The gateway listens on 18789 by default (OPENCLAW_GATEWAY_PORT or gateway.port
# override it) and binds loopback by default: configure it to listen on the
# Tailscale interface before HAProxy or mesh peers can reach it.

echo "VM base provisioning complete."
PROVISION

echo "Deployment complete."
echo "SSH:     ssh -i $SSH_KEY $SSH_USER@$VM_IP"
echo "OpenClaw: reach it over Tailscale or via HAProxy (gateway defaults to 18789, loopback-bound; NEVER a public port)."
echo "Tear down: aleph instance delete ${ITEM_HASH:-<item-hash>}"
```

> **OpenClaw config note.** OpenClaw is configured through `openclaw onboard` (writing to its own workspace under `~/.openclaw`/the daemon home), **not** by hand-authored `/opt/openclaw/config/production.json` files with keys like `server.cluster` or `aleph.node_id` — those were invented in earlier drafts and OpenClaw does not read them. Treat any per-node "role" we track (primary/worker) as *our* fleet metadata in `fleet.json`, separate from OpenClaw's own config.

---
