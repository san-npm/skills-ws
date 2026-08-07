## Quick Start — tested single-VM happy path

Do this end-to-end first; the fleet machinery below builds on it. Tear-down is included so you never leak a paid VM.

```bash
# 0. Prereqs (mid-2026): Python 3.10+, jq, an SSH client, and a funded Aleph
#    account. macOS: `brew install libsecp256k1`; Debian/Ubuntu:
#    `sudo apt-get install -y libsecp256k1-dev`.

# 1. Install the Python aleph-client CLI (PyPI, v1.9.x): the flag set below
#    targets this client, not the newer aleph-cli documented on docs.aleph.cloud
python3 -m pip install --user pipx && python3 -m pipx ensurepath   # if needed
pipx install aleph-client
aleph --version

# 2. Create or import an account, then check balance
aleph account create                      # interactive; or import an existing key:
# aleph account create --private-key "0xYOUR_PRIVATE_KEY"   # or --private-key-file PATH
aleph account address                      # your public address (fund it on the right chain)
aleph account balance                      # ALEPH balance / available credits

# 3. Generate an SSH key dedicated to Aleph VMs (ed25519 — modern, small, fast)
mkdir -p ~/.aleph-deploy/keys
ssh-keygen -t ed25519 -f ~/.aleph-deploy/keys/aleph_ed25519 -N "" -C "aleph-fleet-$(date +%Y%m%d)"

# 4. See live pricing, then create ONE pay-as-you-go instance (2 vCPU / 4 GiB / 40 GiB)
aleph pricing instance --payment-type credit
aleph instance create \
  --name openclaw-primary \
  --compute-units 2 \
  --rootfs-size 40960 \
  --ssh-pubkey-file ~/.aleph-deploy/keys/aleph_ed25519.pub \
  --payment-type credit \
  --payment-chain BASE \
  --crn-auto-tac
# The CLI prints the instance item-hash and (for PAYG/confidential) allocates it
# on a CRN, returning the assigned IPv6/IPv4. Save the item-hash it prints:
#   ITEM_HASH=<hash from CLI output>

# 5. Find the instance + its IP from authoritative CLI output (no fake `instance get`)
aleph instance list --json | jq '.[] | {name, item_hash, ipv4: .ipv4, ipv6: .ipv6}'
VM_IP=$(aleph instance list --json | jq -r '.[] | select(.name=="openclaw-primary") | (.ipv4 // .ipv6)' | head -1)

# 6. Verify SSH (accept-new = trust first key, reject changed keys = MITM protection)
ssh -i ~/.aleph-deploy/keys/aleph_ed25519 -o StrictHostKeyChecking=accept-new \
    root@"$VM_IP" "echo 'SSH OK'; cat /etc/os-release | grep PRETTY_NAME"
# Note: the default cloud user is image-dependent (often `root` on Aleph base
# images; `ubuntu` on some). Check with the command above and adjust below.

# 7. Tear down when done so you stop paying / release held tokens
aleph instance delete "$ITEM_HASH"     # irreversible for non-persistent volumes — see guardrails
```

> **Destructive-operation guardrail.** `aleph instance delete` is irreversible and **destroys non-persistent (rootfs/ephemeral) data**. Before any delete/scale-down/recreate: (1) `aleph instance list` and confirm the exact item-hash, (2) back up persistent data first, (3) require an explicit confirmation in scripts. A reusable confirm helper:
>
> ```bash
> confirm_destructive() {  # usage: confirm_destructive "<action>" "<target>"
>     echo "About to: $1 -> $2"
>     read -r -p "Type the target hash to confirm: " ans
>     [[ "$ans" == "$2" ]] || { echo "Aborted."; return 1; }
> }
> ```
