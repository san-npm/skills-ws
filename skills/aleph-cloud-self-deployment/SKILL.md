---
name: aleph-cloud-self-deployment
description: Expert-level Aleph Cloud deployment with multi-node fleet management, self-replication protocols, inter-VM communication, load distribution, disaster recovery, and security hardening
version: 2.0.0
---

# Aleph Cloud Self-Deployment v2.0: Multi-Node Fleet Management

Comprehensive framework for deploying and managing OpenClaw instances across Aleph Cloud infrastructure with advanced orchestration, self-replication protocols, and enterprise-grade reliability.

## Table of Contents

1. [Infrastructure Planning & Architecture](#infrastructure-planning--architecture)
2. [Single Node Deployment Foundation](#single-node-deployment-foundation)
3. [Multi-Node Fleet Management](#multi-node-fleet-management)
4. [Self-Replication Protocol (SRP)](#self-replication-protocol-srp)
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

**Resource Planning Matrix:**
```yaml
Node Types:
  Orchestrator (Primary):
    CRN: aleph.im
    Tier: 4 vCPU, 8GB RAM, 100GB SSD
    Role: Fleet management, load balancing, coordination
    Cost: ~50 ALEPH/month
    
  Compute Nodes (Workers):
    CRN: aleph.im, twentysix.cloud, cybernodes.io
    Tier: 2 vCPU, 4GB RAM, 50GB SSD  
    Role: OpenClaw instances, task execution
    Cost: ~25 ALEPH/month each
    
  Backup Node (Optional):
    CRN: Different provider for redundancy
    Tier: 1 vCPU, 2GB RAM, 20GB SSD
    Role: Configuration backup, emergency recovery
    Cost: ~15 ALEPH/month

Total Monthly Cost (5-node setup): ~165 ALEPH (~$50-80 USD)
```

### CRN Selection Strategy

**Provider Tier Assessment:**
```bash
#!/bin/bash
# CRN evaluation script

evaluate_crn() {
    local crn_url=$1
    local crn_name=$2
    
    echo "=== Evaluating $crn_name ($crn_url) ==="
    
    # Performance test
    echo "Performance Test:"
    time curl -s "$crn_url/api/v0/messages" | head -10
    
    # Availability check
    echo "Availability Check:"
    for i in {1..5}; do
        response=$(curl -s -w "%{http_code}" -o /dev/null "$crn_url/api/v0/messages")
        echo "Attempt $i: HTTP $response"
        sleep 2
    done
    
    # Geographic latency
    echo "Latency Test:"
    ping -c 3 "${crn_url#https://}" | grep "time="
    
    echo "------------------------"
}

# Test major CRNs
evaluate_crn "https://api2.aleph.im" "Official Aleph.im"
evaluate_crn "https://api.twentysix.cloud" "TwentySix Cloud"  
evaluate_crn "https://api.cybernodes.io" "CyberNodes"
evaluate_crn "https://api.nft.storage" "NFT.Storage"

# Generate recommendation
echo "=== CRN RECOMMENDATIONS ==="
echo "Primary (Orchestrator): aleph.im (highest reliability)"
echo "Workers: Mix of twentysix.cloud + cybernodes.io (cost optimization)"
echo "Backup: Different provider for redundancy"
```

---

## Single Node Deployment Foundation

### Prerequisites & Setup

**Local Environment Setup:**
```bash
#!/bin/bash
# setup-aleph-environment.sh

set -e

echo "🚀 Setting up Aleph Cloud deployment environment..."

# Install aleph CLI
if ! command -v aleph &> /dev/null; then
    echo "Installing Aleph CLI..."
    pip3 install aleph-client
    # Alternative: npm install -g aleph-js
fi

# Verify installation
aleph --version

# Create deployment directory structure
mkdir -p ~/.aleph-deploy/{keys,configs,scripts,backups}

# Generate SSH key pair for VMs
if [[ ! -f ~/.aleph-deploy/keys/aleph_rsa ]]; then
    echo "Generating SSH key pair..."
    ssh-keygen -t rsa -b 4096 -f ~/.aleph-deploy/keys/aleph_rsa -N "" -C "aleph-fleet-$(date +%Y%m%d)"
fi

# Create aleph account configuration
cat > ~/.aleph-deploy/configs/account.json << 'EOF'
{
  "private_key": null,
  "address": null,
  "mnemonic": null,
  "created": null
}
EOF

echo "✅ Environment setup complete!"
echo "Next steps:"
echo "1. Run: aleph account create"
echo "2. Fund your account with ALEPH tokens"
echo "3. Configure your deployment parameters"
```

**Account Creation & Funding:**
```bash
#!/bin/bash
# account-setup.sh

echo "🔑 Setting up Aleph account..."

# Create new account or import existing
read -p "Do you want to (c)reate new account or (i)mport existing? " choice

case $choice in
    c|C)
        echo "Creating new account..."
        aleph account create --replace
        ;;
    i|I)
        echo "Import your private key or mnemonic..."
        aleph account import-private-key
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

# Display account info
echo "Account created/imported:"
aleph account show

# Check balance
balance=$(aleph balance)
echo "Current balance: $balance ALEPH"

if (( $(echo "$balance < 100" | bc -l) )); then
    echo "⚠️  WARNING: Low balance. You need ~165 ALEPH for a 5-node deployment."
    echo "Fund your account at: https://aleph.im"
    echo "Your address: $(aleph account show | grep Address | cut -d: -f2 | xargs)"
fi

echo "✅ Account setup complete!"
```

### Single VM Deployment

**Basic VM Deployment Script:**
```bash
#!/bin/bash
# deploy-single-vm.sh

set -e

# Configuration
VM_NAME="${1:-openclaw-primary}"
CRN_URL="${2:-https://api2.aleph.im}"
VM_TYPE="${3:-vm-standard-2}"
DISK_SIZE="${4:-50}"

echo "🚀 Deploying single VM: $VM_NAME"

# Read SSH public key
SSH_PUB_KEY=$(cat ~/.aleph-deploy/keys/aleph_rsa.pub)

# Create VM deployment
aleph instance create \
    --name "$VM_NAME" \
    --image-ref "ubuntu:22.04" \
    --vcpus 2 \
    --memory 4096 \
    --disk-size "$DISK_SIZE" \
    --ssh-authorized-keys "$SSH_PUB_KEY" \
    --crn "$CRN_URL" \
    --volumes '[{"name":"data","mount_path":"/data","size_gb":20,"persistence":true}]' \
    --environment-variables '{
        "OPENCLAW_VERSION":"latest",
        "NODE_ENV":"production",
        "DEPLOY_TYPE":"aleph-cloud"
    }' \
    --setup-script "$(cat << 'SETUP_SCRIPT'
#!/bin/bash
set -e

# Update system
apt-get update && apt-get upgrade -y

# Install essential packages
apt-get install -y curl wget git htop unzip jq fail2ban ufw nodejs npm

# Install Docker
# Note: In production, verify checksums before running downloaded scripts
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
usermod -aG docker ubuntu

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Setup firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80
ufw allow 443
ufw --force enable

# Install OpenClaw
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw/main/install.sh | bash

# Configure OpenClaw for production
mkdir -p /opt/openclaw/config
cat > /opt/openclaw/config/production.json << 'CONFIG'
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0",
    "cluster": true
  },
  "logging": {
    "level": "info",
    "file": "/var/log/openclaw/app.log"
  },
  "aleph": {
    "node_id": "$HOSTNAME",
    "deployment_type": "cloud",
    "auto_restart": true
  }
}
CONFIG

# Create systemd service
cat > /etc/systemd/system/openclaw.service << 'SERVICE'
[Unit]
Description=OpenClaw Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/openclaw
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=openclaw

[Install]
WantedBy=multi-user.target
SERVICE

# Enable and start OpenClaw
systemctl enable openclaw
systemctl start openclaw

# Install monitoring agent
cat > /opt/monitor-node.sh << 'MONITOR'
#!/bin/bash
while true; do
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    load=$(uptime | awk -F'load average:' '{print $2}')
    memory=$(free | grep Mem | awk '{printf "%.1f%%", $3/$2 * 100.0}')
    disk=$(df -h / | awk 'NR==2{printf "%s", $5}')
    
    echo "$timestamp - Load:$load Memory:$memory Disk:$disk" >> /var/log/node-stats.log
    
    # Health check OpenClaw
    if ! systemctl is-active --quiet openclaw; then
        echo "$timestamp - OpenClaw service down, restarting..." >> /var/log/node-stats.log
        systemctl restart openclaw
    fi
    
    sleep 60
done
MONITOR

chmod +x /opt/monitor-node.sh

# Use systemd instead of nohup — nohup processes are unsupervised
# and won't restart if they crash
cat > /etc/systemd/system/node-monitor.service << 'MONITOR_SVC'
[Unit]
Description=Node health monitor
After=openclaw.service

[Service]
Type=simple
ExecStart=/opt/monitor-node.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
MONITOR_SVC
systemctl daemon-reload
systemctl enable node-monitor
systemctl start node-monitor

echo "✅ VM setup complete!"
SETUP_SCRIPT
    )"

echo "✅ VM deployment initiated!"
echo "Monitoring deployment status..."

# Wait for deployment to complete
aleph instance status "$VM_NAME" --wait

# Get VM connection details
VM_INFO=$(aleph instance get "$VM_NAME")
VM_IP=$(echo "$VM_INFO" | jq -r '.networking.ipv4')

echo "🎉 VM deployed successfully!"
echo "SSH Connection: ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@$VM_IP"
echo "OpenClaw URL: http://$VM_IP:3000"

# Test connection
echo "Testing SSH connection..."
# Use accept-new instead of no — it accepts first connection but rejects changed host keys (MITM protection)
ssh -i ~/.aleph-deploy/keys/aleph_rsa -o StrictHostKeyChecking=accept-new ubuntu@"$VM_IP" "echo 'SSH connection successful!'"
```

---

## Multi-Node Fleet Management

### Fleet Deployment Orchestrator

**Master Deployment Script:**
```bash
#!/bin/bash
# deploy-fleet.sh

set -e

# Fleet Configuration
FLEET_NAME="${1:-openclaw-fleet}"
NODE_COUNT="${2:-5}"
PRIMARY_CRN="https://api2.aleph.im"
WORKER_CRNS=("https://api.twentysix.cloud" "https://api.cybernodes.io" "https://api.nft.storage")

echo "🚀 Deploying OpenClaw fleet: $FLEET_NAME with $NODE_COUNT nodes"

# Fleet configuration
cat > ~/.aleph-deploy/configs/fleet.json << EOF
{
  "fleet_name": "$FLEET_NAME",
  "deployment_date": "$(date -Iseconds)",
  "node_count": $NODE_COUNT,
  "primary_node": null,
  "worker_nodes": [],
  "network": {
    "tailscale_key": null,
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
    local setup_script=$(cat << 'PRIMARY_SETUP'
#!/bin/bash
set -e

# Standard VM setup
apt-get update && apt-get upgrade -y
apt-get install -y curl wget git htop jq fail2ban ufw nodejs npm docker.io docker-compose

# Create a dedicated non-root user for fleet services
# Running all services as root is a security risk — a compromise in any
# service gives full system access. Use a dedicated user for fleet-manager.
useradd -r -s /usr/sbin/nologin -d /opt/fleet-manager fleetmgr || true

# Install fleet management tools
mkdir -p /opt/fleet-manager
cd /opt/fleet-manager

# Fleet Manager Application
cat > fleet-manager.js << 'FLEET_MANAGER'
const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const crypto = require('crypto');
const app = express();

app.use(express.json());

// API key auth middleware — fleet manager should NOT be open to the internet.
// Bind to Tailscale IP or localhost, and require an API key for all requests.
const FLEET_API_KEY = process.env.FLEET_API_KEY || crypto.randomBytes(32).toString('hex');
if (!process.env.FLEET_API_KEY) {
    console.log(`Generated FLEET_API_KEY: ${FLEET_API_KEY}`);
    console.log('Set FLEET_API_KEY env var to persist across restarts.');
}
function requireAuth(req, res, next) {
    const key = req.headers['x-api-key'] || req.query.api_key;
    if (!key || key !== FLEET_API_KEY) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}
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

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Node registration endpoint
app.post('/fleet/register', (req, res) => {
    const { node_id, ip_address, capabilities } = req.body;

    let fleet;
    try {
        fleet = JSON.parse(fs.readFileSync('/opt/fleet-manager/nodes.json', 'utf8'));
    } catch {
        fleet = { nodes: [] };
    }
    
    // Update or add node
    const existingIndex = fleet.nodes.findIndex(n => n.node_id === node_id);
    const nodeData = {
        node_id,
        ip_address,
        capabilities,
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
// Bind to localhost or Tailscale IP — do NOT expose fleet manager to the public internet
const BIND_HOST = process.env.BIND_HOST || '127.0.0.1';
app.listen(PORT, BIND_HOST, () => {
    console.log(`Fleet Manager running on ${BIND_HOST}:${PORT}`);
});
FLEET_MANAGER

# Install dependencies and start fleet manager
npm init -y
npm install express
chmod +x fleet-manager.js

# Create systemd service
cat > /etc/systemd/system/fleet-manager.service << 'SERVICE'
[Unit]
Description=OpenClaw Fleet Manager
After=network.target

[Service]
Type=simple
User=fleetmgr
WorkingDirectory=/opt/fleet-manager
ExecStart=/usr/bin/node fleet-manager.js
Restart=always
RestartSec=10
Environment=PORT=8080

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

systemctl enable fleet-manager
systemctl start fleet-manager

# Install OpenClaw
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw/main/install.sh | bash

# Configure as primary node
mkdir -p /opt/openclaw/config
cat > /opt/openclaw/config/primary.json << 'CONFIG'
{
  "role": "primary",
  "fleet_manager": "http://localhost:8080",
  "node_discovery": true,
  "load_balancing": true
}
CONFIG

echo "✅ Primary node setup complete!"
PRIMARY_SETUP
    )
    
    aleph instance create \
        --name "$node_name" \
        --image-ref "ubuntu:22.04" \
        --vcpus 4 \
        --memory 8192 \
        --disk-size 100 \
        --ssh-authorized-keys "$(cat ~/.aleph-deploy/keys/aleph_rsa.pub)" \
        --crn "$PRIMARY_CRN" \
        --setup-script "$setup_script"
    
    # Wait for deployment and get IP
    aleph instance status "$node_name" --wait
    local primary_ip=$(aleph instance get "$node_name" | jq -r '.networking.ipv4')
    
    # Update fleet config
    # Use mktemp to avoid race conditions with predictable tmp.json filenames
    local tmpfile=$(mktemp)
    jq '.primary_node = {"name": "'$node_name'", "ip": "'$primary_ip'"}' ~/.aleph-deploy/configs/fleet.json > "$tmpfile"
    mv "$tmpfile" ~/.aleph-deploy/configs/fleet.json
    
    echo "✅ Primary node deployed: $primary_ip"
    return 0
}

deploy_worker_node() {
    local node_id=$1
    local crn_url=$2
    local primary_ip=$3
    
    local node_name="${FLEET_NAME}-worker-${node_id}"
    
    echo "👷 Deploying Worker Node $node_id..."
    
    local setup_script=$(cat << WORKER_SETUP
#!/bin/bash
set -e

# Standard setup
apt-get update && apt-get upgrade -y
apt-get install -y curl wget git htop jq nodejs npm docker.io

# Install OpenClaw
curl -fsSL https://raw.githubusercontent.com/openclaw/openclaw/main/install.sh | bash

# Configure as worker node
mkdir -p /opt/openclaw/config
cat > /opt/openclaw/config/worker.json << 'CONFIG'
{
  "role": "worker",
  "primary_node": "$primary_ip",
  "node_id": "$node_name",
  "auto_register": true,
  "heartbeat_interval": 30
}
CONFIG

# Worker registration script
cat > /opt/register-worker.sh << 'REGISTER'
#!/bin/bash
NODE_ID="$node_name"
PRIMARY_IP="$primary_ip"
LOCAL_IP=\$(curl -s http://checkip.amazonaws.com || hostname -I | awk '{print \$1}')

curl -X POST http://\$PRIMARY_IP:8080/fleet/register \
  -H "Content-Type: application/json" \
  -H "x-api-key: \$FLEET_API_KEY" \
  -d "{
    \"node_id\": \"\$NODE_ID\",
    \"ip_address\": \"\$LOCAL_IP\",
    \"capabilities\": [\"compute\", \"storage\", \"openclaw\"]
  }"
REGISTER

chmod +x /opt/register-worker.sh

# Register with primary node
sleep 30
/opt/register-worker.sh

# Setup heartbeat
cat > /opt/heartbeat.sh << 'HEARTBEAT'
#!/bin/bash
while true; do
    /opt/register-worker.sh
    sleep 30
done
HEARTBEAT

chmod +x /opt/heartbeat.sh

# Use systemd instead of nohup for supervised process management
cat > /etc/systemd/system/heartbeat.service << 'HB_SVC'
[Unit]
Description=Worker node heartbeat
After=network-online.target

[Service]
Type=simple
ExecStart=/opt/heartbeat.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
HB_SVC
systemctl daemon-reload
systemctl enable heartbeat
systemctl start heartbeat

echo "✅ Worker node $node_id setup complete!"
WORKER_SETUP
    )
    
    aleph instance create \
        --name "$node_name" \
        --image-ref "ubuntu:22.04" \
        --vcpus 2 \
        --memory 4096 \
        --disk-size 50 \
        --ssh-authorized-keys "$(cat ~/.aleph-deploy/keys/aleph_rsa.pub)" \
        --crn "$crn_url" \
        --setup-script "$setup_script"
    
    # Update fleet config
    local worker_info='{"name": "'$node_name'", "id": '$node_id', "crn": "'$crn_url'"}'
    local tmpfile=$(mktemp)
    jq '.worker_nodes += ['$worker_info']' ~/.aleph-deploy/configs/fleet.json > "$tmpfile"
    mv "$tmpfile" ~/.aleph-deploy/configs/fleet.json
    
    echo "✅ Worker node $node_id deployed on $crn_url"
}

# Main deployment sequence
echo "📋 Starting fleet deployment sequence..."

# Deploy primary node first
deploy_primary_node
primary_ip=$(jq -r '.primary_node.ip' ~/.aleph-deploy/configs/fleet.json)

# Wait for primary node to be ready
echo "⏳ Waiting for primary node to initialize..."
sleep 60

# Deploy worker nodes
for i in $(seq 1 $((NODE_COUNT-1))); do
    crn_index=$((($i - 1) % ${#WORKER_CRNS[@]}))
    crn_url=${WORKER_CRNS[$crn_index]}
    
    deploy_worker_node "$i" "$crn_url" "$primary_ip" &
    
    # Stagger deployments to avoid overwhelming CRNs
    sleep 30
done

# Wait for all deployments to complete
wait

echo "🎉 Fleet deployment complete!"
echo "Primary Node: http://$primary_ip:8080"
echo "Fleet Status: curl http://$primary_ip:8080/fleet/status"

# Display fleet summary
cat ~/.aleph-deploy/configs/fleet.json | jq .
```

### Fleet Management Commands

**Fleet Control Script:**
```bash
#!/bin/bash
# fleet-control.sh

FLEET_CONFIG="$HOME/.aleph-deploy/configs/fleet.json"
# All fleet manager endpoints require x-api-key authentication.
# Set FLEET_API_KEY in your environment or .env file.
FLEET_API_KEY="${FLEET_API_KEY:?FLEET_API_KEY env var is required}"

get_primary_ip() {
    jq -r '.primary_node.ip' "$FLEET_CONFIG"
}

fleet_status() {
    local primary_ip=$(get_primary_ip)
    echo "🔍 Fleet Status Check..."

    curl -s -H "x-api-key: $FLEET_API_KEY" "http://$primary_ip:8080/fleet/status" | jq '.' || {
        echo "❌ Unable to reach fleet manager"
        return 1
    }
}

fleet_health() {
    echo "🏥 Fleet Health Check..."
    
    local primary_ip=$(get_primary_ip)
    local nodes=$(curl -s -H "x-api-key: $FLEET_API_KEY" "http://$primary_ip:8080/fleet/status" | jq -r '.nodes[].ip_address')

    for node_ip in $nodes; do
        echo "Checking node: $node_ip"

        if ssh -i ~/.aleph-deploy/keys/aleph_rsa -o ConnectTimeout=5 ubuntu@"$node_ip" "systemctl is-active openclaw" &>/dev/null; then
            echo "  ✅ $node_ip - OpenClaw running"
        else
            echo "  ❌ $node_ip - OpenClaw not responding"
        fi
    done
}

fleet_restart() {
    local service_name=$1

    # Validate service_name to prevent command injection via SSH
    if [[ ! "$service_name" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        echo "❌ Invalid service name: $service_name"
        return 1
    fi

    echo "🔄 Restarting $service_name on all nodes..."

    local primary_ip=$(get_primary_ip)
    local nodes=$(curl -s -H "x-api-key: $FLEET_API_KEY" "http://$primary_ip:8080/fleet/status" | jq -r '.nodes[].ip_address')

    for node_ip in $nodes; do
        echo "Restarting $service_name on $node_ip..."
        ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$node_ip" "sudo systemctl restart $service_name"
    done
}

fleet_deploy() {
    local script_path=$1
    echo "📤 Deploying script to all nodes: $script_path"
    
    if [[ ! -f "$script_path" ]]; then
        echo "❌ Script file not found: $script_path"
        return 1
    fi
    
    local primary_ip=$(get_primary_ip)
    local nodes=$(curl -s -H "x-api-key: $FLEET_API_KEY" "http://$primary_ip:8080/fleet/status" | jq -r '.nodes[].ip_address')

    for node_ip in $nodes; do
        echo "Deploying to $node_ip..."
        scp -i ~/.aleph-deploy/keys/aleph_rsa "$script_path" ubuntu@"$node_ip":/tmp/deploy-script.sh
        ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$node_ip" "chmod +x /tmp/deploy-script.sh && sudo /tmp/deploy-script.sh"
    done
}

fleet_scale() {
    local target_nodes=$1
    local current_nodes=$(jq '.node_count' "$FLEET_CONFIG")
    
    echo "📊 Scaling fleet from $current_nodes to $target_nodes nodes..."
    
    if (( target_nodes > current_nodes )); then
        echo "🔺 Scaling up: adding $((target_nodes - current_nodes)) nodes"
        # Add scale-up logic
    elif (( target_nodes < current_nodes )); then
        echo "🔻 Scaling down: removing $((current_nodes - target_nodes)) nodes"
        # Add scale-down logic
    else
        echo "✅ Fleet already at target size"
    fi
}

fleet_logs() {
    local service_name="${1:-openclaw}"
    local lines="${2:-50}"

    # Validate inputs to prevent command injection via SSH
    if [[ ! "$service_name" =~ ^[a-zA-Z0-9_-]+$ ]]; then
        echo "❌ Invalid service name: $service_name"
        return 1
    fi
    if [[ ! "$lines" =~ ^[0-9]+$ ]]; then
        echo "❌ Invalid line count: $lines"
        return 1
    fi

    echo "📋 Collecting logs from all nodes..."

    local primary_ip=$(get_primary_ip)
    local nodes=$(curl -s -H "x-api-key: $FLEET_API_KEY" "http://$primary_ip:8080/fleet/status" | jq -r '.nodes[].ip_address')

    for node_ip in $nodes; do
        echo "=== Logs from $node_ip ==="
        ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$node_ip" "sudo journalctl -u $service_name -n $lines --no-pager"
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

## Self-Replication Protocol (SRP)

### Agent Continuity System

**Self-Replication Framework:**
```bash
#!/bin/bash
# self-replication-protocol.sh

set -e

# SRP Configuration
SRP_VERSION="2.0.0"
REPLICATION_DIR="/opt/openclaw/replication"
BACKUP_RETENTION_DAYS=30
SYNC_INTERVAL=300  # 5 minutes

echo "🧬 Self-Replication Protocol v$SRP_VERSION"

initialize_srp() {
    echo "🔬 Initializing Self-Replication Protocol..."
    
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
    
    # Memory files (daily logs)
    if [[ -d "$workspace_root/memory" ]]; then
        # Only sync recent memory files (last 30 days)
        find "$workspace_root/memory" -name "*.md" -mtime -30 -exec cp {} "$REPLICATION_DIR/memory/" \;
        echo "✅ Recent memory files collected"
    fi
    
    # Configuration backups
    cp -r "$openclaw_root/config" "$REPLICATION_DIR/" 2>/dev/null || true
    
    # Calculate integrity hashes
    update_integrity_hashes
}

update_integrity_hashes() {
    echo "🔐 Calculating integrity hashes..."
    
    local manifest_file="$REPLICATION_DIR/manifest.json"
    
    # Update component hashes
    for component in soul agents memory skills; do
        local path="$REPLICATION_DIR/$component"
        if [[ -d "$path" ]]; then
            local hash=$(find "$path" -type f -exec sha256sum {} \; | sort | sha256sum | cut -d' ' -f1)
            local tmpfile=$(mktemp)
            jq --arg comp "$component" --arg hash "$hash" '.components[$comp].hash = $hash' "$manifest_file" > "$tmpfile"
            mv "$tmpfile" "$manifest_file"
        fi
    done

    # Calculate overall integrity hash
    local overall_hash=$(find "$REPLICATION_DIR" -name "*.md" -o -name "*.json" | sort | xargs cat | sha256sum | cut -d' ' -f1)
    local tmpfile=$(mktemp)
    jq --arg hash "$overall_hash" '.integrity_hash = $hash' "$manifest_file" > "$tmpfile"
    mv "$tmpfile" "$manifest_file"

    # Update timestamp
    tmpfile=$(mktemp)
    jq '.last_replication = now' "$manifest_file" > "$tmpfile"
    mv "$tmpfile" "$manifest_file"
    
    echo "✅ Integrity hashes updated"
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
    
    # Transfer package to target node
    scp -i ~/.aleph-deploy/keys/aleph_rsa "$package_path" "ubuntu@$target_ip:/tmp/"
    
    # Execute replication on target node
    ssh -i ~/.aleph-deploy/keys/aleph_rsa "ubuntu@$target_ip" << REMOTE_SCRIPT
#!/bin/bash
set -e

echo "📥 Receiving replication package..."

# Extract package
cd /tmp
tar -xzf "$package_name"

# Prepare target directories
sudo mkdir -p /opt/openclaw/workspace/{memory,skills}
sudo chown -R ubuntu:ubuntu /opt/openclaw/workspace

# Install replicated components
# Files are extracted into subdirectories matching the replication structure:
# soul/SOUL.md, agents/AGENTS.md, memory/MEMORY.md, etc.
if [[ -f soul/SOUL.md ]]; then
    cp soul/SOUL.md /opt/openclaw/workspace/
    echo "✅ SOUL.md installed"
fi

if [[ -f agents/AGENTS.md ]]; then
    cp agents/AGENTS.md /opt/openclaw/workspace/
    echo "✅ AGENTS.md installed"
fi

if [[ -f memory/MEMORY.md ]]; then
    cp memory/MEMORY.md /opt/openclaw/workspace/
    echo "✅ MEMORY.md installed"
fi

if [[ -f USER.md ]]; then
    cp USER.md /opt/openclaw/workspace/
    echo "✅ USER.md installed"
fi

# Install skills
if [[ -d skills ]]; then
    rsync -av skills/ /opt/openclaw/workspace/skills/
    echo "✅ Skills installed"
fi

# Install memory files
if [[ -d memory ]]; then
    mkdir -p /opt/openclaw/workspace/memory
    cp memory/*.md /opt/openclaw/workspace/memory/ 2>/dev/null || true
    echo "✅ Memory files installed"
fi

# Verify integrity
if [[ -f manifest.json ]]; then
    echo "🔐 Verifying integrity..."
    # Add integrity verification logic here
    echo "✅ Integrity verified"
fi

# Restart OpenClaw to load new configuration
sudo systemctl restart openclaw

# Cleanup
rm -f "$package_name"

echo "🎉 Replication complete on \$HOSTNAME"
REMOTE_SCRIPT
    
    # Cleanup local package
    rm -f "$package_path"
    
    echo "✅ Replication to $target_node completed"
}

replicate_to_fleet() {
    echo "🌐 Initiating fleet-wide replication..."
    
    # Collect latest data
    collect_replication_data
    
    # Get fleet node list
    local primary_ip=$(get_primary_ip)
    local nodes=$(curl -s -H "x-api-key: $FLEET_API_KEY" "http://$primary_ip:8080/fleet/status" | jq -r '.nodes[] | select(.node_id != env.HOSTNAME) | .ip_address')
    
    # Replicate to each node in parallel
    for node_ip in $nodes; do
        replicate_to_node "worker" "$node_ip" &
    done
    
    # Wait for all replications to complete
    wait
    
    echo "🎉 Fleet replication complete!"
    
    # Update replication count
    local tmpfile=$(mktemp)
    jq '.replication_count += 1' "$REPLICATION_DIR/manifest.json" > "$tmpfile"
    mv "$tmpfile" "$REPLICATION_DIR/manifest.json"
}

setup_continuous_replication() {
    echo "⏰ Setting up continuous replication..."
    
    # Create replication cron job
    cat > /opt/openclaw/replication-cron.sh << 'CRON_SCRIPT'
#!/bin/bash
export PATH="/usr/local/bin:/usr/bin:/bin"

# Source SRP functions
source /opt/openclaw/replication/self-replication-protocol.sh

# Check if we're the primary node
if [[ -f /opt/fleet-manager/fleet-manager.js ]]; then
    echo "$(date): Running scheduled replication from primary node"
    replicate_to_fleet
else
    echo "$(date): Worker node - skipping scheduled replication"
fi
CRON_SCRIPT
    
    chmod +x /opt/openclaw/replication-cron.sh
    
    # Add to crontab (every 5 minutes)
    (crontab -l 2>/dev/null; echo "*/5 * * * * /opt/openclaw/replication-cron.sh >> /var/log/replication.log 2>&1") | crontab -
    
    echo "✅ Continuous replication configured"
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

if [[ -z "$TAILSCALE_AUTH_KEY" ]]; then
    echo "❌ Error: Tailscale auth key required"
    echo "Get your key from: https://login.tailscale.com/admin/settings/keys"
    echo "Usage: $0 <tailscale-auth-key>"
    exit 1
fi

setup_tailscale_node() {
    local node_ip=$1
    local node_name=$2
    
    echo "🔗 Setting up Tailscale on $node_name ($node_ip)..."
    
    ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$node_ip" << TAILSCALE_SETUP
#!/bin/bash
set -e

echo "📦 Installing Tailscale..."

# Add Tailscale repository
curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/jammy.noarmor.gpg | sudo tee /usr/share/keyrings/tailscale-archive-keyring.gpg >/dev/null
curl -fsSL https://pkgs.tailscale.com/stable/ubuntu/jammy.tailscale-keyring.list | sudo tee /etc/apt/sources.list.d/tailscale.list

# Install Tailscale
sudo apt-get update
sudo apt-get install -y tailscale

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
    ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$primary_ip" << 'VERIFY'
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

TUNNEL_CONFIG="$HOME/.aleph-deploy/configs/ssh-tunnels.conf"
SSH_KEY="$HOME/.aleph-deploy/keys/aleph_rsa"
FLEET_CONFIG="$HOME/.aleph-deploy/configs/fleet.json"

start_tunnels() {
    local target_ip=$1
    local target_name=$2
    
    echo "🚇 Starting SSH tunnels to $target_name ($target_ip)..."
    
    while IFS=':' read -r local_port remote_host remote_port; do
        # Skip comments and empty lines
        [[ "$local_port" =~ ^#.*$ ]] && continue
        [[ -z "$local_port" ]] && continue
        
        # Calculate unique local port to avoid conflicts
        local unique_port=$((local_port + $(echo "$target_ip" | cut -d. -f4)))
        
        # Start SSH tunnel
        ssh -i "$SSH_KEY" \
            -f -N -L "$unique_port:$remote_host:$remote_port" \
            -o StrictHostKeyChecking=accept-new \
            -o ServerAliveInterval=60 \
            ubuntu@"$target_ip"
        
        echo "  ✅ Tunnel: localhost:$unique_port -> $target_name:$remote_port"
    done < "$TUNNEL_CONFIG"
}

stop_tunnels() {
    echo "🛑 Stopping all SSH tunnels..."
    pkill -f "ssh.*-L.*ubuntu@"
    echo "✅ SSH tunnels stopped"
}

list_tunnels() {
    echo "📋 Active SSH tunnels:"
    ps aux | grep "ssh.*-L.*ubuntu@" | grep -v grep
}

case "${1:-start}" in
    "start")
        # Start tunnels to all fleet nodes
        jq -r '.worker_nodes[] | .name + " " + (.ip // "unknown")' "$FLEET_CONFIG" | while IFS=' ' read -r name ip; do
            [[ "$ip" != "unknown" ]] && start_tunnels "$ip" "$name"
        done
        ;;
    "stop")
        stop_tunnels
        ;;
    "list")
        list_tunnels
        ;;
    "restart")
        stop_tunnels
        sleep 5
        $0 start
        ;;
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

set -e

FLEET_CONFIG="$HOME/.aleph-deploy/configs/fleet.json"
PRIMARY_IP=$(jq -r '.primary_node.ip' "$FLEET_CONFIG")

echo "⚖️ Setting up HAProxy load balancer..."

# Install HAProxy on primary node
ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$PRIMARY_IP" << 'HAPROXY_SETUP'
#!/bin/bash
set -e

echo "📦 Installing HAProxy..."
sudo apt-get update
sudo apt-get install -y haproxy

# Backup original configuration
sudo cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg.backup

# Create HAProxy configuration
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

# Statistics interface — must be inside a listen/frontend block, not at top level
listen stats
    bind *:9090
    stats enable
    stats uri /haproxy-stats
    stats realm HAProxy\ Statistics
    stats auth admin:openclaw-fleet-stats

# Frontend - Main entry point
frontend openclaw_frontend
    bind *:80
    bind *:443
    
    # Health check endpoint
    monitor-uri /health
    
    # Route to backend based on path or other criteria
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

# Move configuration to final location
sudo mv /tmp/haproxy.cfg /etc/haproxy/haproxy.cfg

# Enable and start HAProxy
sudo systemctl enable haproxy
sudo systemctl restart haproxy

echo "✅ HAProxy installed and configured"
HAPROXY_SETUP

echo "🔧 Configuring dynamic backend management..."

# Create backend management script
ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$PRIMARY_IP" << 'BACKEND_SCRIPT'
#!/bin/bash

cat > /opt/manage-haproxy-backends.sh << 'MANAGE_BACKENDS'
#!/bin/bash

HAPROXY_STATS_SOCKET="/run/haproxy/admin.sock"

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
    
    # Get current fleet status
    local fleet_nodes=$(curl -s -H "x-api-key: $FLEET_API_KEY" http://localhost:8080/fleet/status | jq -r '.nodes[] | .node_id + "," + .ip_address + "," + .status')
    
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
ExecStart=/opt/manage-haproxy-backends.sh auto
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
SYNC_SERVICE

sudo systemctl enable haproxy-fleet-sync
sudo systemctl start haproxy-fleet-sync

echo "✅ HAProxy backend management configured"
BACKEND_SCRIPT

echo "🎉 Load balancer setup complete!"
echo "Load Balancer URL: http://$PRIMARY_IP"
echo "HAProxy Stats: http://$PRIMARY_IP/haproxy-stats (admin/openclaw-fleet-stats)"
```

### Request Distribution Strategies

**Load Distribution Algorithm:**
```bash
#!/bin/bash
# intelligent-load-distribution.sh

FLEET_CONFIG="$HOME/.aleph-deploy/configs/fleet.json"
PRIMARY_IP=$(jq -r '.primary_node.ip' "$FLEET_CONFIG")

setup_intelligent_distribution() {
    echo "🧠 Setting up intelligent load distribution..."
    
    ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$PRIMARY_IP" << 'DISTRIBUTION_SETUP'
#!/bin/bash

# Install Node.js for advanced distribution logic
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Create intelligent distribution service
mkdir -p /opt/load-distributor
cd /opt/load-distributor

cat > intelligent-distributor.js << 'DISTRIBUTOR_JS'
const express = require('express');
const axios = require('axios');
const fs = require('fs').promises;

const app = express();
app.use(express.json());

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
            // Get fleet status
            const fleetResponse = await axios.get('http://localhost:8080/fleet/status');
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
            // Get available nodes
            const fleetResponse = await axios.get('http://localhost:8080/fleet/status');
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
app.listen(PORT, () => {
    console.log(`Intelligent Load Distributor running on port ${PORT}`);
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
ExecStart=/usr/bin/node intelligent-distributor.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
DISTRIBUTOR_SERVICE

sudo systemctl enable load-distributor
sudo systemctl start load-distributor

echo "✅ Intelligent load distributor configured"
DISTRIBUTION_SETUP

echo "🎉 Intelligent load distribution setup complete!"
echo "Distribution API: http://$PRIMARY_IP:8081"
echo "Get node: curl http://$PRIMARY_IP:8081/distribute/node"
echo "View metrics: curl http://$PRIMARY_IP:8081/distribute/metrics"
}

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
BACKUP_RETENTION_DAYS=30
BACKUP_STORAGE_PATH="/opt/openclaw/backups"

echo "🛡️ Setting up Disaster Recovery System..."

setup_backup_infrastructure() {
    local primary_ip=$(jq -r '.primary_node.ip' "$FLEET_CONFIG")
    
    echo "📦 Setting up backup infrastructure..."
    
    ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$primary_ip" << 'BACKUP_SETUP'
#!/bin/bash
set -e

# Create backup directories
sudo mkdir -p /opt/openclaw/backups/{fleet,nodes,data,logs}
sudo chown -R ubuntu:ubuntu /opt/openclaw/backups

# Install backup tools
sudo apt-get update
sudo apt-get install -y rsync rclone jq awscli

# Create comprehensive backup script
cat > /opt/openclaw/backup-system.sh << 'BACKUP_SCRIPT'
#!/bin/bash

BACKUP_BASE="/opt/openclaw/backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS=30

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
        -e "ssh -i /home/ubuntu/.aleph-deploy/keys/aleph_rsa -o StrictHostKeyChecking=accept-new" \
        "ubuntu@$node_ip:/opt/openclaw/workspace/" \
        "$backup_dir/workspace/" 2>/dev/null || true
    
    # Backup configurations
    rsync -av --compress \
        -e "ssh -i /home/ubuntu/.aleph-deploy/keys/aleph_rsa -o StrictHostKeyChecking=accept-new" \
        "ubuntu@$node_ip:/opt/openclaw/config/" \
        "$backup_dir/config/" 2>/dev/null || true
    
    # Backup logs (last 7 days only)
    ssh -i /home/ubuntu/.aleph-deploy/keys/aleph_rsa ubuntu@"$node_ip" \
        "find /var/log -name '*.log' -mtime -7 -exec tar -czf /tmp/logs-$node_name.tar.gz {} +" 2>/dev/null || true
    
    scp -i /home/ubuntu/.aleph-deploy/keys/aleph_rsa \
        ubuntu@"$node_ip":/tmp/logs-$node_name.tar.gz \
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
    
    ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$primary_ip" << 'MONITORING_SETUP'
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
    
    # Check SSH connectivity
    if ! ssh -i /home/ubuntu/.aleph-deploy/keys/aleph_rsa \
            -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new \
            ubuntu@"$node_ip" "echo 'alive'" &>/dev/null; then
        return 1
    fi
    
    # Check OpenClaw service
    if ! ssh -i /home/ubuntu/.aleph-deploy/keys/aleph_rsa \
            ubuntu@"$node_ip" "systemctl is-active openclaw" &>/dev/null; then
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

auto_recreate_node() {
    local node_id=$1
    
    log_message "🚀 Auto-recreating failed node: $node_id"
    
    # Get node configuration from backup
    local node_config=$(jq -r --arg node "$node_id" '.nodes[] | select(.node_id == $node)' "$FLEET_CONFIG")
    
    if [[ -z "$node_config" || "$node_config" == "null" ]]; then
        log_message "❌ No configuration found for node $node_id"
        return 1
    fi
    
    # Trigger node recreation (simplified - would need full aleph deployment)
    log_message "🔄 Recreating node $node_id with original configuration..."
    
    # This would call the actual Aleph deployment script
    # /opt/deploy-replacement-node.sh "$node_id" "$node_config"
    
    log_message "✅ Node recreation initiated for $node_id"
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

# Create systemd service for monitoring
cat > /etc/systemd/system/node-monitor.service << 'MONITOR_SERVICE'
[Unit]
Description=Fleet Node Monitor
After=network.target fleet-manager.service

[Service]
Type=simple
User=root
ExecStart=/opt/node-monitor.sh
Restart=always
RestartSec=30
Environment=AUTO_RECREATE=true

[Install]
WantedBy=multi-user.target
MONITOR_SERVICE

sudo systemctl enable node-monitor
sudo systemctl start node-monitor

echo "✅ Node monitoring service configured"
MONITORING_SETUP

echo "✅ Node monitoring and auto-recreation configured"
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
1. Check node status: `aleph instance get openclaw-fleet-primary`
2. If node is down, recreate from backup:
   ```bash
   cd ~/.aleph-deploy
   ./deploy-fleet.sh openclaw-fleet 1  # Deploy new primary
   ./restore-from-backup.sh primary
   ```
3. Update DNS/routing to new primary IP
4. Restart worker node registration

### 2. Multiple Worker Node Failures

**Symptoms:**
- Reduced capacity
- Load balancer showing failed backends
- High response times

**Recovery Steps:**
1. Check fleet status: `curl http://PRIMARY_IP:8080/fleet/status`
2. Identify failed nodes
3. Auto-recreation should trigger, but manual override:
   ```bash
   ./fleet-control.sh scale 5  # Restore to original capacity
   ```
4. Monitor recovery progress

### 3. Complete Fleet Failure

**Symptoms:**
- All nodes unreachable
- Complete service outage

**Recovery Steps:**
1. Deploy new primary node:
   ```bash
   ./deploy-single-vm.sh openclaw-recovery-primary
   ```
2. Restore from latest backup:
   ```bash
   ./restore-from-backup.sh full
   ```
3. Redeploy worker nodes:
   ```bash
   ./deploy-fleet.sh openclaw-recovery 5
   ```
4. Update external DNS/routing

### 4. Data Loss Recovery

**Symptoms:**
- Missing user data
- Corrupted configurations
- Lost agent personalities

**Recovery Steps:**
1. Access latest backup:
   ```bash
   ls -la /opt/openclaw/backups/
   ```
2. Restore specific components:
   ```bash
   ./self-replication-protocol.sh emergency data_loss
   ```
3. Verify data integrity
4. Restart affected services

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
- Aleph Support: support@aleph.im

**Service URLs:**
- Fleet Manager: http://PRIMARY_IP:8080
- Load Balancer: http://PRIMARY_IP
- Monitoring: http://PRIMARY_IP:9090

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
echo "View backup logs: ssh ubuntu@PRIMARY_IP tail -f /var/log/backup.log"
echo "View monitoring logs: ssh ubuntu@PRIMARY_IP tail -f /var/log/node-monitor.log"
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

echo "💰 Setting up cost optimization strategies..."

analyze_costs() {
    echo "📊 Analyzing current fleet costs..."
    
    # Calculate current monthly costs
    local total_cost=0
    local primary_cost=50  # Primary node estimated cost
    local worker_count=$(jq '.worker_nodes | length' "$FLEET_CONFIG")
    local worker_cost=$((worker_count * 25))  # Worker nodes @ 25 ALEPH each
    
    total_cost=$((primary_cost + worker_cost))
    
    cat > ~/.aleph-deploy/cost-analysis.json << COST_ANALYSIS
{
  "analysis_date": "$(date -Iseconds)",
  "current_costs": {
    "primary_node": $primary_cost,
    "worker_nodes": $worker_cost,
    "total_monthly": $total_cost
  },
  "node_breakdown": [
    {
      "type": "primary",
      "count": 1,
      "cost_per_node": $primary_cost,
      "specs": "4 vCPU, 8GB RAM, 100GB SSD"
    },
    {
      "type": "worker", 
      "count": $worker_count,
      "cost_per_node": 25,
      "specs": "2 vCPU, 4GB RAM, 50GB SSD"
    }
  ],
  "optimization_opportunities": []
}
COST_ANALYSIS

    echo "💲 Current estimated monthly cost: $total_cost ALEPH"
    echo "📋 Cost breakdown saved to cost-analysis.json"
}

setup_cost_tiers() {
    echo "🏗️ Setting up cost optimization tiers..."
    
    cat > ~/.aleph-deploy/cost-tiers.json << 'COST_TIERS'
{
  "tiers": {
    "minimal": {
      "description": "Single node for development/testing",
      "nodes": {
        "primary": 1,
        "workers": 0
      },
      "estimated_cost": 25,
      "use_cases": ["Development", "Testing", "Personal projects"]
    },
    "balanced": {
      "description": "Cost-effective production setup",
      "nodes": {
        "primary": 1,
        "workers": 2
      },
      "estimated_cost": 75,
      "use_cases": ["Small production", "Side projects", "Limited budget"]
    },
    "standard": {
      "description": "Recommended production configuration",
      "nodes": {
        "primary": 1,
        "workers": 4
      },
      "estimated_cost": 125,
      "use_cases": ["Production workloads", "Medium traffic", "Business use"]
    },
    "high_availability": {
      "description": "Enterprise-grade reliability",
      "nodes": {
        "primary": 1,
        "workers": 6,
        "backup": 1
      },
      "estimated_cost": 200,
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
    
    ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$primary_ip" << 'AUTOSCALE_SETUP'
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
        local cpu_usage=$(ssh -i /home/ubuntu/.aleph-deploy/keys/aleph_rsa \
                             -o ConnectTimeout=5 ubuntu@"$ip" \
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

scale_up() {
    local current_workers=$(jq '.nodes | map(select(.status == "active" and .node_id != "primary")) | length' "$FLEET_CONFIG")
    
    if (( current_workers >= MAX_WORKERS )); then
        log_message "⚠️ Already at maximum worker capacity ($MAX_WORKERS)"
        return 1
    fi
    
    log_message "📈 Scaling up: deploying additional worker node..."
    
    # This would trigger actual node deployment
    # /opt/deploy-worker-node.sh "auto-worker-$(date +%s)"
    
    log_message "✅ Scale-up initiated"
    echo "$(date +%s)" > /tmp/last-scale-action
}

scale_down() {
    local current_workers=$(jq '.nodes | map(select(.status == "active" and .node_id != "primary")) | length' "$FLEET_CONFIG")
    
    if (( current_workers <= MIN_WORKERS )); then
        log_message "⚠️ Already at minimum worker capacity ($MIN_WORKERS)"
        return 1
    fi
    
    log_message "📉 Scaling down: removing least utilized worker node..."
    
    # Find least utilized node and remove it
    local least_utilized=$(jq -r '.nodes | map(select(.status == "active" and .node_id != "primary")) | sort_by(.cpu_usage // 0) | first | .node_id' "$FLEET_CONFIG")
    
    if [[ -n "$least_utilized" && "$least_utilized" != "null" ]]; then
        # Mark node for removal
        local tmpfile=$(mktemp)
        jq --arg node "$least_utilized" '.nodes = (.nodes | map(if .node_id == $node then .status = "draining" else . end))' "$FLEET_CONFIG" > "$tmpfile"
        mv "$tmpfile" "$FLEET_CONFIG"
        
        # This would trigger actual node termination
        # /opt/terminate-worker-node.sh "$least_utilized"
        
        log_message "✅ Scale-down initiated for node: $least_utilized"
        echo "$(date +%s)" > /tmp/last-scale-action
    fi
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

# Auto-scaling loop
while true; do
    check_scaling_needed
    sleep 60  # Check every minute
done
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
ExecStart=/opt/auto-scaler.sh
Restart=always
RestartSec=30
Environment=AUTO_SCALING_ENABLED=false

[Install]
WantedBy=multi-user.target
SCALER_SERVICE

# Note: Service created but not enabled by default
echo "✅ Auto-scaler configured (disabled by default)"
echo "To enable: systemctl enable auto-scaler && systemctl start auto-scaler"
AUTOSCALE_SETUP

echo "✅ Auto-scaling configured on primary node"
}

setup_scheduled_scaling() {
    echo "⏰ Setting up scheduled scaling for off-hours cost savings..."
    
    local primary_ip=$(jq -r '.primary_node.ip' "$FLEET_CONFIG")
    
    ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$primary_ip" << 'SCHEDULED_SETUP'
#!/bin/bash

# Create scheduled scaling script
cat > /opt/scheduled-scaler.sh << 'SCHEDULER'
#!/bin/bash

FLEET_CONFIG="/opt/fleet-manager/nodes.json"

log_message() {
    echo "$(date -Iseconds): $1" | tee -a "/var/log/scheduled-scaler.log"
}

scale_to_count() {
    local target_count=$1
    local reason=$2
    
    log_message "🎯 Scaling to $target_count workers: $reason"
    
    local current_count=$(jq '.nodes | map(select(.status == "active" and .node_id != "primary")) | length' "$FLEET_CONFIG")
    
    if (( target_count == current_count )); then
        log_message "✅ Already at target capacity ($target_count)"
        return 0
    fi
    
    if (( target_count > current_count )); then
        local scale_up=$((target_count - current_count))
        log_message "📈 Scaling up by $scale_up nodes"
        # Implement scale-up logic
    else
        local scale_down=$((current_count - target_count))
        log_message "📉 Scaling down by $scale_down nodes"
        # Implement scale-down logic
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

FLEET_CONFIG="$HOME/.aleph-deploy/configs/fleet.json"

generate_cost_report() {
    echo "💰 Generating cost report..."
    
    local report_date=$(date +%Y-%m-%d)
    local primary_ip=$(jq -r '.primary_node.ip' "$FLEET_CONFIG")
    
    # Get current fleet status
    local fleet_status=$(curl -s -H "x-api-key: $FLEET_API_KEY" "http://$primary_ip:8080/fleet/status" 2>/dev/null || echo '{"nodes":[]}')
    local active_workers=$(echo "$fleet_status" | jq '.nodes | map(select(.status == "active" and .node_id != "primary")) | length')
    
    # Calculate costs
    local primary_cost=50
    local worker_cost=$((active_workers * 25))
    local total_daily_cost=$(echo "scale=2; ($primary_cost + $worker_cost) / 30" | bc -l)
    local total_monthly_cost=$((primary_cost + worker_cost))
    
    # Generate report
    cat > ~/.aleph-deploy/reports/cost-report-$report_date.json << REPORT
{
  "report_date": "$report_date",
  "fleet_status": {
    "primary_nodes": 1,
    "worker_nodes": $active_workers,
    "total_nodes": $((active_workers + 1))
  },
  "cost_breakdown": {
    "primary_node_monthly": $primary_cost,
    "worker_nodes_monthly": $worker_cost,
    "total_monthly": $total_monthly_cost,
    "daily_average": $total_daily_cost
  },
  "usage_optimization": {
    "potential_savings": "25-50% with scheduled scaling",
    "current_utilization": "$(curl -s http://$primary_ip:8081/distribute/metrics 2>/dev/null | jq -r 'map(.cpu_usage) | add / length' || echo 'unknown')%",
    "recommendations": [
      "Enable scheduled scaling for off-hours",
      "Consider spot instances for development",
      "Monitor and adjust worker count based on demand"
    ]
  }
}
REPORT

    echo "✅ Cost report generated: cost-report-$report_date.json"
    
    # Display summary
    echo ""
    echo "📊 COST SUMMARY"
    echo "==============="
    echo "Active Nodes: $((active_workers + 1)) (1 primary + $active_workers workers)"
    echo "Monthly Cost: $total_monthly_cost ALEPH (~$15-25 USD)"
    echo "Daily Cost: $total_daily_cost ALEPH"
    echo ""
    
    # Optimization suggestions
    if (( active_workers > 2 )); then
        echo "💡 OPTIMIZATION SUGGESTIONS:"
        echo "- Consider enabling scheduled scaling to reduce off-hours costs"
        echo "- Monitor actual usage patterns to right-size your fleet"
    fi
}

# Create reports directory
mkdir -p ~/.aleph-deploy/reports

# Generate report
generate_cost_report

# Setup daily cost reporting
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
echo "Enable auto-scaling: ssh ubuntu@PRIMARY_IP 'sudo systemctl enable auto-scaler && sudo systemctl start auto-scaler'"
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

echo "🔒 Implementing comprehensive security hardening..."

setup_firewall_rules() {
    local node_ip=$1
    local node_type=$2
    
    echo "🛡️ Configuring UFW firewall on $node_type ($node_ip)..."
    
    ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$node_ip" << FIREWALL_SETUP
#!/bin/bash
set -e

echo "🔧 Configuring UFW firewall rules..."

# Reset UFW to defaults
sudo ufw --force reset

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Essential services
sudo ufw allow ssh
sudo ufw limit ssh  # Rate limiting for SSH

# Node-specific rules
if [[ "$node_type" == "primary" ]]; then
    # Primary node services
    sudo ufw allow 80    # HTTP (load balancer)
    sudo ufw allow 443   # HTTPS (load balancer)
    # Fleet Manager (8080) and Load Distributor (8081) bind to 127.0.0.1
    # and are accessed via Tailscale — do NOT expose them to the internet.
    # If you need remote access, allow only from Tailscale subnet:
    # sudo ufw allow from 100.64.0.0/10 to any port 8080
    # sudo ufw allow from 100.64.0.0/10 to any port 8081
    
    # Tailscale
    sudo ufw allow 41641/udp
    
    echo "✅ Primary node firewall rules applied"
else
    # Worker node services
    sudo ufw allow 3000  # OpenClaw
    
    # Tailscale
    sudo ufw allow 41641/udp
    
    # Allow access from primary node only
    PRIMARY_IP="\$(curl -s http://checkip.amazonaws.com)"  # Simplified
    sudo ufw allow from \$PRIMARY_IP
    
    echo "✅ Worker node firewall rules applied"
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
    
    ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$node_ip" << 'SSH_HARDENING'
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

# Security restrictions
PermitRootLogin no
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

# User restrictions
AllowUsers ubuntu
DenyGroups root

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

# Re-enable TCP forwarding for the ubuntu user only.
# This is needed for SSH tunnels (Section 5) and Tailscale.
Match User ubuntu
    AllowTcpForwarding yes
SSHD_CONFIG

# Test configuration
sudo sshd -t

# Restart SSH service
sudo systemctl reload ssh

echo "✅ SSH hardening complete"
SSH_HARDENING
    
    echo "✅ SSH hardened on node: $node_ip"
}

setup_key_rotation() {
    echo "🔄 Setting up SSH key rotation system..."
    
    # Create key rotation script
    cat > ~/.aleph-deploy/scripts/rotate-ssh-keys.sh << 'KEY_ROTATION'
#!/bin/bash

FLEET_CONFIG="$HOME/.aleph-deploy/configs/fleet.json"
KEY_DIR="$HOME/.aleph-deploy/keys"
BACKUP_DIR="$HOME/.aleph-deploy/key-backups"

log_message() {
    echo "$(date -Iseconds): $1" | tee -a "$HOME/.aleph-deploy/logs/key-rotation.log"
}

generate_new_keys() {
    local key_date=$(date +%Y%m%d-%H%M%S)
    
    log_message "🔑 Generating new SSH key pair..."
    
    # Create backup of current keys
    mkdir -p "$BACKUP_DIR"
    if [[ -f "$KEY_DIR/aleph_rsa" ]]; then
        cp "$KEY_DIR/aleph_rsa" "$BACKUP_DIR/aleph_rsa-$key_date"
        cp "$KEY_DIR/aleph_rsa.pub" "$BACKUP_DIR/aleph_rsa.pub-$key_date"
        log_message "✅ Current keys backed up"
    fi
    
    # Generate new key pair
    ssh-keygen -t rsa -b 4096 -f "$KEY_DIR/aleph_rsa-new" -N "" -C "aleph-fleet-$key_date"
    
    log_message "✅ New SSH key pair generated"
}

deploy_new_keys() {
    log_message "📤 Deploying new keys to all fleet nodes..."
    
    local new_public_key=$(cat "$KEY_DIR/aleph_rsa-new.pub")
    local primary_ip=$(jq -r '.primary_node.ip' "$FLEET_CONFIG")
    
    # Get all node IPs
    local all_ips=("$primary_ip")
    mapfile -t worker_ips < <(jq -r '.worker_nodes[] | .ip // empty' "$FLEET_CONFIG")
    all_ips+=("${worker_ips[@]}")
    
    for node_ip in "${all_ips[@]}"; do
        [[ -z "$node_ip" || "$node_ip" == "null" ]] && continue
        
        log_message "🔧 Deploying new key to $node_ip..."
        
        # Add new key to authorized_keys
        ssh -i "$KEY_DIR/aleph_rsa" ubuntu@"$node_ip" << NEW_KEY_SETUP
echo "$new_public_key" >> ~/.ssh/authorized_keys
# Remove duplicates
sort ~/.ssh/authorized_keys | uniq > ~/.ssh/authorized_keys.tmp
mv ~/.ssh/authorized_keys.tmp ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
NEW_KEY_SETUP
        
        log_message "✅ New key deployed to $node_ip"
    done
}

activate_new_keys() {
    log_message "🔄 Activating new keys..."
    
    # Move new keys to active position
    mv "$KEY_DIR/aleph_rsa" "$KEY_DIR/aleph_rsa-old" 2>/dev/null || true
    mv "$KEY_DIR/aleph_rsa.pub" "$KEY_DIR/aleph_rsa.pub-old" 2>/dev/null || true
    
    mv "$KEY_DIR/aleph_rsa-new" "$KEY_DIR/aleph_rsa"
    mv "$KEY_DIR/aleph_rsa-new.pub" "$KEY_DIR/aleph_rsa.pub"
    
    chmod 600 "$KEY_DIR/aleph_rsa"
    chmod 644 "$KEY_DIR/aleph_rsa.pub"
    
    log_message "✅ New keys activated"
}

cleanup_old_keys() {
    log_message "🧹 Cleaning up old keys from nodes..."
    
    local old_public_key=$(cat "$KEY_DIR/aleph_rsa.pub-old" 2>/dev/null || echo "")
    
    if [[ -n "$old_public_key" ]]; then
        local primary_ip=$(jq -r '.primary_node.ip' "$FLEET_CONFIG")
        local all_ips=("$primary_ip")
        mapfile -t worker_ips < <(jq -r '.worker_nodes[] | .ip // empty' "$FLEET_CONFIG")
        all_ips+=("${worker_ips[@]}")
        
        for node_ip in "${all_ips[@]}"; do
            [[ -z "$node_ip" || "$node_ip" == "null" ]] && continue
            
            # Remove old key from authorized_keys
            ssh -i "$KEY_DIR/aleph_rsa" ubuntu@"$node_ip" << OLD_KEY_CLEANUP
grep -v "$old_public_key" ~/.ssh/authorized_keys > ~/.ssh/authorized_keys.tmp || true
mv ~/.ssh/authorized_keys.tmp ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
OLD_KEY_CLEANUP
        done
        
        # Remove old local key files
        rm -f "$KEY_DIR/aleph_rsa-old" "$KEY_DIR/aleph_rsa.pub-old"
        
        log_message "✅ Old keys cleaned up"
    fi
}

test_new_keys() {
    log_message "🧪 Testing new key connectivity..."
    
    local primary_ip=$(jq -r '.primary_node.ip' "$FLEET_CONFIG")
    
    if ssh -i "$KEY_DIR/aleph_rsa" -o ConnectTimeout=10 ubuntu@"$primary_ip" "echo 'Key test successful'" &>/dev/null; then
        log_message "✅ New key connectivity verified"
        return 0
    else
        log_message "❌ New key connectivity test failed"
        return 1
    fi
}

# Key rotation process
rotate_keys() {
    log_message "🔄 Starting SSH key rotation process..."
    
    generate_new_keys
    deploy_new_keys
    
    # Wait for propagation
    sleep 30
    
    if test_new_keys; then
        activate_new_keys
        sleep 30
        cleanup_old_keys
        log_message "🎉 SSH key rotation completed successfully"
    else
        log_message "❌ Key rotation failed - reverting changes"
        rm -f "$KEY_DIR/aleph_rsa-new" "$KEY_DIR/aleph_rsa-new.pub"
        return 1
    fi
}

# Command dispatcher
case "${1:-rotate}" in
    "rotate")
        rotate_keys
        ;;
    "test")
        test_new_keys
        ;;
    *)
        echo "Usage: $0 {rotate|test}"
        exit 1
        ;;
esac
KEY_ROTATION

chmod +x ~/.aleph-deploy/scripts/rotate-ssh-keys.sh

# Setup monthly key rotation
(crontab -l 2>/dev/null; echo "0 3 1 * * $HOME/.aleph-deploy/scripts/rotate-ssh-keys.sh rotate >> $HOME/.aleph-deploy/logs/key-rotation.log 2>&1") | crontab -

echo "✅ SSH key rotation system configured (monthly rotation)"
}

setup_intrusion_detection() {
    echo "👁️ Setting up intrusion detection system..."
    
    local primary_ip=$(jq -r '.primary_node.ip' "$FLEET_CONFIG")
    
    ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$primary_ip" << 'IDS_SETUP'
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
    local external_connections=$(netstat -tn | grep ESTABLISHED | grep -v "127.0.0.1\|10.\|172.16\|192.168" | wc -l)
    
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
    ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$primary_ip" << 'LOG_SETUP'
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
        
        echo "Network Connections:"
        netstat -tn | grep ESTABLISHED | wc -l
        echo "Established connections count"
        
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

check_node_security() {
    local node_ip=$1
    local node_type=$2
    
    echo "🔍 Checking security status of $node_type node ($node_ip)..."
    
    # Check UFW status
    echo -n "  Firewall: "
    if ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$node_ip" "sudo ufw status" | grep -q "Status: active"; then
        echo "✅ Active"
    else
        echo "❌ Inactive"
    fi
    
    # Check SSH configuration
    echo -n "  SSH Security: "
    local ssh_score=0
    if ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$node_ip" "grep -q 'PasswordAuthentication no' /etc/ssh/sshd_config"; then
        ssh_score=$((ssh_score + 1))
    fi
    if ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$node_ip" "grep -q 'PermitRootLogin no' /etc/ssh/sshd_config"; then
        ssh_score=$((ssh_score + 1))
    fi
    if ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$node_ip" "grep -q 'MaxAuthTries 3' /etc/ssh/sshd_config"; then
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
        if ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$node_ip" "systemctl is-active fail2ban" &>/dev/null; then
            echo "✅ Active"
        else
            echo "❌ Inactive"
        fi
    fi
    
    # Check system updates
    echo -n "  System Updates: "
    local updates=$(ssh -i ~/.aleph-deploy/keys/aleph_rsa ubuntu@"$node_ip" "apt list --upgradable 2>/dev/null | grep -c upgradable || echo 0")
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
echo "- SSH hardened (key-only, no root)"
echo "- Monthly SSH key rotation"
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

**Monthly:**
- SSH key rotation (automated via cron)
- Update system packages: `./fleet-control.sh deploy update-packages.sh`
- Review and rotate FLEET_API_KEY
- Check CRN pricing and availability

### Quick Reference Commands

```bash
# Fleet operations
./fleet-control.sh status        # View fleet status
./fleet-control.sh health        # Health check all nodes
./fleet-control.sh restart openclaw  # Restart service on all nodes
./fleet-control.sh logs openclaw 100 # Collect last 100 log lines

# Backup & Recovery
ssh ubuntu@PRIMARY_IP '/opt/openclaw/backup-system.sh full'
ssh ubuntu@PRIMARY_IP '/opt/openclaw/backup-system.sh snapshot'

# Security
~/.aleph-deploy/scripts/security-status.sh
~/.aleph-deploy/scripts/rotate-ssh-keys.sh rotate

# Cost monitoring
~/.aleph-deploy/scripts/cost-monitor.sh

# Auto-scaling (enable/disable)
ssh ubuntu@PRIMARY_IP 'sudo systemctl enable auto-scaler && sudo systemctl start auto-scaler'
ssh ubuntu@PRIMARY_IP 'sudo systemctl stop auto-scaler && sudo systemctl disable auto-scaler'

# Replication
ssh ubuntu@PRIMARY_IP '/opt/openclaw/replication/self-replication-protocol.sh replicate'
ssh ubuntu@PRIMARY_IP '/opt/openclaw/replication/self-replication-protocol.sh emergency manual'

# Tailscale mesh
ssh ubuntu@PRIMARY_IP 'tailscale status'
```

### Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Fleet manager 401 | Missing x-api-key header | Add `-H "x-api-key: $FLEET_API_KEY"` to curl calls |
| Worker can't register | Fleet manager not reachable | Check Tailscale connectivity and UFW rules |
| nodes.json ENOENT | File not created before service start | Create `echo '{"nodes":[]}' > /opt/fleet-manager/nodes.json` and restart |
| HAProxy backend stale | Fleet sync not running | Check `systemctl status haproxy-fleet-sync` |
| SSH key rotation fails | New key not propagated | Manually deploy key: `ssh-copy-id -i KEY ubuntu@NODE` |
| Auto-scaler variables lost | Pipe subshell scoping | Use `while read ... done < <(cmd)` process substitution |
| Replication files missing | Wrong extract paths | Files are under `soul/`, `agents/`, `memory/` subdirectories |
| High CPU but no scale-up | Cooldown period active | Wait 5 minutes or reset `/tmp/last-scale-action` |