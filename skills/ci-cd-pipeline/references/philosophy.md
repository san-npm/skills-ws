## Philosophy

A CI/CD pipeline isn't a YAML file — it's the immune system of your codebase. Every merge to main should be a non-event. If deploying makes you nervous, your pipeline is broken.

**Core principles:**
- Fast feedback: developers should know if they broke something within 5 minutes
- Reproducible: same commit = same result, every time
- Progressive: unit → integration → e2e → staging → canary → production
- Reversible: any deployment can be rolled back in under 2 minutes

---
