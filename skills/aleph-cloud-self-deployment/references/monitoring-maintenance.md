## Contents

- Monitoring & Maintenance
- Routine Maintenance Checklist
- Quick Reference Commands
- Troubleshooting

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
