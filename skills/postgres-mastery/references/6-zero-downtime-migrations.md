## Contents

- 6. Zero-Downtime Migrations
- Adding a column safely
- Adding an index without locking
- Renaming a column
- Adding a NOT NULL constraint

## 6. Zero-Downtime Migrations

### Adding a column safely

```sql
-- SAFE: nullable column, no default (instant, no table rewrite)
ALTER TABLE users ADD COLUMN avatar_url text;

-- SAFE in PG 11+: column with a DEFAULT (instant, stored as metadata)
ALTER TABLE users ADD COLUMN is_active boolean DEFAULT true;

-- DANGEROUS: NOT NULL without default (scans entire table)
-- NEVER DO THIS:
ALTER TABLE users ADD COLUMN bio text NOT NULL;
-- Instead: add nullable, backfill, then add constraint
```

### Adding an index without locking

```sql
-- CONCURRENTLY doesn't lock the table for writes
CREATE INDEX CONCURRENTLY idx_orders_email ON orders (email);

-- Check if it succeeded (CONCURRENTLY can fail silently):
SELECT indexrelid::regclass, indisvalid
FROM pg_index WHERE indexrelid = 'idx_orders_email'::regclass;
-- indisvalid = true → good
-- indisvalid = false → DROP INDEX idx_orders_email; and retry
```

### Renaming a column

```sql
-- DON'T rename directly — breaks running code
-- Step 1: Add new column
ALTER TABLE users ADD COLUMN display_name text;

-- Step 2: Backfill (in batches)
UPDATE users SET display_name = name WHERE display_name IS NULL AND id BETWEEN 1 AND 10000;
UPDATE users SET display_name = name WHERE display_name IS NULL AND id BETWEEN 10001 AND 20000;
-- Continue in batches...

-- Step 3: Create a trigger to keep both in sync during transition
CREATE OR REPLACE FUNCTION sync_display_name() RETURNS trigger AS $$
BEGIN
  IF NEW.name IS DISTINCT FROM OLD.name THEN
    NEW.display_name := NEW.name;
  ELSIF NEW.display_name IS DISTINCT FROM OLD.display_name THEN
    NEW.name := NEW.display_name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_display_name_trigger
  BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION sync_display_name();

-- Step 4: Deploy code reading from display_name
-- Step 5: Deploy code writing to display_name only
-- Step 6: Drop trigger and old column
DROP TRIGGER sync_display_name_trigger ON users;
ALTER TABLE users DROP COLUMN name;
```

### Adding a NOT NULL constraint

```sql
-- DANGEROUS: ALTER TABLE ... SET NOT NULL scans entire table with lock
-- SAFE: use a CHECK constraint with NOT VALID

-- Step 1: Add constraint without validating existing rows (instant)
ALTER TABLE users ADD CONSTRAINT users_email_not_null
  CHECK (email IS NOT NULL) NOT VALID;

-- Step 2: Validate in background (no lock on writes)
ALTER TABLE users VALIDATE CONSTRAINT users_email_not_null;

-- Step 3: Optionally convert to NOT NULL (instant after validation)
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users DROP CONSTRAINT users_email_not_null;
```

---
