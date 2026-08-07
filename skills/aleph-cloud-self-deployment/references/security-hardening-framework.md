## Contents

- Security Hardening Framework
- Comprehensive Security Configuration

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
    # Worker: NO public OpenClaw port. The gateway (default 18789, loopback-bound)
    # is reachable ONLY over Tailscale (handled by 'allow in on tailscale0');
    # HAProxy on the primary also reaches workers over the mesh. A public gateway
    # port on an agent that can execute actions is a critical exposure; never do it.
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
# fail2ban >= 0.10 merged the old standalone sshd-ddos filter into the sshd
# filter; "mode = aggressive" covers those patterns. A separate [sshd-ddos]
# jail would reference a missing filter and abort fail2ban startup entirely.
mode = aggressive
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600

# OpenClaw service protection. DISABLED by default: fail2ban refuses to start
# a jail whose logpath is missing, and OpenClaw does not create
# /var/log/openclaw/access.log out of the box. Enable only after the log file
# exists (touch it with correct ownership, or point logpath at a real log).
[openclaw]
enabled = false
port = 18789
filter = openclaw
logpath = /var/log/openclaw/access.log
maxretry = 10
bantime = 1800

# Fleet manager protection. DISABLED by default for the same reason: the fleet
# manager logs to journald via systemd, not to /var/log/fleet-manager.log.
# Enable after either forwarding its journal to that file (syslog rule) or
# switching this jail to "backend = systemd".
[fleet-manager]
enabled = false
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
