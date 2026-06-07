---
name: ai-agent-building
description: "Build production AI agents — LangGraph state machines, CrewAI teams, tool design, memory, RAG, MCP, multi-agent orchestration, evals, cost control, and safety. Use when building LangGraph/CrewAI agents, designing or validating tools, wiring RAG or MCP, adding human-in-the-loop, or running agent evals and safety reviews."
---

# AI Agent Building

## Agent Architecture Fundamentals

An AI agent is an LLM that can take actions. That's it. Everything else is engineering around that core loop:

```
Observe → Think → Act → Observe → Think → Act → ...
```

The complexity comes from: which actions? how to recover from failures? how to know when to stop? how to not bankrupt you on API calls?

---

## LangGraph: State Machine Agents

LangGraph is the production-grade choice for complex agents. It gives you explicit control flow, checkpointing, and human-in-the-loop — things you need in production but that simple chains don't offer.

### Basic Agent with Tool Calling

```python
# pip install langgraph langchain-openai langgraph-checkpoint-sqlite
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool

# Define state
class AgentState(TypedDict):
    messages: Annotated[list, add_messages]

# Define tools
@tool
def search_database(query: str) -> str:
    """Search the product database for items matching the query."""
    # Real implementation here
    return f"Found 3 products matching '{query}': Widget A ($10), Widget B ($20), Widget C ($30)"

@tool
def create_order(product_name: str, quantity: int) -> str:
    """Create an order for a product."""
    order_id = f"ORD-{hash(product_name) % 10000:04d}"
    return f"Order {order_id} created: {quantity}x {product_name}"

tools = [search_database, create_order]
model = ChatOpenAI(model="gpt-5", temperature=0).bind_tools(tools)

# Define nodes
def agent(state: AgentState) -> AgentState:
    response = model.invoke(state["messages"])
    return {"messages": [response]}

def should_continue(state: AgentState) -> str:
    last_message = state["messages"][-1]
    if last_message.tool_calls:
        return "tools"
    return END

# Build graph
graph = StateGraph(AgentState)
graph.add_node("agent", agent)
graph.add_node("tools", ToolNode(tools))

graph.add_edge(START, "agent")
graph.add_conditional_edges("agent", should_continue, {"tools": "tools", END: END})
graph.add_edge("tools", "agent")

app = graph.compile()

# Run
result = app.invoke({
    "messages": [{"role": "user", "content": "Find me a widget under $15 and order 2 of them"}]
})
```

### Human-in-the-Loop with `interrupt()` and Checkpointing

The modern pattern (LangGraph 0.2.x+) uses the `interrupt()` function to pause *inside* a node and `Command(resume=...)` to feed a decision back. The value passed to `Command(resume=...)` becomes the return value of `interrupt()`, so you must **actually check it** before executing the side-effecting tool — never blindly continue into the tool node. Requires a checkpointer and a stable `thread_id`.

