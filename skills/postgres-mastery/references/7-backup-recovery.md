## Contents

- 7. Backup & Recovery
- pgdump for logical backups
- WAL archiving for point-in-time recovery
- Automated backup script

## 7. Backup & Recovery

### pg_dump for logical backups

```bash
# Full backup (custom format — compressed, allows selective restore)
pg_dump -Fc -h localhost -U myapp -d myapp > backup_$(date +%Y%m%d_%H%M%S).dump

# Schema only
pg_dump -Fc --schema-only -d myapp > schema.dump

# Specific tables
pg_dump -Fc -t users -t orders -d myapp > users_orders.dump

# Restore
pg_restore -d myapp_new backup.dump

# Restore specific table
pg_restore -d myapp -t users backup.dump
```

### WAL archiving for point-in-time recovery

```ini
# postgresql.conf
wal_level = replica
archive_mode = on
# archive_command MUST: (1) return non-zero on ANY failure so Postgres retries
# (it will keep the WAL segment until success — never return 0 on a failed copy),
# and (2) refuse to overwrite an already-archived segment with DIFFERENT content.
# Naive `aws s3 cp` silently overwrites and masks corruption. Guard it:
archive_command = 'test ! -f /mnt/wal/%f && cp %p /mnt/wal/%f'
# A plain `aws s3 cp` cannot refuse to overwrite an existing object; if archiving
# straight to S3, use pgBackRest (below) or a wrapper that checks object existence first.
archive_timeout = 300  # Archive at least every 5 minutes
```

In practice, do not hand-roll this. Prefer a purpose-built tool that handles idempotency, compression, encryption, parallelism, retention, and verified restores:

```bash
# pgBackRest (recommended): WAL archive + full/incremental backups to S3, with
# integrity checks and restore testing built in.
archive_command = 'pgbackrest --stanza=main archive-push %p'

# Or stream WAL continuously off-host (complements, not replaces, base backups):
pg_receivewal -h primary -U replicator -D /mnt/wal --synchronous
```

Monitor archiving health and alert on `failed_count > 0` or a stalled `last_archived_time`:

```sql
SELECT archived_count, failed_count, last_archived_wal, last_archived_time,
       last_failed_wal, last_failed_time
FROM pg_stat_archiver;
```

Periodically run a real restore to a throwaway host — an untested backup is not a backup.

```bash
# Point-in-time recovery
# 1. Stop PostgreSQL
# 2. Replace data directory with base backup
# 3. Create recovery.signal
# 4. Configure recovery target in postgresql.conf:
#    recovery_target_time = '2025-03-01 14:30:00+00'
#    restore_command = 'aws s3 cp s3://my-wal-archive/%f %p'
# 5. Start PostgreSQL — it replays WAL to the target time
```

### Automated backup script

```bash
#!/bin/bash
set -euo pipefail

DB_NAME="myapp"
S3_BUCKET="myapp-backups"        # versioned + Object Lock + SSE enabled (see below)
DATE=$(date -u +%Y%m%d_%H%M%S)
BACKUP_FILE="$(mktemp -d)/${DB_NAME}_${DATE}.dump"

# Dump (-Fc = compressed custom format). PGPASSWORD/.pgpass, never inline secrets.
pg_dump -Fc -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE"

# Upload with server-side encryption. Retention/expiry is handled by the bucket
# lifecycle policy below — this script NEVER deletes old backups.
aws s3 cp "$BACKUP_FILE" "s3://${S3_BUCKET}/daily/${DB_NAME}_${DATE}.dump" \
  --storage-class STANDARD_IA --sse aws:kms --only-show-errors

rm -rf "$(dirname "$BACKUP_FILE")"
echo "Backup complete: ${DB_NAME}_${DATE}.dump"
```

**Do retention with bucket policy, not a delete loop.** Parsing filenames to `aws s3 rm` is dangerous: a date-parse bug, a clock skew, or an empty `ls` (transient error → `awk` yields nothing → no guard) can wipe your only good backup, and it ignores legal/compliance holds. Instead:

- **Versioning + Object Lock (compliance/governance, WORM):** ransomware or a bad script cannot delete or overwrite a locked object before its retention expires.
- **Lifecycle rules** expire/transition objects automatically (set once, in IaC):

```json
{ "Rules": [{
  "ID": "pg-daily-retention",
  "Filter": { "Prefix": "daily/" },
  "Status": "Enabled",
  "Transitions": [{ "Days": 30, "StorageClass": "GLACIER" }],
  "Expiration": { "Days": 365 },
  "NoncurrentVersionExpiration": { "NoncurrentDays": 30 }
}]}
```

- **Encryption** at rest (SSE-KMS) and in transit; restrict who can read/delete the bucket.

**RPO/RTO — logical vs physical:**

| | Logical (`pg_dump`) | Physical / PITR (`pgBackRest`, base backup + WAL) |
|---|---|---|
| RPO | Since last dump (hours) | Seconds — replay WAL to any point in time |
| RTO | Slow restore + reindex on big DBs | Faster; full-cluster restore |
| Scope | Per-DB, portable across major versions | Whole cluster, same major version |
| Use for | Small/medium DBs, migrations, partial restores | Large DBs, low-RPO production |

Pick logical for portability and selective restores; pick physical/PITR when you need a low RPO on a large database. **Test restores on a schedule** — measure actual RTO and confirm the dump deserializes. An unrestored backup is a hope, not a backup.

---
