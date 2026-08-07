## Appendix C: Tool Registration Helper

```typescript
// DRY helper for registering tools with consistent error handling and logging
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z, ZodRawShape } from "zod";
import { logger } from "./monitoring/logger.js";
import { AuthResult } from "./auth/middleware.js";

type ToolHandler<T> = (args: T) => Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }>;

export function registerTool<T extends ZodRawShape>(
  server: McpServer,
  name: string,
  description: string,
  schema: T,
  handler: ToolHandler<z.objectOutputType<z.ZodObject<T>, z.ZodTypeAny>>,
  auth?: AuthResult
) {
  server.registerTool(name, { description, inputSchema: schema }, async (args) => {
    const start = Date.now();
    try {
      const result = await handler(args as any);
      logger.log({
        level: "info",
        tier: auth?.tier || "free",
        tool: name,
        durationMs: Date.now() - start,
        userId: auth?.userId,
      });
      return result;
    } catch (err: any) {
      logger.log({
        level: "error",
        tier: auth?.tier || "free",
        tool: name,
        durationMs: Date.now() - start,
        userId: auth?.userId,
        error: err.message,
      });
      return {
        content: [{ type: "text" as const, text: `Error in ${name}: ${err.message}` }],
        isError: true,
      };
    }
  });
}
```