```python
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode
from langgraph.types import interrupt, Command
from langgraph.checkpoint.sqlite import SqliteSaver  # pip install langgraph-checkpoint-sqlite
# For pure in-memory dev use: from langgraph.checkpoint.memory import InMemorySaver

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]

def agent(state: AgentState) -> AgentState:
    return {"messages": [model.invoke(state["messages"])]}

def route_after_agent(state: AgentState) -> str:
    last = state["messages"][-1]
    if not getattr(last, "tool_calls", None):
        return END
    # High-stakes tools go through approval; everything else runs directly.
    if any(tc["name"] == "create_order" for tc in last.tool_calls):
        return "approval"
    return "tools"

def approval(state: AgentState) -> Command:
    """Pause and surface the pending order to a human. The resumed value is the decision."""
    last = state["messages"][-1]
    order_calls = [tc for tc in last.tool_calls if tc["name"] == "create_order"]

    # interrupt() returns whatever the human passes via Command(resume=...)
    decision = interrupt({
        "action": "approve_order",
        "orders": [tc["args"] for tc in order_calls],
        "prompt": "Approve these orders? Reply {'approved': bool, 'reason': str}",
    })

    if not decision.get("approved"):
        # Reject: feed a tool message back so the agent can apologize / replan.
        # Do NOT fall through to the tools node.
        from langchain_core.messages import ToolMessage
        return Command(
            goto="agent",
            update={"messages": [
                ToolMessage(
                    content=f"Order rejected by human: {decision.get('reason', 'no reason given')}",
                    tool_call_id=tc["id"],
                ) for tc in order_calls
            ]},
        )
    # Approved: now (and only now) proceed to execute the tool.
    return Command(goto="tools")

graph = StateGraph(AgentState)
graph.add_node("agent", agent)
graph.add_node("tools", ToolNode(tools))
graph.add_node("approval", approval)  # returns Command, so its targets are dynamic

graph.add_edge(START, "agent")
graph.add_conditional_edges("agent", route_after_agent,
                            {"tools": "tools", "approval": "approval", END: END})
graph.add_edge("tools", "agent")

# Compile with a checkpointer — required for interrupt/resume.
with SqliteSaver.from_conn_string(":memory:") as checkpointer:
    app = graph.compile(checkpointer=checkpointer)
    config = {"configurable": {"thread_id": "order-123"}}

    # First run stops at interrupt(); the payload appears under "__interrupt__".
    result = app.invoke(
        {"messages": [{"role": "user", "content": "Order 5 Widget As"}]},
        config=config,
    )
    print(result["__interrupt__"])  # show the orders to the human / UI

    # Human decides. Resume by passing the decision into interrupt() via Command(resume=...).
    final = app.invoke(Command(resume={"approved": True}), config=config)
    # To deny instead:  app.invoke(Command(resume={"approved": False, "reason": "over budget"}), config=config)
```

> `interrupt()` replaces the old `interrupt_before=[...]` / `app.invoke(None, config)` resume idiom, which paused *before* a node but did not let you pass or inspect an approval value. Note `SqliteSaver.from_conn_string` is now a context manager; for persistence on disk use a file path instead of `":memory:"`.

### TypeScript LangGraph

```typescript
import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { BaseMessage, HumanMessage } from "@langchain/core/messages";

// State definition
const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
  }),
});

// Tools
const searchTool = tool(
  async ({ query }) => {
    return `Results for "${query}": Product A, Product B`;
  },
  {
    name: "search",
    description: "Search the product database",
    schema: z.object({ query: z.string() }),
  }
);

const model = new ChatOpenAI({ model: "gpt-5", temperature: 0 }).bindTools([searchTool]);

// Nodes
async function agent(state: typeof AgentState.State) {
  const response = await model.invoke(state.messages);
  return { messages: [response] };
}

function shouldContinue(state: typeof AgentState.State) {
  const lastMsg = state.messages[state.messages.length - 1];
  if ("tool_calls" in lastMsg && lastMsg.tool_calls?.length) {
    return "tools";
  }
  return END;
}

// Graph
const graph = new StateGraph(AgentState)
  .addNode("agent", agent)
  .addNode("tools", new ToolNode([searchTool]))
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, { tools: "tools", [END]: END })
  .addEdge("tools", "agent");

const app = graph.compile();

const result = await app.invoke({
  messages: [new HumanMessage("Find products related to widgets")],
});
```

---

## CrewAI: Multi-Agent Teams

