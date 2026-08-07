## Contents

- Memory Patterns
- Conversation Buffer with Sliding Window
- Summary Memory
- Vector Store Memory (Long-term)

## Memory Patterns

### Conversation Buffer with Sliding Window

```python
from langchain_core.messages import trim_messages

# Keep last N messages, but always keep the system message
trimmer = trim_messages(
    max_tokens=4000,
    strategy="last",
    token_counter=model,
    include_system=True,
    allow_partial=False,
)

# In your agent node
def agent(state: AgentState) -> AgentState:
    trimmed = trimmer.invoke(state["messages"])
    response = model.invoke(trimmed)
    return {"messages": [response]}
```

### Summary Memory

```python
from langchain_core.messages import SystemMessage

async def maybe_summarize(state: AgentState) -> AgentState:
    messages = state["messages"]
    if len(messages) < 20:
        return state

    # Summarize older messages, keep recent ones
    old_messages = messages[1:-10]  # Skip system, keep last 10
    recent = messages[-10:]

    summary = await model.ainvoke([
        SystemMessage(content="Summarize this conversation concisely, preserving key facts and decisions:"),
        *old_messages,
    ])

    return {
        "messages": [
            messages[0],  # System message
            SystemMessage(content=f"Previous conversation summary: {summary.content}"),
            *recent,
        ]
    }
```

### Vector Store Memory (Long-term)

```python
# pip install langchain-chroma langchain-openai
from datetime import datetime, timezone
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
memory_store = Chroma(
    collection_name="agent_memory",
    embedding_function=embeddings,
    persist_directory="./memory_db",
)

@tool
def recall_memory(query: str) -> str:
    """Search past conversations and learned facts for relevant information."""
    docs = memory_store.similarity_search(query, k=5)
    if not docs:
        return "No relevant memories found."
    return "\n\n".join([
        f"[{doc.metadata.get('timestamp', 'unknown')}] {doc.page_content}"
        for doc in docs
    ])

@tool
def store_memory(fact: str, category: str = "general") -> str:
    """Store an important fact or learning for future reference."""
    memory_store.add_texts(
        texts=[fact],
        metadatas=[{
            "category": category,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }],
    )
    return f"Stored: {fact}"
```

---
