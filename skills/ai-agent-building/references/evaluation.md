## Contents

- Evaluation
- LLM-as-Judge
- Regression Testing

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
eval_model = ChatOpenAI(model="gpt-5.5").with_structured_output(Judgement)

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