```python
# pip install crewai crewai-tools
from crewai import Agent, Task, Crew, Process
from crewai_tools import SerperDevTool, ScrapeWebsiteTool

# Define specialized agents
researcher = Agent(
    role="Senior Research Analyst",
    goal="Find comprehensive, accurate information about the given topic",
    backstory="You're a seasoned researcher with 15 years of experience in market analysis.",
    tools=[SerperDevTool(), ScrapeWebsiteTool()],
    verbose=True,
    allow_delegation=False,
    llm="gpt-5",
)

writer = Agent(
    role="Technical Writer",
    goal="Create clear, engaging content based on research findings",
    backstory="You're a technical writer who excels at making complex topics accessible.",
    verbose=True,
    llm="gpt-5",
)

editor = Agent(
    role="Editor",
    goal="Review and polish the content for accuracy, clarity, and engagement",
    backstory="You're a meticulous editor with an eye for detail and factual accuracy.",
    verbose=True,
    llm="gpt-5",
)

# Define tasks
research_task = Task(
    description="Research the current state of {topic}. Find key trends, statistics, and expert opinions.",
    expected_output="A comprehensive research brief with key findings, statistics, and sources.",
    agent=researcher,
)

writing_task = Task(
    description="Write a 1500-word article based on the research brief.",
    expected_output="A well-structured article with introduction, key sections, and conclusion.",
    agent=writer,
    context=[research_task],  # Uses output from research
)

editing_task = Task(
    description="Edit the article for clarity, accuracy, and engagement. Fix any factual errors.",
    expected_output="A polished, publication-ready article.",
    agent=editor,
    context=[writing_task],
)

# Assemble crew
crew = Crew(
    agents=[researcher, writer, editor],
    tasks=[research_task, writing_task, editing_task],
    process=Process.sequential,  # or Process.hierarchical with a manager
    verbose=True,
)

result = crew.kickoff(inputs={"topic": "AI agents in production"})
```

---

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
from datetime import datetime, timezone
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma

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

## Multi-Agent Patterns

### Supervisor Pattern

```python
import json
from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langchain_core.messages import SystemMessage

class SupervisorState(TypedDict):
    messages: Annotated[list, add_messages]
    next_agent: str

from typing import Literal
from pydantic import BaseModel

class Route(BaseModel):
    next: Literal["researcher", "coder", "writer", "FINISH"]

# with_structured_output guarantees a parsed Route — don't json.loads(content),
# which breaks the moment the model wraps JSON in prose or a code fence.
router_model = supervisor_model.with_structured_output(Route)

def supervisor(state: SupervisorState) -> SupervisorState:
    """Route to the appropriate specialist agent."""
    decision = router_model.invoke([
        SystemMessage(content="""You are a supervisor routing tasks to specialists:
- researcher: for finding information
- coder: for writing or reviewing code
- writer: for creating content
Pick the next worker, or FINISH when the task is complete."""),
        *state["messages"],
    ])
    return {"next_agent": decision.next}

def route(state: SupervisorState) -> str:
    return state["next_agent"]

graph = StateGraph(SupervisorState)
graph.add_node("supervisor", supervisor)
graph.add_node("researcher", researcher_agent)
graph.add_node("coder", coder_agent)
graph.add_node("writer", writer_agent)

graph.add_edge(START, "supervisor")
graph.add_conditional_edges("supervisor", route, {
    "researcher": "researcher",
    "coder": "coder",
    "writer": "writer",
    "FINISH": END,
})
# All agents report back to supervisor
for agent in ["researcher", "coder", "writer"]:
    graph.add_edge(agent, "supervisor")

app = graph.compile()
```

---

## Production Concerns

### Cost Tracking

```python
import tiktoken
from contextlib import contextmanager

class CostTracker:
    # USD per 1M tokens (input/output). List prices as of Jun 2026 — these move often;
    # treat as a starting point and re-check the official pricing pages, ideally generating
    # this dict from a dated constants file in CI:
    #   OpenAI:    https://openai.com/api/pricing
    #   Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
    PRICES = {
        "gpt-5.5":          {"input": 5.00, "output": 30.00},  # flagship
        "gpt-5.4":          {"input": 2.50, "output": 15.00},  # production workhorse
        "gpt-5.1":          {"input": 1.25, "output": 10.00},
        "gpt-5":            {"input": 1.25, "output": 10.00},
        "o3":               {"input": 2.00, "output": 8.00},   # reasoning
        "claude-opus-4-8":   {"input": 5.00, "output": 25.00},
        "claude-sonnet-4-6": {"input": 3.00, "output": 15.00},
        "claude-haiku-4-5":  {"input": 1.00, "output": 5.00},
    }

    def __init__(self):
        self.total_input_tokens = 0
        self.total_output_tokens = 0
        self.total_cost = 0.0
        self.calls = []

    def track(self, model: str, input_tokens: int, output_tokens: int):
        prices = self.PRICES.get(model, {"input": 0, "output": 0})
        cost = (input_tokens * prices["input"] + output_tokens * prices["output"]) / 1_000_000
        self.total_input_tokens += input_tokens
        self.total_output_tokens += output_tokens
        self.total_cost += cost
        self.calls.append({"model": model, "input": input_tokens, "output": output_tokens, "cost": cost})

    def report(self) -> str:
        return (
            f"Total: {len(self.calls)} calls, "
            f"{self.total_input_tokens} input + {self.total_output_tokens} output tokens, "
            f"${self.total_cost:.4f}"
        )
```

