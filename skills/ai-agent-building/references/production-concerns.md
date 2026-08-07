## Contents

- Production Concerns
- Cost Tracking
- Streaming Responses
- Fallback Models

## Production Concerns

### Cost Tracking

```python
import tiktoken
from contextlib import contextmanager

class CostTracker:
    # USD per 1M tokens (input/output). List prices as of Jul 2026 (these move often);
    # treat as a starting point and re-check the official pricing pages, ideally generating
    # this dict from a dated constants file in CI:
    #   OpenAI:    https://openai.com/api/pricing
    #   Anthropic: https://platform.claude.com/docs/en/about-claude/pricing
    PRICES = {
        "gpt-5.6-sol":      {"input": 5.00, "output": 30.00},  # flagship
        "gpt-5.6-terra":    {"input": 2.50, "output": 15.00},  # balanced
        "gpt-5.6-luna":     {"input": 1.00, "output": 6.00},   # cost-optimized
        "gpt-5.5":          {"input": 5.00, "output": 30.00},
        "gpt-5.4":          {"input": 2.50, "output": 15.00},  # production workhorse
        "gpt-5.1":          {"input": 1.25, "output": 10.00},
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

primary = ChatOpenAI(model="gpt-5.5", timeout=30)
fallback = ChatAnthropic(model="claude-sonnet-4-6", timeout=30)

model = primary.with_fallbacks([fallback])
# Automatically tries fallback if primary fails (cross-provider is the point —
# survives a single vendor's outage or rate-limit spike)
```

---
