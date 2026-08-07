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

MODEL = "gpt-5.5"
PRICE_IN, PRICE_OUT = 5.00, 30.00  # USD/1M tokens for MODEL; keep in sync with CostTracker.PRICES

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
