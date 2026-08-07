## Contents

- 15. Common Patterns & Gotchas
- Pattern: Tool That Returns Multiple Content Types
- Pattern: Long-Running Tool with Progress
- Gotcha: SSE Connection Lifecycle (legacy /sse transport — §2c)
- Gotcha: Don't Leak Upstream API Keys in Error Messages
- Gotcha: stdio Servers Must Not Write to stdout

## 15. Common Patterns & Gotchas

### Pattern: Tool That Returns Multiple Content Types

```typescript
server.registerTool("analyze_page", {
  description: "Analyze a webpage: screenshot + extracted text",
  inputSchema: { url: z.string().url() },
}, async ({ url }) => {
  const [screenshot, text] = await Promise.all([
    captureScreenshot(url),
    extractPageText(url),
  ]);
  return {
    content: [
      { type: "image", data: screenshot, mimeType: "image/png" },
      { type: "text", text: `## Page Analysis\n\n${text}` },
    ],
  };
});
```

### Pattern: Long-Running Tool with Progress

```typescript
server.registerTool("bulk_dns", {
  description: "Look up DNS for multiple domains",
  inputSchema: { domains: z.array(z.string()).max(50) },
}, async ({ domains }) => {
  const results: string[] = [];
  for (let i = 0; i < domains.length; i++) {
    const data = await dnsLookup(domains[i]);
    results.push(`${domains[i]}: ${JSON.stringify(data)}`);
  }
  return { content: [{ type: "text", text: results.join("\n\n") }] };
});
```

### Gotcha: SSE Connection Lifecycle (legacy `/sse` transport — §2c)

Applies to the deprecated HTTP+SSE path only. With Streamable HTTP the SDK manages the GET stream for you; you mainly handle teardown via `transport.onclose` (§2a).

```typescript
// Legacy SSE connections can die silently. Always handle cleanup:
app.get("/sse", async (req, res) => {
  const transport = new SSEServerTransport("/messages", res);
  const server = createMcpServer();
  transports.set(transport.sessionId, transport);

  // Heartbeat to detect dead connections
  const heartbeat = setInterval(() => {
    try { res.write(":ping\n\n"); } catch { clearInterval(heartbeat); }
  }, 30_000);

  res.on("close", () => {
    clearInterval(heartbeat);
    transports.delete(transport.sessionId);
    console.log(`Session ${transport.sessionId} disconnected`);
  });

  await server.connect(transport);
});
```

### Gotcha: Don't Leak Upstream API Keys in Error Messages

```typescript
// BAD
return { content: [{ type: "text", text: `Error calling https://api.example.com?key=SECRET123` }] };

// GOOD
return { content: [{ type: "text", text: `Screenshot API returned error: ${response.status} ${response.statusText}` }], isError: true };
```

### Gotcha: stdio Servers Must Not Write to stdout

```typescript
// BAD — breaks JSON-RPC framing
console.log("Debug info");

// GOOD — use stderr for debug output
console.error("Debug info");
```

---
