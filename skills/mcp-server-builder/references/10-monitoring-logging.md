## 10. Monitoring & Logging

```typescript
// src/monitoring/logger.ts

interface LogEntry {
  timestamp: string;
  level: "info" | "warn" | "error";
  tier: "free" | "pro" | "x402";
  tool: string;
  durationMs: number;
  userId?: string;
  ip?: string;
  error?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private tierCounts = { free: 0, pro: 0, x402: 0 };
  private toolCounts = new Map<string, number>();

  log(entry: Omit<LogEntry, "timestamp">) {
    const full: LogEntry = { ...entry, timestamp: new Date().toISOString() };
    this.logs.push(full);
    this.tierCounts[entry.tier]++;
    this.toolCounts.set(entry.tool, (this.toolCounts.get(entry.tool) || 0) + 1);

    // Structured JSON logging for log aggregation (CloudWatch, Datadog, etc.)
    console.log(JSON.stringify(full));

    // Keep last 10k entries in memory
    if (this.logs.length > 10_000) this.logs = this.logs.slice(-5_000);
  }

  getStats() {
    return {
      totalRequests: this.logs.length,
      byTier: { ...this.tierCounts },
      byTool: Object.fromEntries(this.toolCounts),
      recentErrors: this.logs.filter(l => l.level === "error").slice(-10),
      avgDurationMs: this.logs.length
        ? Math.round(this.logs.reduce((sum, l) => sum + l.durationMs, 0) / this.logs.length)
        : 0,
    };
  }
}

export const logger = new Logger();

// Usage wrapper for instrumented tool calls
export async function instrumentedToolCall(
  toolName: string,
  tier: "free" | "pro" | "x402",
  userId: string | undefined,
  fn: () => Promise<any>
) {
  const start = Date.now();
  try {
    const result = await fn();
    logger.log({ level: "info", tier, tool: toolName, durationMs: Date.now() - start, userId });
    return result;
  } catch (err: any) {
    logger.log({ level: "error", tier, tool: toolName, durationMs: Date.now() - start, userId, error: err.message });
    throw err;
  }
}
```

---
