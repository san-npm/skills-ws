## Contents

- Onboarding Drip Sequence
- Behavioral Triggers
- Onboarding Email Workflow (Text Diagram)

## Onboarding Drip Sequence

### Behavioral Triggers

Don't just send on a timer — trigger based on actions:

```
SIGNUP
├── Completed setup?
│   ├── YES → Send "Power user tips" sequence
│   └── NO → Send "Complete your setup" nudge (Day 1, 3, 5)
├── Used key feature?
│   ├── YES → Send "Advanced [feature]" guide
│   └── NO → Send "[Feature] walkthrough" with video
├── Invited team?
│   ├── YES → Send "Team collaboration tips"
│   └── NO → Send "Better with your team" nudge
└── Still active at Day 7?
    ├── YES → Send "What's new" + expansion content
    └── NO → Enter re-engagement sequence
```

### Onboarding Email Workflow (Text Diagram)

```
[Signup] ──→ [Welcome Email] ──→ Wait 1 day
                                      │
                              ┌───────┴───────┐
                              │               │
                        [Setup Done?]    [Setup Not Done]
                              │               │
                      [Power Tips]    [Setup Nudge #1]
                              │               │
                        Wait 2 days     Wait 2 days
                              │               │
                      [Feature Deep     [Setup Nudge #2]
                        Dive]                 │
                              │         Wait 2 days
                        Wait 3 days           │
                              │       ┌───────┴───────┐
                      [Case Study]    │               │
                              │  [Setup Done?]   [Final Nudge +
                        Wait 4 days    │          Offer Help]
                              │  [Power Tips]         │
                      [Upgrade              Wait 5 days
                        Prompt]                  │
                                          [Re-engagement
                                            Sequence]
```

---
