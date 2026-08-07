## Appendix A: Graceful Shutdown

```typescript
function gracefulShutdown(signal: string) {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  for (const [id, transport] of Object.entries(transports)) {
    try { (transport as any).close?.(); } catch {}
    delete transports[id];
  }

  setTimeout(() => {
    console.log("Shutdown complete");
    process.exit(0);
  }, 5000);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
```
