## Contents

- Inter-VM Communication Networks
- Tailscale Mesh Network Setup

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
installer_1="$(mktemp)"
curl -fsSL https://tailscale.com/install.sh -o "$installer_1"
less "$installer_1"  # Review before execution; verify the release checksum/signature when published.
sh "$installer_1"

# Connect to Tailscale network
rm -f "$installer_1"
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

# OpenClaw gateway access (default gateway port 18789)
18789:localhost:18789

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
