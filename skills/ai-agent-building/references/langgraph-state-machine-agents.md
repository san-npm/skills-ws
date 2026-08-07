## Contents

- LangGraph: State Machine Agents
- Basic Agent with Tool Calling
- Human-in-the-Loop with interrupt() and Checkpointing
- TypeScript LangGraph

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
model = ChatOpenAI(model="gpt-5.5").bind_tools(tools)  # gpt-5-family models reject temperature; use reasoning effort to steer

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

const model = new ChatOpenAI({ model: "gpt-5.5" }).bindTools([searchTool]);

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
