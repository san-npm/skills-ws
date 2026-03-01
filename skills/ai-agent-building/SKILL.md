---
name: ai-agent-building
description: "Production AI agent development — LangGraph, CrewAI, tool design, memory, RAG pipelines, multi-agent patterns, evaluation, and safety."
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
# pip install langgraph langchain-openai
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
model = ChatOpenAI(model="gpt-4o", temperature=0).bind_tools(tools)

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

### Human-in-the-Loop with Checkpointing

```python
from langgraph.checkpoint.sqlite import SqliteSaver
from langgraph.graph import StateGraph, START, END

class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    pending_approval: bool

def agent(state: AgentState) -> AgentState:
    response = model.invoke(state["messages"])
    return {"messages": [response]}

def check_approval_needed(state: AgentState) -> str:
    last = state["messages"][-1]
    if last.tool_calls:
        # Require approval for order creation
        for tc in last.tool_calls:
            if tc["name"] == "create_order":
                return "needs_approval"
        return "tools"
    return END

def request_approval(state: AgentState) -> AgentState:
    """Interrupt execution — human must approve before continuing."""
    return {"pending_approval": True}

# Build with interrupt
graph = StateGraph(AgentState)
graph.add_node("agent", agent)
graph.add_node("tools", ToolNode(tools))
graph.add_node("approval", request_approval)

graph.add_edge(START, "agent")
graph.add_conditional_edges("agent", check_approval_needed, {
    "tools": "tools",
    "needs_approval": "approval",
    END: END,
})
graph.add_edge("tools", "agent")
graph.add_edge("approval", "tools")  # After approval, execute the tool

# Compile with checkpointing
memory = SqliteSaver.from_conn_string(":memory:")
app = graph.compile(checkpointer=memory, interrupt_before=["approval"])

# First run — stops at approval node
config = {"configurable": {"thread_id": "order-123"}}
result = app.invoke(
    {"messages": [{"role": "user", "content": "Order 5 Widget As"}]},
    config=config,
)
# State is saved. Agent is paused.

# Human approves — resume from checkpoint
result = app.invoke(None, config=config)  # Continues from where it left off
```

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

const model = new ChatOpenAI({ model: "gpt-4o", temperature: 0 }).bindTools([searchTool]);

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
    llm="gpt-4o",
)

writer = Agent(
    role="Technical Writer",
    goal="Create clear, engaging content based on research findings",
    backstory="You're a technical writer who excels at making complex topics accessible.",
    verbose=True,
    llm="gpt-4o",
)

