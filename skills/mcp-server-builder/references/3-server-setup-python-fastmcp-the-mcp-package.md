## Contents

- 3. Server Setup — Python (FastMCP, the mcp package)
- Project Init
- FastMCP server — stdio + Streamable HTTP from one definition
- Mounting FastMCP under FastAPI / Starlette

## 3. Server Setup — Python (FastMCP, the `mcp` package)

Use **FastMCP** (shipped inside the official `mcp` package as `mcp.server.fastmcp`). Decorate plain typed functions; FastMCP derives the JSON Schema from type hints + docstrings and supports stdio and Streamable HTTP from the same definition.

### Project Init

```bash
mkdir my-mcp-server-py && cd my-mcp-server-py
python -m venv .venv && source .venv/bin/activate
pip install "mcp[cli]" httpx pydantic uvicorn   # mcp[cli] adds the `mcp` dev/inspector CLI
```

### FastMCP server — stdio + Streamable HTTP from one definition

```python
# server.py
import json
from urllib.parse import quote
import httpx
from pydantic import BaseModel, Field
from mcp.server.fastmcp import FastMCP

# stateless_http + json_response = best scaling for tool-only API wrappers (see §2b rationale).
# Drop both kwargs for a stateful server with sessions; FastMCP serves a single /mcp endpoint.
mcp = FastMCP("my-mcp-server", stateless_http=True, json_response=True)

@mcp.tool()
async def dns_lookup(domain: str, type: str = "A") -> str:
    """Resolve DNS records for a domain. `type` is one of A, AAAA, CNAME, MX, NS, TXT, SOA."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"https://dns.google/resolve?name={quote(domain)}&type={type}")
        return json.dumps(resp.json(), indent=2)

# Return a Pydantic model (or TypedDict / dataclass) to get an output schema + structuredContent
# automatically — the client receives both a text rendering and machine-readable structured data.
class SSLInfo(BaseModel):
    valid_from: str = Field(description="Certificate validity start")
    valid_to: str = Field(description="Certificate expiry")
    issuer: str
    days_remaining: int

@mcp.tool()
async def ssl_check(domain: str) -> SSLInfo:
    """Check SSL/TLS certificate details for a domain (no scheme, e.g. example.com)."""
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"https://ssl-checker.io/api/v1/check/{quote(domain)}")
        d = resp.json()["result"]
        return SSLInfo(valid_from=d["valid_from"], valid_to=d["valid_till"],
                       issuer=d["issuer_o"], days_remaining=d["days_left"])

@mcp.resource("info://server")
def server_info() -> str:
    """Server metadata and capabilities."""
    return json.dumps({"name": "my-mcp-server", "version": "1.0.0", "tools": 2})

@mcp.prompt()
def analyze_domain(domain: str) -> str:
    """Reusable prompt: full domain analysis."""
    return (f'Analyze "{domain}": 1) DNS records (A, MX, NS, TXT). '
            "2) SSL certificate. 3) WHOIS. Summarize findings with any security concerns.")

if __name__ == "__main__":
    import sys
    # `python server.py` → stdio (local). `python server.py http` → Streamable HTTP on /mcp.
    mcp.run(transport="streamable-http" if "http" in sys.argv else "stdio")
```

Run it:

```bash
python server.py            # stdio — for Claude Desktop / Claude Code
python server.py http       # Streamable HTTP — serves http://localhost:8000/mcp
mcp dev server.py           # launch MCP Inspector against the stdio server
```

### Mounting FastMCP under FastAPI / Starlette

To expose `/mcp` alongside your existing HTTP API, mount `streamable_http_app()` and run its session manager in the app lifespan:

```python
# app.py — uvicorn app:app
import contextlib
from starlette.applications import Starlette
from starlette.routing import Mount
from server import mcp   # the FastMCP instance above

@contextlib.asynccontextmanager
async def lifespan(app: Starlette):
    # REQUIRED: run the session manager so /mcp works when mounted.
    async with mcp.session_manager.run():
        yield

app = Starlette(routes=[Mount("/", app=mcp.streamable_http_app())], lifespan=lifespan)
```

> **Legacy low-level API.** The pre-FastMCP `from mcp.server import Server` with `@server.list_tools()` / `@server.call_tool()` and `from mcp.server.sse import SseServerTransport` still exist for fine-grained control and old SSE clients, but they are verbose and SSE is deprecated — prefer FastMCP + Streamable HTTP for anything new.

---
