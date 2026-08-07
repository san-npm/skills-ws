## Contents

- Tool Design: Best Practices
- Error Recovery and Timeout Handling
- Tool Design Rules

## Tool Design: Best Practices

### Error Recovery and Timeout Handling

```python
import asyncio
from functools import wraps
from langchain_core.tools import tool

def with_timeout(seconds: int = 30):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            try:
                return await asyncio.wait_for(func(*args, **kwargs), timeout=seconds)
            except asyncio.TimeoutError:
                return f"Error: Tool timed out after {seconds}s. Try a simpler query."
        return wrapper
    return decorator

def with_retry(max_retries: int = 3):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    if attempt < max_retries - 1:
                        await asyncio.sleep(2 ** attempt)
            return f"Error after {max_retries} retries: {str(last_error)}"
        return wrapper
    return decorator

@tool
@with_retry(3)
@with_timeout(30)
async def query_database(sql: str) -> str:
    """Run a read-only SELECT against the analytics warehouse and return rows.

    Args:
        sql: A single SELECT statement. No DML/DDL, no multiple statements.
    """
    try:
        validated = validate_readonly_sql(sql, allowed_tables={"orders", "products", "customers"})
    except ValueError as e:
        return f"Error: {e}"

    # Defense in depth: the LLM-facing connection uses a DB role that only has
    # SELECT on the allowed schema (see note below) AND a per-statement timeout.
    rows = await ro_db.execute(validated, timeout_s=10)  # ro_db = read-only-role pool
    if len(rows) > 50:
        return f"Query returned {len(rows)} rows (showing first 20):\n{format_rows(rows[:20])}"
    return format_rows(rows)
```

**Why the old `"DROP" in sql.upper()` blocklist is not production-safe:** substring checks are trivially bypassed (`/*DROP*/`, `dr"||"op`, a column literally named `update_ts`), they still allow stacked statements (`SELECT 1; DELETE ...`), CTE-wrapped writes, `pg_sleep()`-style DoS, schema enumeration via `information_schema`/`pg_catalog`, and cross-tenant reads. **Allowlist with a real SQL parser instead of blocklisting.** Use `sqlglot` to parse to an AST, reject anything that isn't exactly one `SELECT`, and enforce table allowlist + tenant scoping:

```python
# pip install sqlglot
import sqlglot
from sqlglot import exp

def validate_readonly_sql(sql: str, allowed_tables: set[str], tenant_id: str | None = None) -> str:
    statements = sqlglot.parse(sql, read="postgres")
    if len(statements) != 1:
        raise ValueError("Exactly one statement is allowed (no stacked queries).")
    tree = statements[0]

    # 1. Top level must be a pure SELECT (this also rejects INSERT/UPDATE/DELETE/DDL,
    #    and SELECT ... INTO / data-modifying CTEs at the root).
    if not isinstance(tree, exp.Select):
        raise ValueError("Only SELECT statements are allowed.")

    # 2. No write expressions or unsafe constructs anywhere in the tree.
    banned = (exp.Insert, exp.Update, exp.Delete, exp.Drop, exp.Alter,
              exp.Create, exp.Command, exp.Merge, exp.Into, exp.Set)
    if any(node for node in tree.walk() if isinstance(node, banned)):
        raise ValueError("Query contains a forbidden write/DDL operation.")

    # 3. Allowlist every referenced table; block catalog/schema probing.
    for tbl in tree.find_all(exp.Table):
        name = tbl.name.lower()
        if tbl.db and tbl.db.lower() in ("information_schema", "pg_catalog"):
            raise ValueError("System catalog access is not allowed.")
        if name not in allowed_tables:
            raise ValueError(f"Table '{name}' is not allowed.")

    # 4. Force a hard row cap (LLMs forget LIMIT; large scans cost money / leak data).
    if not tree.args.get("limit"):
        tree = tree.limit(1000)

    # 5. (Multi-tenant) inject a tenant filter so the agent can never read other tenants.
    if tenant_id is not None:
        tree = tree.where(exp.condition(f"tenant_id = {sqlglot.exp.Literal.string(tenant_id)}"))

    return tree.sql(dialect="postgres")
```

Layer this with infrastructure controls — the validator is the inner ring, not the only ring:

- **Dedicated read-only role.** Run agent queries on a connection whose Postgres role has `SELECT` only, on a restricted schema/view: `GRANT SELECT ON orders, products, customers TO agent_ro;` and nothing else. Even a parser bypass then cannot write.
- **Statement timeout.** `SET statement_timeout = '10s'` on that role/session to kill `pg_sleep`-style or runaway scans.
- **Prefer views.** Expose curated, pre-joined, already tenant-scoped views (e.g. `agent_orders_v`) and allowlist only those — never base tables.
- **Parameterize the tenant id**; never string-format untrusted values into SQL elsewhere in your app.

### Tool Design Rules

1. **Clear descriptions** — the LLM reads them to decide when to use the tool
2. **Validate inputs** — never trust LLM-generated parameters
3. **Return errors as strings** — don't throw exceptions, let the agent recover
4. **Limit output size** — truncate large results, the context window is precious
5. **Make tools idempotent** where possible — agents retry
6. **Include examples in docstrings** — helps the LLM use tools correctly

---