editor = Agent(
    role="Editor",
    goal="Review and polish the content for accuracy, clarity, and engagement",
    backstory="You're a meticulous editor with an eye for detail and factual accuracy.",
    verbose=True,
    llm="gpt-4o",
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
@with_timeout(30)
@with_retry(3)
async def query_database(sql: str) -> str:
    """Execute a read-only SQL query against the analytics database.

    Args:
        sql: A SELECT query. Must not contain INSERT, UPDATE, DELETE, or DROP.
    """
    # Validate — never let an LLM run arbitrary SQL
    forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE"]
    if any(word in sql.upper() for word in forbidden):
        return "Error: Only SELECT queries are allowed."

    result = await db.execute(sql)
    if len(result) > 100:
        return f"Query returned {len(result)} rows. Showing first 20:\n{format_rows(result[:20])}"
    return format_rows(result)
```

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
            "timestamp": datetime.now().isoformat(),
        }],
    )
    return f"Stored: {fact}"
```

---

## RAG Pipeline: Production Patterns

### Chunking Strategies

```python
from langchain_text_splitters import RecursiveCharacterTextSplitter

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
from langgraph.graph import StateGraph, START, END

class SupervisorState(TypedDict):
    messages: Annotated[list, add_messages]
    next_agent: str

def supervisor(state: SupervisorState) -> SupervisorState:
    """Route to the appropriate specialist agent."""
    response = supervisor_model.invoke([
        SystemMessage(content="""You are a supervisor routing tasks to specialists:
- researcher: for finding information
- coder: for writing or reviewing code
- writer: for creating content
Respond with JSON: {"next": "agent_name"} or {"next": "FINISH"}"""),
        *state["messages"],
    ])
    decision = json.loads(response.content)
    return {"next_agent": decision["next"]}

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
    PRICES = {  # per 1M tokens, as of 2024
        "gpt-4o": {"input": 2.50, "output": 10.00},
        "gpt-4o-mini": {"input": 0.15, "output": 0.60},
        "claude-3-5-sonnet": {"input": 3.00, "output": 15.00},
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
# LangGraph streaming
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

primary = ChatOpenAI(model="gpt-4o", timeout=30)
fallback = ChatAnthropic(model="claude-3-5-sonnet-20241022", timeout=30)

model = primary.with_fallbacks([fallback])
# Automatically tries fallback if primary fails
```

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
from pydantic import BaseModel, validator

class AgentResponse(BaseModel):
    answer: str
    sources: list[str]
    confidence: float

    @validator("answer")
    def no_system_leaks(cls, v):
        forbidden = ["system prompt", "you are an AI", "as an AI language model"]
        for phrase in forbidden:
            if phrase.lower() in v.lower():
                raise ValueError("Response contained forbidden content")
        return v

    @validator("confidence")
    def valid_range(cls, v):
        if not 0 <= v <= 1:
            raise ValueError("Confidence must be between 0 and 1")
        return v
```

---

## Evaluation

### LLM-as-Judge

```python
EVAL_PROMPT = """Rate the following AI response on a scale of 1-5:

Question: {question}
Response: {response}
Reference Answer: {reference}

Criteria:
- Accuracy (does it match the reference?)
- Completeness (does it cover all key points?)
- Clarity (is it well-written and easy to understand?)

Respond with JSON: {"accuracy": N, "completeness": N, "clarity": N, "reasoning": "..."}"""

async def evaluate_response(question: str, response: str, reference: str) -> dict:
    result = await eval_model.ainvoke(
        EVAL_PROMPT.format(question=question, response=response, reference=reference)
    )
    return json.loads(result.content)

# Run evaluation suite
async def run_eval_suite(agent, test_cases: list[dict]) -> dict:
    results = []
    for case in test_cases:
        response = await agent.ainvoke({"messages": [HumanMessage(content=case["question"])]})
        answer = response["messages"][-1].content
        score = await evaluate_response(case["question"], answer, case["expected"])
        results.append({"case": case["question"], "score": score})

    avg_accuracy = sum(r["score"]["accuracy"] for r in results) / len(results)
    avg_completeness = sum(r["score"]["completeness"] for r in results) / len(results)
    return {"results": results, "avg_accuracy": avg_accuracy, "avg_completeness": avg_completeness}
```

### Regression Testing

```python
# tests/test_agent.py
import pytest

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
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
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

// SSE transport for remote connections
const app = express();
const transports: Record<string, SSEServerTransport> = {};

app.get('/mcp/sse', async (req, res) => {
  const transport = new SSEServerTransport('/mcp/messages', res);
  transports[transport.sessionId] = transport;
  res.on('close', () => delete transports[transport.sessionId]);
  await server.connect(transport);
});

app.post('/mcp/messages', async (req, res) => {
  const sessionId = req.query.sessionId as string;
  await transports[sessionId]?.handlePostMessage(req, res);
});

app.listen(3100, () => console.log('MCP server on :3100'));
```

### Connecting LangGraph to MCP Tools

```python
# Use MCP tools inside a LangGraph agent
import asyncio
from mcp import ClientSession, sse_client

async def get_mcp_tools(server_url: str) -> list:
    """Fetch tool definitions from an MCP server and convert to LangChain tools."""
    async with sse_client(server_url) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            mcp_tools = await session.list_tools()

            langchain_tools = []
            for tool in mcp_tools.tools:
                # Create a closure for each tool
                async def call_tool(name=tool.name, **kwargs):
                    async with sse_client(server_url) as (r, w):
                        async with ClientSession(r, w) as s:
                            await s.initialize()
                            result = await s.call_tool(name, kwargs)
                            return result.content[0].text

                langchain_tools.append(StructuredTool(
                    name=tool.name,
                    description=tool.description,
                    func=call_tool,
                    args_schema=create_schema_from_json(tool.inputSchema),
                ))
            return langchain_tools
```

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

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

EXPOSE 8000
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
```

```python
# server.py — FastAPI wrapper with streaming, cost tracking, rate limiting
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
from collections import defaultdict
import time, tiktoken

app = FastAPI()
enc = tiktoken.encoding_for_model("gpt-4o")

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

        # Log cost (GPT-4o pricing: $2.50/1M input, $10/1M output)
        cost = (input_tokens * 2.50 + total_output_tokens * 10.0) / 1_000_000
        yield f"data: {json.dumps({'done': True, 'tokens': {'in': input_tokens, 'out': total_output_tokens}, 'cost_usd': round(cost, 6)})}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")

@app.get("/health")
async def health():
    return {"status": "ok", "model": "gpt-4o", "uptime": time.time() - start_time}
```

---

## Cost Control

```python
# Cost-aware model routing — use cheap models when possible
from langchain_openai import ChatOpenAI

MODELS = {
    "fast": ChatOpenAI(model="gpt-4o-mini", temperature=0),     # $0.15/1M in
    "smart": ChatOpenAI(model="gpt-4o", temperature=0),          # $2.50/1M in
    "reasoning": ChatOpenAI(model="o1", temperature=1),          # $15/1M in
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
        self.last_reset = datetime.now().date()

    def check_budget(self, estimated_cost: float) -> bool:
        if datetime.now().date() > self.last_reset:
            self.spent_today = 0.0
            self.last_reset = datetime.now().date()
        if self.spent_today + estimated_cost > self.daily_limit:
            raise BudgetExceededError(f"Daily budget ${self.daily_limit} exceeded")
        return True

    def record_spend(self, cost: float):
        self.spent_today += cost
```
