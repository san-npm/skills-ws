## Contents

- Emergency Response Procedures
- 1. Primary Node Failure
- 2. Multiple Worker Node Failures
- 3. Complete Fleet Failure
- 4. Data Loss Recovery

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
