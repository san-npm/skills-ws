## 10. Essential Configuration

> These are **starting points for a self-hosted OLTP server on PostgreSQL 16/17/18-era with NVMe SSD, ~16GB RAM, 4 CPU** — not universal truths. Adjust for your reality:
> - **Storage:** the SSD `random_page_cost`/`effective_io_concurrency` below are wrong on spinning disks or throttled network/EBS volumes.
> - **Workload:** analytics/OLAP wants much larger `work_mem` and `max_wal_size` and fewer connections; high-write OLTP wants more aggressive autovacuum. Don't copy OLTP settings onto an analytics box.
> - **Managed services (RDS, Cloud SQL, Aurora, Supabase, Neon):** many of these are preset by the provider or not user-tunable — change them via the provider's parameter groups, not `postgresql.conf`. Aurora ignores some entirely.
> - Generate a baseline for your box at https://pgtune.leopard.in.ua/ then tune from `pg_stat_statements` and `EXPLAIN`, validating each change.

```ini
# postgresql.conf — STARTING POINT for a self-hosted OLTP server,
# ~16GB RAM / 4 CPU / NVMe SSD, PostgreSQL 16+. Tune to your workload.

# Memory
shared_buffers = '4GB'           # 25% of RAM
effective_cache_size = '12GB'    # 75% of RAM (includes OS cache)
work_mem = '64MB'                # Per-operation sort/hash memory
maintenance_work_mem = '512MB'   # For VACUUM, CREATE INDEX

# WAL
wal_buffers = '64MB'
checkpoint_completion_target = 0.9
max_wal_size = '4GB'

# Query planning
random_page_cost = 1.1           # SSDs (default 4.0 is for HDDs)
effective_io_concurrency = 200   # SSDs

# Connections
max_connections = 200            # Use PgBouncer, not high max_connections

# Logging
log_min_duration_statement = 200  # Log queries > 200ms
log_checkpoints = on
log_lock_waits = on
log_temp_files = 0                # Log any temp file usage

# Autovacuum (tune if you have high-write tables)
autovacuum_max_workers = 4
autovacuum_naptime = '30s'
autovacuum_vacuum_cost_limit = 1000
```
