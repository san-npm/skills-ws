## Contents

- Load Distribution & Orchestration
- Load Balancer Configuration
- Request Distribution Strategies

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
    # NOTE: the port MUST match the service actually exposed on the node: the
    # OpenClaw gateway's configured port (default 18789, loopback-bound until
    # you bind it to a reachable interface) or your own app's port.
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
    # Default port must match the service actually exposed on the worker (the
    # OpenClaw gateway's configured port, default 18789, or your own app).
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

# NOTE: collectNodeMetrics() returns randomized placeholders; see the Metrics note below.

# Execute setup
setup_intelligent_distribution
```

> **Metrics note.** `collectNodeMetrics()` above returns **randomized placeholder values** so the strategy code is runnable out of the box. For real distribution, replace it with actual per-node metrics, e.g. scrape `node_exporter`/cAdvisor over the Tailscale mesh, or have each worker POST CPU/mem/conn counts to the fleet manager. See the sibling `monitoring-observability` skill for a production metrics pipeline.

---
