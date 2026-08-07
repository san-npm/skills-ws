## Contents

- Cost Optimization Strategies
- Dynamic Resource Management

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
