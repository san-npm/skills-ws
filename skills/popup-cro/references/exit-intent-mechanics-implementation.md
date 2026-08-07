## Contents

- Exit Intent — Mechanics & Implementation
- How Exit Intent Works
- JavaScript Implementation
- Exit Intent Best Practices

## Exit Intent — Mechanics & Implementation

### How Exit Intent Works

```
Desktop: Track mouse cursor position
├── Cursor moves toward top of viewport (y < 10px)
├── Cursor velocity is upward (moving toward close/back button)
└── Trigger popup before cursor leaves the page

Mobile: No cursor — use alternative signals
├── Back button press (history API)
├── Scroll up rapidly (intent to leave)
├── Tab switch (visibility API)
└── Idle timeout (no interaction for X seconds)
```

### JavaScript Implementation

```javascript
// --- Small cookie helpers used throughout this skill ---
function setCookie(name, value, days) {
  const expires = days
    ? '; expires=' + new Date(Date.now() + days * 864e5).toUTCString()
    : ''; // omit `days` => session cookie (cleared when browser closes)
  document.cookie =
    `${name}=${encodeURIComponent(value)}${expires}; path=/; SameSite=Lax`;
}
function getCookie(name) {
  return document.cookie.split('; ').reduce((acc, c) => {
    const [k, v] = c.split('=');
    return k === name ? decodeURIComponent(v) : acc;
  }, '');
}
// `showPopup(id)` is your renderer — see the Cookie Consent section for a
// consent-aware implementation that gates analytics on tracking consent.

// Desktop exit intent
let exitIntentShown = false;

document.addEventListener('mouseout', (e) => {
  if (exitIntentShown) return;

  // Only trigger when cursor leaves through top of page
  if (e.clientY < 10 && e.relatedTarget === null) {
    exitIntentShown = true;
    showPopup('exit-intent');

    // Suppress repeats. The `exitIntentShown` flag already covers THIS page view;
    // the cookie controls how long until exit intent may fire again across visits.
    // Use 1 day for an aggressive cap, up to 7 (see "Exit Intent Best Practices").
    setCookie('exit_intent_shown', Date.now().toString(), 1); // 1-day re-show cap
  }
});

// Mobile exit intent alternatives
let lastScrollY = 0;
let scrollUpCount = 0;

window.addEventListener('scroll', () => {
  const currentY = window.scrollY;

  if (currentY < lastScrollY && currentY > 300) {
    scrollUpCount++;
    if (scrollUpCount > 3 && !exitIntentShown) {
      exitIntentShown = true;
      showPopup('exit-intent');
    }
  } else {
    scrollUpCount = 0;
  }

  lastScrollY = currentY;
});

// Visibility change (tab switch)
document.addEventListener('visibilitychange', () => {
  if (document.hidden && !exitIntentShown) {
    // User switched tabs — show on return
    document.addEventListener('visibilitychange', function onReturn() {
      if (!document.hidden) {
        showPopup('exit-intent');
        exitIntentShown = true;
        document.removeEventListener('visibilitychange', onReturn);
      }
    });
  }
});
```

### Exit Intent Best Practices

- Only fire **once per session** — never spam
- **Delay activation** by 5-10 seconds after page load (prevent false triggers)
- **Don't show** to users who already converted
- On mobile, prefer **scroll-up detection** or **idle timeout** over hacky back-button interception
- **Cookie duration:** 1-7 days between exit intent shows

---
