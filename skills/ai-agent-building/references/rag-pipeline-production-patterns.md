## Contents

- RAG Pipeline: Production Patterns
- Chunking Strategies
- Hybrid Search (Vector + Keyword)
- Reranking
- Citation Pattern

## RAG Pipeline: Production Patterns

### Chunking Strategies

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter, Language

# For general documents
splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " ", ""],
    length_function=len,
)

# For code
code_splitter = RecursiveCharacterTextSplitter.from_language(
    language=Language.PYTHON,
    chunk_size=1500,
    chunk_overlap=200,
)

# For markdown with structure preservation
markdown_splitter = RecursiveCharacterTextSplitter.from_language(
    language=Language.MARKDOWN,
    chunk_size=1000,
    chunk_overlap=100,
)
```

### Hybrid Search (Vector + Keyword)

```python
from langchain_community.retrievers import BM25Retriever
from langchain.retrievers import EnsembleRetriever

# Vector search (semantic)
vector_retriever = vector_store.as_retriever(search_kwargs={"k": 5})

# Keyword search (BM25)
bm25_retriever = BM25Retriever.from_documents(documents, k=5)

# Combine with weights
hybrid_retriever = EnsembleRetriever(
    retrievers=[vector_retriever, bm25_retriever],
    weights=[0.6, 0.4],  # Favor semantic, but keyword catches exact matches
)
```

### Reranking

```python
from langchain.retrievers import ContextualCompressionRetriever
from langchain_cohere import CohereRerank

# Retrieve broadly, then rerank for precision
reranker = CohereRerank(model="rerank-english-v3.0", top_n=3)
retriever = ContextualCompressionRetriever(
    base_compressor=reranker,
    base_retriever=hybrid_retriever,  # Gets 20 candidates
)

# Usage: retriever.invoke("How do I configure CORS?")
# Returns top 3 most relevant chunks from the initial 20
```

### Citation Pattern

```python
from langchain_core.prompts import ChatPromptTemplate

RAG_PROMPT = ChatPromptTemplate.from_messages([
    ("system", """Answer the question based on the provided context.
Include citations using [1], [2] etc. referencing the source documents.
If the context doesn't contain the answer, say so — don't make things up.

Context:
{context}"""),
    ("human", "{question}"),
])

def format_docs_with_citations(docs):
    formatted = []
    for i, doc in enumerate(docs, 1):
        source = doc.metadata.get("source", "unknown")
        formatted.append(f"[{i}] (Source: {source})\n{doc.page_content}")
    return "\n\n".join(formatted)
```

---
