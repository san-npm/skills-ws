## Agent Architecture Fundamentals

An AI agent is an LLM that can take actions. That's it. Everything else is engineering around that core loop:

```
Observe → Think → Act → Observe → Think → Act → ...
```

The complexity comes from: which actions? how to recover from failures? how to know when to stop? how to not bankrupt you on API calls?

---
