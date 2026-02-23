---
name: ai-agent-design
description: Architecture patterns, tool design, memory systems, and deployment strategies for building reliable AI agents.
category: dev
---

# AI Agent Design

## Architecture Patterns

| Pattern | Flow | Best For |
|---|---|---|
| **ReAct** | Think → Act → Observe → loop | General tool-use agents |
| **Plan-and-Execute** | Plan all steps → execute sequentially | Multi-step tasks, research |
| **Reflexion** | Act → Evaluate → Reflect → retry | Self-improving, complex reasoning |

### ReAct Loop

```python
while not done:
    thought = llm(f"Task: {task}\nObservations: {obs}\nThink:")
    action = llm(f"{thought}\nChoose action and params:")
    observation = execute_tool(action)
    if is_final_answer(observation):
        done = True
```

### Plan-and-Execute

```python
plan = llm(f"Break this task into steps: {task}")  # Planner (strong model)
for step in plan:
    result = llm(f"Execute: {step}\nContext: {prior_results}")  # Executor (can be cheaper model)
    if needs_replan(result):
        plan = llm(f"Replan given: {result}")
```

## Tool Use Design

### Function Definition Checklist

- [ ] Name is verb-noun (e.g., `search_docs`, `create_ticket`)
- [ ] Description says **when** to use AND **when not** to use
- [ ] Parameters have types, descriptions, and examples
- [ ] Required vs optional clearly marked
- [ ] Error responses are structured and actionable

### Error Handling

```python
def execute_tool(name, params):
    try:
        result = tools[name](**params)
        return {"status": "success", "data": result}
    except ToolNotFound:
        return {"status": "error", "message": f"Unknown tool: {name}", "available": list(tools)}
    except ValidationError as e:
        return {"status": "error", "message": f"Invalid params: {e}", "expected": tools[name].schema}
    except Exception as e:
        return {"status": "error", "message": str(e), "retryable": True}
```

**Always** return errors to the LLM as structured data — let it self-correct.

## Memory Systems

| Type | Scope | Implementation |
|---|---|---|
| **Short-term** | Current conversation | Context window, sliding window |
| **Working** | Current task | Scratchpad variable, state dict |
| **Episodic** | Past interactions | Vector DB with session metadata |
| **Semantic** | Facts and knowledge | Knowledge graph or vector store |

### Practical Memory Architecture

```
User message → Retrieve relevant memories (semantic search)
            → Inject into context (ranked by recency + relevance)
            → Generate response
            → Extract & store new memories (background)
```

**Memory extraction prompt:** "Extract key facts, decisions, and user preferences from this conversation that would be useful in future interactions."

## Multi-Agent Orchestration

| Pattern | Description | Use Case |
|---|---|---|
| **Supervisor** | Router agent delegates to specialists | Customer support, triage |
| **Swarm** | Agents hand off based on capability | Complex workflows |
| **Debate** | Agents argue, judge decides | High-stakes decisions |
| **Pipeline** | Sequential processing chain | Data processing, content |

### Supervisor Pattern

```python
supervisor_prompt = """Route to the appropriate agent:
- researcher: information gathering, web search
- coder: writing/debugging code
- writer: drafting content, emails
- reviewer: quality checks, validation

Respond with: {"agent": str, "task": str}"""
```

## State Management

```python
@dataclass
class AgentState:
    task: str
    plan: list[str]
    current_step: int
    observations: list[dict]
    memory: list[str]
    status: Literal["planning", "executing", "reflecting", "done", "failed"]
    retries: int = 0
    max_retries: int = 3

# Persist between runs
def checkpoint(state: AgentState, store: str = "redis"):
    serialize_and_save(state, key=f"agent:{state.task_id}")
```

## Human-in-the-Loop

| Pattern | Trigger | Implementation |
|---|---|---|
| **Approval gate** | Before destructive actions | Pause, show plan, wait for confirm |
| **Escalation** | Confidence < threshold | Route to human with context summary |
| **Correction** | After human feedback | Update plan, retry with feedback |
| **Audit log** | Every action | Log all decisions for review |

**Rule:** Any action with side effects (send email, write DB, API call) should have an approval gate in production.

## Evaluation & Testing

| Metric | What It Measures | Target |
|---|---|---|
| Task completion rate | End-to-end success | > 85% |
| Tool call accuracy | Right tool, right params | > 95% |
| Unnecessary tool calls | Efficiency | < 10% of total |
| Safety violations | Harmful/unauthorized actions | 0 |
| Avg steps to completion | Efficiency | Minimize |

```python
# Eval harness
test_cases = [
    {"input": "Book a flight to NYC next Monday", 
     "expected_tools": ["search_flights", "book_flight"],
     "expected_outcome": "booking_confirmed"},
]
for tc in test_cases:
    trace = run_agent(tc["input"])
    assert trace.tools_used == tc["expected_tools"]
    assert trace.outcome == tc["expected_outcome"]
```

## Observability

**Every agent call should log:**
```json
{"trace_id": "abc-123", "step": 3, "model": "claude-sonnet", 
 "input_tokens": 1200, "output_tokens": 350, "latency_ms": 1800,
 "tool_called": "search_docs", "tool_success": true, "cost_usd": 0.004}
```

**Dashboard metrics:** Total cost per task, p50/p95 latency, error rate by tool, token usage trend.

## Framework Comparison

| Framework | Architecture | Strengths | Weakness |
|---|---|---|---|
| **LangGraph** | Graph-based state machine | Flexible, debuggable | Learning curve |
| **CrewAI** | Role-based multi-agent | Easy setup, good abstractions | Less control |
| **AutoGen** | Conversational agents | Multi-agent chat | Complex config |
| **OpenAI Agents SDK** | Tool-use + handoffs | Simple, native OpenAI | Vendor lock-in |

## Deployment Patterns

| Pattern | Best For | Infra |
|---|---|---|
| **Serverless** (Lambda/Cloud Run) | Short tasks < 5 min | Auto-scale, pay-per-use |
| **Long-running** (K8s/EC2) | Complex multi-step agents | Persistent state, WebSocket |
| **Event-driven** (queue + workers) | Async processing | Decoupled, reliable |

## Safety & Sandboxing

**Mandatory controls:**
- [ ] File system: restricted to workspace directory (chroot/container)
- [ ] Network: allowlist outbound domains, block internal IPs
- [ ] Resource limits: max tokens per run, timeout per tool, total cost cap
- [ ] No credential access: tools receive pre-authed clients, never raw secrets
- [ ] Audit trail: immutable log of all actions and tool calls

```python
SAFETY_CONFIG = {
    "max_tokens_per_run": 100_000,
    "max_tool_calls": 50,
    "max_cost_usd": 1.00,
    "timeout_seconds": 300,
    "allowed_domains": ["api.example.com", "docs.example.com"],
    "blocked_tools_without_approval": ["send_email", "delete_record"],
}
```

→ See `references/` for framework-specific implementation guides and safety checklists.
