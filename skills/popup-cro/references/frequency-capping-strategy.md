## Contents

- Frequency Capping Strategy
- Rules
- Implementation
- Priority System

## Frequency Capping Strategy

### Rules

| Scenario | Cap | Cookie Duration |
|----------|-----|-----------------|
| User dismissed popup | Don't show again for 7-30 days | 7-30 day cookie |
| User converted (signed up) | Never show that popup again | Permanent cookie or user flag |
| User saw but didn't interact | Show again in 3-7 days | 3-7 day cookie |
| Exit intent fired | Once per session, max 1/week | Session + 7-day cookie |
| Announcement banner | Until dismissed | Session or permanent |
| Different popup types | Max 1 popup per page view | Page-level flag |

### Implementation

```javascript
function shouldShowPopup(popupId) {
  // Check if user already converted
  if (getCookie('converted_' + popupId)) return false;

  // Check frequency cap
  const lastShown = getCookie('popup_shown_' + popupId);
  if (lastShown) {
    const daysSince = (Date.now() - parseInt(lastShown)) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) return false; // 7-day cap
  }

  // Check if any popup shown on this page already
  if (window.__popupShownThisPage) return false;

  return true;
}

function onPopupShown(popupId) {
  setCookie('popup_shown_' + popupId, Date.now().toString(), 30);
  window.__popupShownThisPage = true;
}

function onPopupConverted(popupId) {
  setCookie('converted_' + popupId, 'true', 365);
}
```

### Priority System

When multiple popups could fire, use priority:

```
Priority 1: Cart abandonment (revenue impact)
Priority 2: Exit intent with offer (lead capture)
Priority 3: Content upgrade (contextual value)
Priority 4: Newsletter signup (general)
Priority 5: Announcement banner (informational)
Priority 6: Cookie/consent banner (compliance — show first, before any marketing popup;
            must be proportionate and not block content as a pretext)
```

---
