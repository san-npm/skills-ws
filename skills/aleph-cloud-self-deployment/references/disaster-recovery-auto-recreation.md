## Contents

- Disaster Recovery & Auto-Recreation
- Automated Backup System

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
    
    # Check OpenClaw gateway health via the CLI over SSH (no HTTP /health
    # endpoint is documented; the gateway binds loopback by default anyway).
    if ! ssh -i /root/.ssh/aleph_ed25519 \
            "$ru@$node_ip" "openclaw gateway status || openclaw health" &>/dev/null; then
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
installer_1="$(mktemp)"
curl -fsSL https://get.docker.com -o "$installer_1"
less "$installer_1"  # Review before execution; verify the release checksum/signature when published.
sh "$installer_1"
rm -f "$installer_1"
installer_2="$(mktemp)"
curl -fsSL https://deb.nodesource.com/setup_22.x -o "$installer_2"
less "$installer_2"  # Review before execution; verify the release checksum/signature when published.
bash "$installer_2" - && apt-get install -y nodejs
rm -f "$installer_2"
installer_3="$(mktemp)"
curl -fsSL https://tailscale.com/install.sh -o "$installer_3"
less "$installer_3"  # Review before execution; verify the release checksum/signature when published.
sh "$installer_3"
# file: pattern keeps the auth key out of the process list (see Tailscale section)
rm -f "$installer_3"
[[ -n "${TAILSCALE_AUTH_KEY:-}" ]] && { printf '%s' "$TAILSCALE_AUTH_KEY" > /tmp/ts && chmod 600 /tmp/ts && tailscale up --auth-key="file:/tmp/ts" --hostname="$NODE_ID"; rm -f /tmp/ts; }
installer_4="$(mktemp)"
curl -fsSL https://openclaw.ai/install.sh -o "$installer_4"
less "$installer_4"  # Review before execution; verify the release checksum/signature when published.
bash "$installer_4"
rm -f "$installer_4"
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
