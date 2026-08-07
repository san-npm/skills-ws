## Contents

- Auto-Provisioning Protocol (SRP)
- Agent Continuity System

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
