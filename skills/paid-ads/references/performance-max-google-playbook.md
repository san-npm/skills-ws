## Contents

- Performance Max (Google) Playbook
- Asset Groups
- Audience Signals (Critical)
- PMax Gotchas

## Performance Max (Google) Playbook

### Asset Groups

```
Asset Group = theme-based collection of:
├── Images: 15+ (landscape, square, portrait)
├── Logos: 5+
├── Videos: 5+ (or Google auto-generates — they're bad, provide your own)
├── Headlines: 5 (30 char) + 5 long headlines (90 char)
├── Descriptions: 4 (60 char) + 1 (90 char)
├── Final URL
├── Display path
├── CTA
└── Audience signals (suggestions, not restrictions)
```

### Audience Signals (Critical)

Audience signals don't restrict targeting — they guide the algorithm. Provide strong signals:

- **Custom segments:** Your best keywords + competitor URLs + apps
- **Your data:** Customer lists, converters, high-value segments
- **Interests/demographics:** In-market segments relevant to your product

### PMax Gotchas

- **PMax cannibalizes brand search.** Stop it from eating cheap branded clicks (and over-reporting credit) using, in order of preference (as of Jun 2026):
  - **Brand exclusion lists** — apply a brand list at the *campaign* level to keep PMax off your own + others' brand terms. This is the modern, self-serve replacement for begging a Google rep, available in the campaign settings UI and Google Ads API.
  - **Account-level negative keywords** — supported self-serve in the UI/API; use to block brand or junk queries account-wide.
  - **Campaign-level negative keywords for PMax** — Google has been rolling these out; if available in your account, use them for finer control than account-level.
  - Legacy path: request negatives via a Google rep only if the above aren't yet enabled for you.
- **Limited placement/audience reporting** — you can't fully see which placements/audiences convert; use the asset-group and (limited) insights reports plus search-term insights.
- **Run PMax alongside standard Search** — keep a dedicated branded Search campaign and exact-match high-value terms in standard Search; don't let PMax replace Search entirely.
- Asset performance ratings (Low/Good/Best) guide optimization — replace "Low" assets.
- Give it 4-6 weeks and 50+ conversions before major changes.

---
