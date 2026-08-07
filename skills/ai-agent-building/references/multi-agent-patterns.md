## Contents

- Multi-Agent Patterns
- Supervisor Pattern

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
