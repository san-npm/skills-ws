## Contents

- Modern Agent Surfaces (2025-2026)
- Anthropic Memory Tool (public beta)
- OpenAI Responses API (March 2025)

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
    model="gpt-5.5",
    input="Summarize the latest issues in repo X and open one for the worst.",
    store=True,
    reasoning={"effort": "medium"},
    tools=[
        {
            "type": "mcp",
            "server_label": "github",
            "server_url": "https://mcp.github.com",  # remote MCP server
            # Reserve "never" for trusted, read-only servers; write actions stay behind approval.
            "require_approval": "always",
        },
    ],
)
print(resp.output_text)
```

The `mcp` tool type lets the model call any remote MCP server (Streamable HTTP) without you proxying every call. See the `mcp-client` skill for client patterns and `mcp-server-builder` for shipping your own.

---
