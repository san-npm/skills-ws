## Contents

- 4. pgvector — Embeddings & Similarity Search
- HNSW vs IVFFlat
- Distance functions
- Inserting embeddings from your app

## 4. pgvector — Embeddings & Similarity Search

```sql
CREATE EXTENSION vector;

CREATE TABLE documents (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    content     text NOT NULL,
    embedding   vector(1536),  -- match your embedding model's output dimensions
    metadata    jsonb,
    created_at  timestamptz DEFAULT now()
);
```

**Pick `vector(N)` to match your model.** `text-embedding-ada-002` (legacy) is fixed at 1536. Prefer current models:

| Model | Native dims | Notes |
|-------|-------------|-------|
| `text-embedding-3-small` | 1536 | Cheaper; can shorten via `dimensions` param |
| `text-embedding-3-large` | 3072 | Highest quality; shorten to 1024/256 for storage/speed |
| Cohere `embed-v4.0` / open models | 1536 default (256/512/1024 options) / varies | Check the model card before choosing `N` |

The `text-embedding-3-*` models support Matryoshka truncation: request fewer `dimensions` (e.g. 256) for ~6x smaller indexes with modest recall loss. Whatever you pick, `vector(N)` must equal the stored vector length exactly, so verify against current model docs (e.g. https://developers.openai.com/api/docs/guides/embeddings) before committing to a column type.

**Storage types (pgvector 0.7+).** For high-dimension models, `halfvec` (16-bit floats) halves index size and memory with negligible recall loss, and dodges the `vector`/`hnsw` ~2000-dim index limit:

```sql
-- halfvec column + HNSW index (recommended for 3-large at 3072 dims)
ALTER TABLE documents ALTER COLUMN embedding TYPE halfvec(3072);
CREATE INDEX ON documents USING hnsw (embedding halfvec_cosine_ops)
    WITH (m = 16, ef_construction = 200);

-- Binary quantization (bit) for extreme scale; rerank top-K with full vectors
CREATE INDEX ON documents USING hnsw (
    (binary_quantize(embedding)::bit(3072)) bit_hamming_ops);
```

### HNSW vs IVFFlat

| Feature | HNSW | IVFFlat |
|---------|------|---------|
| Build time | Slow (hours for 1M+ rows) | Fast |
| Query speed | Faster | Slower |
| Memory | Higher | Lower |
| Recall | Better (99%+) | Good (95%+) with tuning |
| Updates | Good | Needs periodic reindex |
| **Use when** | Default choice; you can fit the index in RAM | Index doesn't fit in RAM, or build time matters more than recall |

There is no fixed row count that switches you from HNSW to IVFFlat — it depends on dimensions, `halfvec` vs `vector`, available RAM, and build-time budget. HNSW is the default for most workloads; reach for IVFFlat (or `halfvec`/binary quantization) only when the HNSW graph won't fit in memory. Always benchmark recall and p95 latency on your own data before deciding.

```sql
-- HNSW index (preferred for most cases)
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 200);

-- At query time, increase ef_search for better recall:
SET hnsw.ef_search = 100;  -- Default 40, higher = more accurate but slower

-- IVFFlat (for very large datasets)
-- First, decide number of lists: sqrt(num_rows) is a good start
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 1000);  -- For ~1M rows

-- At query time:
SET ivfflat.probes = 10;  -- Default 1, check more lists for better recall
```

### Distance functions

```sql
-- Cosine distance (most common for text embeddings)
SELECT id, content, embedding <=> '[0.1, 0.2, ...]'::vector AS distance
FROM documents
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 10;

-- L2 (Euclidean) distance
SELECT id, content, embedding <-> '[0.1, 0.2, ...]'::vector AS distance
FROM documents
ORDER BY embedding <-> '[0.1, 0.2, ...]'::vector
LIMIT 10;

-- Inner product (for normalized vectors, equivalent to cosine)
SELECT id, content, (embedding <#> '[0.1, 0.2, ...]'::vector) * -1 AS similarity
FROM documents
ORDER BY embedding <#> '[0.1, 0.2, ...]'::vector
LIMIT 10;

-- Combine vector search with metadata filtering
SELECT id, content
FROM documents
WHERE metadata->>'category' = 'technical'
  AND created_at > now() - interval '30 days'
ORDER BY embedding <=> $1::vector
LIMIT 10;
-- ⚠ Pre-filter large result sets can be slow. Consider partial indexes:
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops)
    WHERE metadata->>'category' = 'technical';
```

### Inserting embeddings from your app

```typescript
import { Pool } from 'pg';
import pgvector from 'pgvector/pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
await pgvector.registerType(pool);

// Insert
await pool.query(
  'INSERT INTO documents (content, embedding, metadata) VALUES ($1, $2, $3)',
  [content, pgvector.toSql(embedding), JSON.stringify(metadata)]
);

// Query
const result = await pool.query(
  `SELECT id, content, embedding <=> $1::vector AS distance
   FROM documents ORDER BY distance LIMIT $2`,
  [pgvector.toSql(queryEmbedding), 10]
);
```

---
