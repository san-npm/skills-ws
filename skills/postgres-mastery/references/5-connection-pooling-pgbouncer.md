## Contents

- 5. Connection Pooling — PgBouncer
- Why you need it
- Configuration
- Transaction mode gotchas

## 5. Connection Pooling — PgBouncer

### Why you need it

PostgreSQL creates a process per connection (~10MB RAM each). 100 connections = 1GB RAM just for connections. PgBouncer multiplexes thousands of app connections over a small pool.

### Configuration

```ini
; /etc/pgbouncer/pgbouncer.ini

[databases]
myapp = host=10.0.1.100 port=5432 dbname=myapp

[pgbouncer]
listen_port = 6432
listen_addr = 0.0.0.0
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; Pool mode:
; transaction — releases connection after each transaction (recommended)
; session — holds connection for entire session (needed for LISTEN/NOTIFY, advisory-lock sessions)
pool_mode = transaction

; Prepared statements in transaction mode (PgBouncer 1.21+):
; PgBouncer tracks protocol-level (extended-protocol) prepared statements per server
; connection. Set this > 0 to enable them in transaction mode.
max_prepared_statements = 200   ; 0 disables; per server connection

; Pool sizing
default_pool_size = 25          ; Connections per user/db pair
max_client_conn = 1000          ; Max client connections
reserve_pool_size = 5           ; Emergency extra connections
reserve_pool_timeout = 3        ; Wait before using reserve

; Timeouts
server_idle_timeout = 600       ; Close idle server connections after 10min
client_idle_timeout = 0         ; Don't close idle client connections
query_timeout = 30              ; Kill queries running > 30s
query_wait_timeout = 120        ; Wait 2min for a connection before erroring

; Stats
stats_period = 60
log_connections = 0             ; Don't log every connect/disconnect
log_disconnections = 0
```

### Transaction mode gotchas

```sql
-- These DON'T work reliably in transaction mode (a later statement may land on
-- a different server connection that never saw the session-level command):
LISTEN channel;                       -- LISTEN/NOTIFY
SET search_path = myschema;          -- Session-level SET
CREATE TEMP TABLE ...;               -- Session-scoped temp tables
-- Session-level advisory locks (pg_advisory_lock); use *_xact_ versions instead.

-- Workaround: use SET LOCAL (transaction-scoped):
BEGIN;
SET LOCAL search_path = myschema;
SELECT * FROM my_table;
COMMIT;

-- Or use session mode for specific apps that need these features.

-- Explicit SQL-level "PREPARE stmt AS ..." still won't survive across
-- transactions in transaction mode — only protocol-level prepared statements
-- (the extended query protocol your driver uses) are pooled, when
-- max_prepared_statements > 0.
```

**Prepared statements & drivers (2026).** PgBouncer 1.21+ pools protocol-level prepared statements in transaction mode when `max_prepared_statements > 0`. Driver caveats:

- **node-postgres / pg, asyncpg, JDBC, libpq** — use the extended protocol; named prepared statements work once `max_prepared_statements` is set. asyncpg also lets you disable its own statement cache (`statement_cache_size=0`) if you prefer.
- **Prisma** — for transaction-mode poolers, append `?pgbouncer=true` to the `DATABASE_URL` (disables Prisma's prepared statements). Prisma's own Accelerate / pooled `prisma://` URLs already handle this.
- **Serverless (Lambda, Vercel, Cloud Run)** — many short-lived clients overwhelm direct connections; route through a transaction-mode pooler (PgBouncer, RDS Proxy, Supabase pooler, Neon's pooled endpoint). Keep per-instance client pools tiny (often `max: 1`) and let the pooler do the multiplexing.

Session mode is still required when a feature genuinely needs connection affinity for its whole lifetime: `LISTEN`/`NOTIFY`, session-level advisory locks, `SET` that must persist across transactions, or session-scoped temp tables.

---
