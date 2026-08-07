## Contents

- Escalation
- PagerDuty Integration via Alertmanager
- Post-Incident Template

## Escalation
- If not resolved in 30 minutes: Page the team lead
- If data loss suspected: Page the CTO
```

### PagerDuty Integration via Alertmanager

Already shown above in alertmanager config. Key decisions:

- **Critical alerts** → PagerDuty (wakes people up)
- **Warning alerts** → Slack (checked during business hours)
- **Info alerts** → Dashboard only (no notification)

### Post-Incident Template

```markdown
# Incident Post-Mortem: [Title]

**Date:** YYYY-MM-DD
**Duration:** X hours Y minutes
**Severity:** P1/P2/P3
**Impact:** X% of users affected, $Y revenue impact