### Streaming Responses

```python
# LangGraph streaming (assumes `app` and HumanMessage from the Basic Agent setup above)
from langchain_core.messages import HumanMessage

async for event in app.astream_events(
    {"messages": [HumanMessage(content="Hello")]},
    version="v2",
):
    if event["event"] == "on_chat_model_stream":
        chunk = event["data"]["chunk"]
        print(chunk.content, end="", flush=True)
    elif event["event"] == "on_tool_start":
        print(f"\n[Using tool: {event['name']}]")
```

### Fallback Models

```python
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic

primary = ChatOpenAI(model="gpt-5", timeout=30)
fallback = ChatAnthropic(model="claude-sonnet-4-6", timeout=30)

model = primary.with_fallbacks([fallback])
# Automatically tries fallback if primary fails (cross-provider is the point —
# survives a single vendor's outage or rate-limit spike)
```

---

## Modern Agent Surfaces (2025-2026)

### Anthropic Memory Tool (public beta)

Lets Claude store and retrieve files across turns so long-running agents don't blow context. Operations: `view`, `create`, `str_replace`, `insert`, `delete`, `rename`. You implement the storage backend (a per-conversation `/memories/` directory on disk or object store) by handling `tool_use` blocks named `"memory"` and returning `tool_result` blocks.

```python
# Still public beta as of Jun 2026 — pass the memory tool + beta header.
# Verify the current tool-type version string and header at:
# https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool

response = client.beta.messages.create(
    model="claude-sonnet-4-6",
    max_tokens=4096,
    betas=["context-management-2025-06-27"],          # current beta flag as of Jun 2026
    tools=[{"type": "memory_20250818", "name": "memory"}],  # confirm latest memory_* version in docs
    messages=conversation,
)
```

Pair with **prompt caching** on a long system prompt so the agent's "personality + memory index" is cached across turns: cached input is billed at ~10% of the base input price (a ~90% discount). Combine with **tool-use context clearing** (same beta header) to drop stale tool results from the window automatically.

### OpenAI Responses API (March 2025)

Stateful successor to Chat Completions: tools, file/web/MCP, reasoning models, and conversation `store: true` for server-held state.

```python
# pip install openai
from openai import OpenAI
client = OpenAI()

resp = client.responses.create(
    model="gpt-5",
    input="Summarize the latest issues in repo X and open one for the worst.",
    store=True,
    reasoning={"effort": "medium"},
    tools=[
        {
            "type": "mcp",
            "server_label": "github",
            "server_url": "https://mcp.github.com",  # remote MCP server
            "require_approval": "never",
        },
    ],
)
print(resp.output_text)
```

The `mcp` tool type lets the model call any remote MCP server (Streamable HTTP) without you proxying every call. See the `mcp-client` skill for client patterns and `mcp-server-builder` for shipping your own.

---

## Safety: Prompt Injection Defense

### Input Validation

```python
import re

def sanitize_user_input(text: str) -> str:
    """Basic prompt injection defense."""
    # Remove common injection patterns
    suspicious_patterns = [
        r"ignore (?:all )?(?:previous |prior |above )?instructions",
        r"you are now",
        r"new instructions:",
        r"system prompt:",
        r"</s>|<\|im_end\|>|<\|endoftext\|>",
    ]
    for pattern in suspicious_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            return "[Input contained suspicious patterns and was filtered]"
    return text
```

### Output Validation

