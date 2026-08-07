## Cost Control

```python
# Cost-aware model routing — use cheap models when possible
from datetime import datetime, timezone
from langchain_openai import ChatOpenAI

class BudgetExceededError(Exception):
    pass

# Prices in comments are USD/1M input tokens, list as of Jul 2026; verify before relying on them.
# gpt-5-family models reject temperature; steer with reasoning effort instead.
MODELS = {
    "fast": ChatOpenAI(model="gpt-5.4-nano"),                        # cheapest tier: classification, routing
    "smart": ChatOpenAI(model="gpt-5.5"),                            # ~$5/1M in, general work
    "reasoning": ChatOpenAI(model="gpt-5.5", reasoning_effort="high"),  # multi-step logic/math
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
