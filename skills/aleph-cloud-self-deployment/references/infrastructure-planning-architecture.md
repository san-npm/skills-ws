## Contents

- Infrastructure Planning & Architecture
- Aleph Cloud Architecture Overview
- CRN Selection Strategy

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

**Resource Planning Matrix.** Aleph instances are sized in **compute units** (1 CU ≈ 1 vCPU + 2 GiB RAM); you can override with explicit `--vcpus`/`--memory`/`--rootfs-size`. Persistent/confidential VMs run on a specific **CRN** (Compute Resource Node) that you choose by URL or hash.

```yaml
Node Types:
  Orchestrator (Primary):
    Tier: 4 vCPU / 8 GiB RAM / 80–100 GiB rootfs  (≈ 4 compute units)
    CRN: a high-uptime CRN you have verified (see "CRN selection" below)
    Role: fleet manager, HAProxy, backup coordinator, SSH gateway

  Compute Nodes (Workers):
    Tier: 2 vCPU / 4 GiB RAM / 40–50 GiB rootfs  (≈ 2 compute units)
    CRN: spread across 2–3 distinct CRNs for fault isolation
    Role: OpenClaw agent runtime, task execution

  Backup Node (Optional):
    Tier: 1 vCPU / 2 GiB RAM / 20 GiB rootfs  (≈ 1 compute unit)
    CRN: a *different* CRN/region than the primary, for redundancy
    Role: off-node backup target, emergency recovery
```

**Cost model (read this — it changed).** Aleph supports two payment modes, selected with `--payment-type`:

- **`hold`** — lock (don't spend) a quantity of $ALEPH tokens for as long as the VM runs; tokens are released on `delete`. No ongoing burn.
- **`superfluid` / `credit`** — pay-as-you-go streaming (per second) priced in **USD**, settled in $ALEPH or credits. This is the model most users want for fleets.

Do **not** hardcode "ALEPH/month" figures — the token price floats and tiers change. Always read live pricing with the CLI:

```bash
aleph pricing instance                 # all tiers, all payment types
aleph pricing instance --tier 1 --json # one tier, machine-readable
aleph pricing instance --payment-type credit
```

As of **Jun 2026**, pay-as-you-go instance pricing is roughly (confirm with `aleph pricing instance`, do not quote these as fixed):

| Tier | vCPU / RAM / rootfs | Approx. PAYG (USD/hr) | Approx. (USD/mo, 730h) |
|------|---------------------|-----------------------|------------------------|
| 1    | 1 / 2 GiB / 20 GiB  | ~$0.0036              | ~$2.6                  |
| 2    | 2 / 4 GiB / 40 GiB  | ~$0.0066              | ~$4.8                  |
| 3    | 4 / 8 GiB / 80 GiB  | ~$0.0132              | ~$9.6                  |

> These are dated examples for planning only. Confirm current numbers at the Aleph console (https://app.aleph.cloud) or via `aleph pricing instance` before budgeting. A 1 primary + 4 worker fleet on these tiers lands around $30–40/mo PAYG as of Jun 2026 — but verify.

### CRN Selection Strategy

A CRN is the physical node that hosts your persistent/confidential VM. Pick CRNs by **compute availability, payment-mode support, terms acceptance, region, and (for confidential VMs) SEV support** — not by hitting an Aleph API messages endpoint. Discover and inspect CRNs with the CLI rather than guessing URLs:

```bash
#!/bin/bash
# crn-discovery.sh — list and shortlist real CRNs for instance deployment.
set -euo pipefail

echo "=== Available Compute Resource Nodes ==="
# `aleph instance` deployments resolve CRNs from the network; the node index
# is also browsable at https://app.aleph.cloud (Console > Compute) and
# https://docs.aleph.cloud/nodes/compute/ . Prefer the console for capacity,
# version, and reward/uptime score; use --crn-url / --crn-hash from there.

# When creating an instance you may omit --crn-url to let the CLI auto-select
# a CRN, or pin one explicitly. For confidential or Pay-As-You-Go instances a
# CRN is REQUIRED, and you must accept its Terms & Conditions:
#   aleph instance create ... --crn-url "https://<crn-host>" --crn-auto-tac

# Sanity-check a candidate CRN's compute API (this is the CRN's own
# /about endpoint — NOT the Aleph message API):
check_crn() {
    local crn_url="$1" crn_name="$2"
    echo "=== $crn_name ($crn_url) ==="
    echo -n "  Reachable: "
    if curl -fsS --max-time 8 "$crn_url/about/usage/system" >/dev/null 2>&1; then
        echo "yes"
        echo "  Capacity/usage:"
        curl -fsS --max-time 8 "$crn_url/about/usage/system" \
            | jq '{cpu: .cpu, mem: .mem, period}' 2>/dev/null || true
    else
        echo "NO — skip this CRN"
        return 1
    fi
    # Confidential support advertised under /about/capability on SEV-capable CRNs
    echo -n "  Confidential (SEV) capable: "
    curl -fsS --max-time 8 "$crn_url/about/capability" 2>/dev/null \
        | jq -r '.confidential // "unknown"' 2>/dev/null || echo "unknown"
    echo "------------------------"
}

# Replace these with real CRN hosts from https://app.aleph.cloud (Console).
# Do NOT use unrelated services (e.g. storage gateways) as CRNs — they cannot
# host an Aleph instance and `aleph instance create` will fail against them.
# check_crn "https://<crn-1-host>" "CRN 1"
# check_crn "https://<crn-2-host>" "CRN 2"

echo "=== SELECTION GUIDANCE ==="
echo "Primary : highest-uptime CRN with spare capacity and recent node version"
echo "Workers : 2-3 DISTINCT CRNs/regions for fault isolation"
echo "Backup  : a CRN on a different operator/region than the primary"
```

---