```python
from pydantic import BaseModel, field_validator

class AgentResponse(BaseModel):
    answer: str
    sources: list[str]
    confidence: float

    @field_validator("answer")
    @classmethod
    def no_system_leaks(cls, v: str) -> str:
        forbidden = ["system prompt", "you are an AI", "as an AI language model"]
        for phrase in forbidden:
            if phrase.lower() in v.lower():
                raise ValueError("Response contained forbidden content")
        return v

    @field_validator("confidence")
    @classmethod
    def valid_range(cls, v: float) -> float:
        if not 0 <= v <= 1:
            raise ValueError("Confidence must be between 0 and 1")
        return v
```

---

## Evaluation

### LLM-as-Judge

```python
from langchain_core.messages import HumanMessage
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, Field

class Judgement(BaseModel):
    accuracy: int = Field(ge=1, le=5, description="Does it match the reference?")
    completeness: int = Field(ge=1, le=5, description="Does it cover all key points?")
    clarity: int = Field(ge=1, le=5, description="Is it well-written and clear?")
    reasoning: str

# Use a strong, separate judge model; structured output removes brittle json.loads parsing.
eval_model = ChatOpenAI(model="gpt-5", temperature=0).with_structured_output(Judgement)

EVAL_PROMPT = """Rate the AI response on a 1-5 scale for accuracy, completeness, and clarity.

Question: {question}
Response: {response}
Reference Answer: {reference}"""

async def evaluate_response(question: str, response: str, reference: str) -> Judgement:
    return await eval_model.ainvoke(
        EVAL_PROMPT.format(question=question, response=response, reference=reference)
    )

# Run evaluation suite
async def run_eval_suite(agent, test_cases: list[dict]) -> dict:
    results = []
    for case in test_cases:
        out = await agent.ainvoke({"messages": [HumanMessage(content=case["question"])]})
        answer = out["messages"][-1].content
        score = await evaluate_response(case["question"], answer, case["expected"])
        results.append({"case": case["question"], "score": score})

    n = len(results)
    avg_accuracy = sum(r["score"].accuracy for r in results) / n
    avg_completeness = sum(r["score"].completeness for r in results) / n
    return {"results": results, "avg_accuracy": avg_accuracy, "avg_completeness": avg_completeness}
```

> **Bias note:** an LLM judge favors verbose, confident, same-family answers and is itself promptable. Calibrate against a human-labeled gold set, randomize answer order for pairwise comparisons, and never let a model grade its own output unchecked in CI.

### Regression Testing

```python
# tests/test_agent.py  (pytest-asyncio; `agent` is your compiled app from above)
import pytest
from langchain_core.messages import HumanMessage
from my_agent import agent

REGRESSION_CASES = [
    {
        "input": "What's the refund policy?",
        "must_contain": ["30 days", "full refund"],
        "must_not_contain": ["no refunds"],
    },
    {
        "input": "How do I cancel my subscription?",
        "must_contain": ["settings", "billing"],
        "must_use_tools": ["search_knowledge_base"],
    },
]

@pytest.mark.parametrize("case", REGRESSION_CASES)
async def test_agent_regression(case):
    result = await agent.ainvoke({"messages": [HumanMessage(content=case["input"])]})
    answer = result["messages"][-1].content.lower()

    for phrase in case.get("must_contain", []):
        assert phrase.lower() in answer, f"Missing: {phrase}"

    for phrase in case.get("must_not_contain", []):
        assert phrase.lower() not in answer, f"Should not contain: {phrase}"
```

---

## Checklist: Production Agent

- [ ] Tools have clear descriptions, input validation, and error handling
- [ ] Timeouts on all tool calls and LLM invocations
- [ ] Cost tracking per conversation/user
- [ ] Fallback models configured
- [ ] Streaming for user-facing responses
- [ ] Conversation memory with size limits
- [ ] Prompt injection defense (input sanitization)
- [ ] Output validation (no system prompt leaks)
- [ ] Human-in-the-loop for high-stakes actions
- [ ] Checkpointing for long-running workflows
- [ ] Evaluation suite with regression tests
- [ ] Token usage monitoring and alerts
- [ ] Rate limiting per user
- [ ] Logging of all tool calls and responses
- [ ] Graceful degradation when tools fail

