## 8. Attribution (GA4, 2026)

GA4 retired first-click, linear, time-decay, and position-based attribution in **November 2023**. Treat those as **historical or third-party-tool-only** models — they are not selectable in GA4 today. What GA4 actually offers now, grouped by which channels can receive credit:

| Reporting model (current in GA4) | Channel group it credits | How it assigns credit |
|---|---|---|
| **Data-driven (DDA)** — recommended default | Paid **and** organic channels | ML model trained on your converting *and* non-converting paths; distributes fractional credit by measured contribution |
| **Paid and organic last click** | Paid and organic channels | 100% to the **last** channel clicked (ignores direct unless direct is the only touch); YouTube engaged-views count |
| **Google paid channels last click** | **Google paid only** | 100% to the last **Google paid** click — used to reconcile with Google Ads |

Set in **Admin → Attribution settings**: choose **Data-driven**, set **reporting credit to "Paid and organic"** for the fullest picture, and set the **lookback window** to match your sales cycle (acquisition events up to 30 days; other key events 30/60/90 days).

Guidance:
- **Default to data-driven.** If a key event has **fewer than ~400 conversions for that event** within the lookback window (a property-wide total around 20,000 conversions is also commonly cited), GA4 **silently falls back to last-click** for that key event (no warning in the UI), so DDA numbers for low-volume conversions are effectively last-click; note this when interpreting reports. Consolidate sparse key events or widen the lookback window to clear the bar. Confirm the current threshold in Analytics Help before quoting it (the attribution models page, answer/10596866, covers the model list above but not the thresholds).
- **Reconcile, don't expect a match.** GA4 (event-time, its own modeling/identity) and Google Ads (conversion-time, its own modeling) will report different conversion counts for the same campaign — that is expected, not a bug. Use **"Google paid channels last click"** when you specifically need numbers closest to Ads.
- **Note the April 2026 attribution restructure** Google rolled out to GA4 reporting: re-baseline any saved attribution comparisons made before it and don't compare across the boundary. The changelog is documented separately in Analytics Help (the attribution models page, answer/10596866, does not cover the April 2026 change).
- For true multi-touch beyond GA4's three models (e.g. linear/position-based, cross-device, offline blends), do it in **BigQuery** (§6) or a dedicated attribution tool — don't claim GA4 still offers those models.

---
