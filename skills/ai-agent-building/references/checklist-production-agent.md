## Checklist: Production Agent

- [ ] Tools have clear descriptions, input validation, and error handling
- [ ] Timeouts on all tool calls and LLM invocations
- [ ] Cost tracking per conversation/user
- [ ] Fallback models configured
- [ ] Streaming for user-facing responses
- [ ] Conversation memory with size limits
- [ ] Prompt injection defense (input sanitization)
- [ ] Output validation (no system prompt leaks)
- [ ] Human-in-the-loop for high-stakes actions
- [ ] Checkpointing for long-running workflows
- [ ] Evaluation suite with regression tests
- [ ] Token usage monitoring and alerts
- [ ] Rate limiting per user
- [ ] Logging of all tool calls and responses
- [ ] Graceful degradation when tools fail

---
