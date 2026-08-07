## Contents

- MCP (Model Context Protocol) Integration
- Building an MCP Server
- Connecting LangGraph to MCP Tools

## MCP (Model Context Protocol) Integration

MCP is the standard for connecting agents to external tools. Instead of hardcoding tool implementations, agents connect to MCP servers that expose tools over a standardized protocol.

### Building an MCP Server

```typescript
// mcp-server.ts — expose tools for any MCP-compatible agent
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';
import express from 'express';

const server = new McpServer({ name: 'my-tools', version: '1.0.0' });

// Register tools with Zod-typed parameters (registerTool replaces the deprecated server.tool)
server.registerTool('search_docs', {
  description: 'Search internal documentation by query',
  inputSchema: {
    query: z.string().describe('Search query'),
    limit: z.number().optional().describe('Max results (default 10)'),
  },
}, async ({ query, limit = 10 }) => {
  const results = await searchIndex(query, limit);
  return {
    content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
  };
});

server.registerTool('create_ticket', {
  description: 'Create a support ticket in Jira',
  inputSchema: {
    title: z.string().describe('Ticket title'),
    priority: z.string().describe('low | medium | high | critical'),
    description: z.string().describe('Detailed description'),
  },
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

// Streamable HTTP transport (replaces deprecated SSE transport)
const app = express();
app.use(express.json());

app.post('/mcp', async (req, res) => {
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });
  await server.connect(transport);
  await transport.handleRequest(req, res);
});

app.listen(3100, () => console.log('MCP server on :3100'));
```

### Connecting LangGraph to MCP Tools

Don't hand-roll an MCP client. Use the official `langchain-mcp-adapters`, which speaks **Streamable HTTP** (the transport the server above exposes at `/mcp`) and returns ready-to-use LangChain tools — handling schema conversion, sessions, and reconnects for you. The deprecated `sse_client` transport will not talk to a `StreamableHTTPServerTransport` server.

```python
# pip install langchain-mcp-adapters langchain langgraph langchain-openai
import asyncio
import os
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.agents import create_agent  # replaces deprecated langgraph.prebuilt.create_react_agent
from langchain_openai import ChatOpenAI

async def main():
    client = MultiServerMCPClient({
        "my-tools": {
            "transport": "streamable_http",         # matches the server's /mcp endpoint
            "url": "http://localhost:3100/mcp",
            "headers": {"Authorization": f"Bearer {os.environ['MCP_TOKEN']}"},  # optional auth
        },
        # add more servers here; tools are merged into one list
    })

    tools = await client.get_tools()  # list[BaseTool], names/schemas come from the server
    agent = create_agent(ChatOpenAI(model="gpt-5.5"), tools)

    result = await agent.ainvoke(
        {"messages": [{"role": "user", "content": "Search the docs for CORS config and open a ticket."}]}
    )
    print(result["messages"][-1].content)

asyncio.run(main())
```

`MultiServerMCPClient` is **stateless by default** — each tool call opens a fresh session and tears it down. For tools that need a persistent session (e.g. sampling, server-side state), wrap calls in `async with client.session("my-tools") as session:`. To call a remote MCP server directly from a frontier model without an adapter, use the provider's native MCP tool type (see the OpenAI Responses example above, and the `mcp-client` / `mcp-server-builder` sibling skills).

---