---

## MCP (Model Context Protocol) Integration

MCP is the standard for connecting agents to external tools. Instead of hardcoding tool implementations, agents connect to MCP servers that expose tools over a standardized protocol.

### Building an MCP Server

```typescript
// mcp-server.ts — expose tools for any MCP-compatible agent
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import express from 'express';

const server = new McpServer({ name: 'my-tools', version: '1.0.0' });

// Register tools with typed parameters
server.tool('search_docs', 'Search internal documentation by query', {
  query: { type: 'string', description: 'Search query' },
  limit: { type: 'number', description: 'Max results (default 10)' },
}, async ({ query, limit = 10 }) => {
  const results = await searchIndex(query, limit);
  return {
    content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
  };
});

server.tool('create_ticket', 'Create a support ticket in Jira', {
  title: { type: 'string', description: 'Ticket title' },
  priority: { type: 'string', description: 'low | medium | high | critical' },
  description: { type: 'string', description: 'Detailed description' },
}, async ({ title, priority, description }) => {
  // Validate before acting — agents will pass garbage sometimes
  if (!['low', 'medium', 'high', 'critical'].includes(priority)) {
    throw new Error(`Invalid priority "${priority}". Must be: low, medium, high, critical`);
  }
  const ticket = await jira.createIssue({ summary: title, priority, description });
  return {
    content: [{ type: 'text', text: `Created ticket ${ticket.key}: ${ticket.self}` }],
  };
});

// Streamable HTTP transport (replaces deprecated SSE transport)
const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });
  await server.connect(transport);
  await transport.handleRequest(req, res);
});

app.listen(3100, () => console.log('MCP server on :3100'));
```

### Connecting LangGraph to MCP Tools

Don't hand-roll an MCP client. Use the official `langchain-mcp-adapters`, which speaks **Streamable HTTP** (the transport the server above exposes at `/mcp`) and returns ready-to-use LangChain tools — handling schema conversion, sessions, and reconnects for you. The deprecated `sse_client` transport will not talk to a `StreamableHTTPServerTransport` server.

```python
# pip install langchain-mcp-adapters langgraph langchain-openai
import asyncio
from langchain_mcp_adapters.client import MultiServerMCPClient
from langgraph.prebuilt import create_react_agent
from langchain_openai import ChatOpenAI

async def main():
    client = MultiServerMCPClient({
        "my-tools": {
            "transport": "streamable_http",         # matches the server's /mcp endpoint
            "url": "http://localhost:3100/mcp",
            "headers": {"Authorization": "Bearer ${MCP_TOKEN}"},  # optional auth
        },
        # add more servers here; tools are merged into one list
    })

    tools = await client.get_tools()  # list[BaseTool], names/schemas come from the server
    agent = create_react_agent(ChatOpenAI(model="gpt-5", temperature=0), tools)

    result = await agent.ainvoke(
        {"messages": [{"role": "user", "content": "Search the docs for CORS config and open a ticket."}]}
    )
    print(result["messages"][-1].content)

asyncio.run(main())
```

`MultiServerMCPClient` is **stateless by default** — each tool call opens a fresh session and tears it down. For tools that need a persistent session (e.g. sampling, server-side state), wrap calls in `async with client.session("my-tools") as session:`. To call a remote MCP server directly from a frontier model without an adapter, use the provider's native MCP tool type (see the OpenAI Responses example above, and the `mcp-client` / `mcp-server-builder` sibling skills).

---

## Deployment: Containerized Agent

```dockerfile
# Dockerfile — production agent with health checks
FROM python:3.12-slim AS base

RUN pip install --no-cache-dir langgraph langchain-openai redis uvicorn fastapi

WORKDIR /app
COPY . .

# Non-root user
RUN useradd -m agent && chown -R agent:agent /app
USER agent

# python:3.12-slim has no curl — use a stdlib check (no extra packages, no shell deps)
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD ["python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/health', timeout=4).status==200 else 1)"]

EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
```

