---
name: aleph-cloud-self-deployment
description: "Deploy and operate VMs on Aleph Cloud with the aleph-client CLI — single node or multi-node fleets, Tailscale mesh, HAProxy distribution, backup/recovery, cost control, and security hardening. Use when deploying confidential/persistent VMs (e.g. an OpenClaw agent runtime) on Aleph Cloud, or building an Aleph node fleet."
---
# Aleph Cloud Self-Deployment: VM & Multi-Node Fleet Management

Framework for deploying and managing persistent/confidential VMs on Aleph Cloud's decentralized compute network using the official `aleph-client` CLI, with patterns for running an OpenClaw agent runtime across one or many nodes (Tailscale mesh, HAProxy distribution, pull-based backup, and hardening).

> **Verify before you ship.** Aleph CLI flags, OpenClaw install commands, and pricing change over time. This skill is current as of **Jun 2026**. Note: docs.aleph.cloud's CLI reference now documents a rewritten `aleph-cli` (installed via Homebrew, apt, or cargo) whose syntax differs from the Python `aleph-client` used throughout this skill; this skill targets the Python `aleph-client` (PyPI, v1.9.x). Authoritative sources, used throughout: the Aleph CLI command reference at https://docs.aleph.cloud/devhub/sdks-and-tools/aleph-cli/ (instance subcommands: https://docs.aleph.cloud/devhub/sdks-and-tools/aleph-cli/commands/instance.html), and OpenClaw docs at https://docs.openclaw.ai/. Run `aleph instance create --help` and `aleph pricing instance` to confirm current flags and prices on your machine.
>
> If you installed the rewritten `aleph-cli` from the docs instead of the Python `aleph-client`, translate commands: `aleph pricing instance` -> `aleph instance price` (`--size 2vcpu-4gb`, `--json`); `aleph account address` -> `aleph account show`; `aleph account create --private-key ...` -> `aleph account import <name> --private-key`; `instance create --name X --compute-units N --rootfs-size MIB` -> `instance create X --vcpus/--memory/--disk-size`; `--crn-url`/`--crn-auto-tac` -> `--crn-hash`. Run `aleph instance create --help` to see which client you have.

> **Sibling skills.** This skill focuses on Aleph-specific provisioning and fleet orchestration. For deep, vendor-neutral coverage prefer: `security-hardening` (SSH/firewall/CIS), `monitoring-observability` (metrics, alerting, log pipelines), and `docker-production` (Compose v2, image hygiene). Use those alongside this one rather than duplicating their depth here.

## Safety gate

Before executing commands or changing external systems, confirm scope, credentials, target environment, rollback, and required approval. Pin and verify third-party artifacts; never expose secrets to client code or logs.

## Reference guide

Read only the references needed for the current request:

- **Table of Contents**: [references/table-of-contents.md](references/table-of-contents.md)
- **Infrastructure Planning & Architecture**: [references/infrastructure-planning-architecture.md](references/infrastructure-planning-architecture.md)
- **Quick Start — tested single-VM happy path**: [references/quick-start-tested-single-vm-happy-path.md](references/quick-start-tested-single-vm-happy-path.md)
- **Single Node Deployment Foundation**: [references/single-node-deployment-foundation.md](references/single-node-deployment-foundation.md)
- **Multi-Node Fleet Management**: [references/multi-node-fleet-management.md](references/multi-node-fleet-management.md)
- **Auto-Provisioning Protocol (SRP)**: [references/auto-provisioning-protocol-srp.md](references/auto-provisioning-protocol-srp.md)
- **Inter-VM Communication Networks**: [references/inter-vm-communication-networks.md](references/inter-vm-communication-networks.md)
- **Load Distribution & Orchestration**: [references/load-distribution-orchestration.md](references/load-distribution-orchestration.md)
- **Disaster Recovery & Auto-Recreation**: [references/disaster-recovery-auto-recreation.md](references/disaster-recovery-auto-recreation.md)
- **Emergency Response Procedures**: [references/emergency-response-procedures.md](references/emergency-response-procedures.md)
- **Backup Verification**: [references/backup-verification.md](references/backup-verification.md)
- **Contact Information**: [references/contact-information.md](references/contact-information.md)
- **Post-Incident Procedures**: [references/post-incident-procedures.md](references/post-incident-procedures.md)
- **Cost Optimization Strategies**: [references/cost-optimization-strategies.md](references/cost-optimization-strategies.md)
- **Security Hardening Framework**: [references/security-hardening-framework.md](references/security-hardening-framework.md)
- **Monitoring & Maintenance**: [references/monitoring-maintenance.md](references/monitoring-maintenance.md)