```python
# server.py — FastAPI wrapper with streaming, cost tracking, rate limiting
import json, time, tiktoken
from collections import defaultdict
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage

from my_agent import agent  # your compiled LangGraph app (see "Basic Agent" above)

MODEL = "gpt-5"
PRICE_IN, PRICE_OUT = 1.25, 10.00  # USD/1M tokens for MODEL — keep in sync with CostTracker.PRICES

app = FastAPI()
start_time = time.time()
try:
    enc = tiktoken.encoding_for_model(MODEL)
except KeyError:
    enc = tiktoken.get_encoding("o200k_base")  # fallback for models tiktoken doesn't know yet

# In-memory rate limiter (use Redis in production)
request_counts: dict[str, list[float]] = defaultdict(list)
RATE_LIMIT = 20  # requests per minute

@app.middleware("http")
async def rate_limit(request: Request, call_next):
    api_key = request.headers.get("x-api-key", "anonymous")
    now = time.time()
    request_counts[api_key] = [t for t in request_counts[api_key] if now - t < 60]
    if len(request_counts[api_key]) >= RATE_LIMIT:
        raise HTTPException(429, "Rate limit exceeded")
    request_counts[api_key].append(now)
    return await call_next(request)

@app.post("/chat")
async def chat(request: Request):
    body = await request.json()
    user_msg = body["message"]
    api_key = request.headers.get("x-api-key")

    # Token counting for cost tracking
    input_tokens = len(enc.encode(user_msg))

    async def stream():
        total_output_tokens = 0
        async for event in agent.astream_events(
            {"messages": [HumanMessage(content=user_msg)]},
            version="v2",
        ):
            if event["event"] == "on_chat_model_stream":
                chunk = event["data"]["chunk"].content
                if chunk:
                    total_output_tokens += len(enc.encode(chunk))
                    yield f"data: {json.dumps({'text': chunk})}\n\n"

        # Log cost using the model's own price (see PRICE_IN/PRICE_OUT above).
        # Note: tiktoken counts only the raw text; it does NOT include tool-call
        # args, system prompt, or reasoning tokens — for exact billing read
        # usage_metadata off the final message instead of estimating here.
        cost = (input_tokens * PRICE_IN + total_output_tokens * PRICE_OUT) / 1_000_000
        yield f"data: {json.dumps({'done': True, 'tokens': {'in': input_tokens, 'out': total_output_tokens}, 'cost_usd': round(cost, 6)})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")

@app.get("/health")
async def health():
    return {"status": "ok", "model": MODEL, "uptime": time.time() - start_time}
```

---

## Cost Control

```python
# Cost-aware model routing — use cheap models when possible
from datetime import datetime, timezone
from langchain_openai import ChatOpenAI

class BudgetExceededError(Exception):
    pass

# Prices in comments are USD/1M input tokens, list as of Jun 2026 — verify before relying on them.
MODELS = {
    "fast": ChatOpenAI(model="gpt-5-nano", temperature=0),    # cheapest tier — classification, routing
    "smart": ChatOpenAI(model="gpt-5", temperature=0),        # ~$1.25/1M in — general work
    "reasoning": ChatOpenAI(model="o3"),                       # ~$2/1M in — multi-step logic/math (no temperature)
}

def select_model(task_type: str, input_length: int) -> str:
    """Route to cheapest model that can handle the task."""
    if task_type == "classification" or input_length < 500:
        return "fast"
    if task_type in ("code_generation", "complex_reasoning"):
        return "reasoning"
    return "smart"

# Budget enforcement
class BudgetTracker:
    def __init__(self, daily_limit_usd: float = 10.0):
        self.daily_limit = daily_limit_usd
        self.spent_today = 0.0
        self.last_reset = datetime.now(timezone.utc).date()

    def check_budget(self, estimated_cost: float) -> bool:
        if datetime.now(timezone.utc).date() > self.last_reset:
            self.spent_today = 0.0
            self.last_reset = datetime.now(timezone.utc).date()
        if self.spent_today + estimated_cost > self.daily_limit:
            raise BudgetExceededError(f"Daily budget ${self.daily_limit} exceeded")
        return True

    def record_spend(self, cost: float):
        self.spent_today += cost
```
