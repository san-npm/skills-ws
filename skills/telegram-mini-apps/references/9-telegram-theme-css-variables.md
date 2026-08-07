## Contents

- 9. Telegram Theme CSS Variables <a name="theme-css-variables"></a>
- Available Variables
- Base CSS Setup
- Tailwind CSS Integration

## 9. Telegram Theme CSS Variables <a name="theme-css-variables"></a>

Your app should match the user's Telegram theme. **Always use CSS variables instead of hardcoding colors.** With `@telegram-apps/sdk` v3, calling `themeParams.bindCssVars()` (done in the provider in §2) injects the `--tg-theme-*` variables below and keeps them updated when the user switches light/dark — you do **not** need to read each color manually. (The raw `telegram-web-app.js` script also injects a similar set; bindCssVars normalizes naming across SDK versions.) `viewport.bindCssVars()` likewise injects `--tg-viewport-*` and the safe-area insets.

### Available Variables

```css
/* Core colors */
--tg-theme-bg-color              /* Main background */
--tg-theme-text-color            /* Primary text */
--tg-theme-hint-color            /* Secondary/hint text */
--tg-theme-link-color            /* Links */
--tg-theme-button-color          /* Primary button background */
--tg-theme-button-text-color     /* Primary button text */

/* Extended palette (Telegram 7.0+) */
--tg-theme-secondary-bg-color    /* Secondary background (cards, sections) */
--tg-theme-header-bg-color       /* Header background */
--tg-theme-accent-text-color     /* Accent text */
--tg-theme-section-bg-color      /* Section/card background */
--tg-theme-section-header-text-color  /* Section headers */
--tg-theme-subtitle-text-color   /* Subtitles */
--tg-theme-destructive-text-color /* Destructive/danger actions */

/* Viewport */
--tg-viewport-height             /* Visible viewport height */
--tg-viewport-stable-height      /* Stable height (excludes keyboard) */
```

### Base CSS Setup

```css
/* src/app/globals.css */

:root {
  /* Fallbacks for development outside Telegram */
  --tg-theme-bg-color: #ffffff;
  --tg-theme-text-color: #000000;
  --tg-theme-hint-color: #999999;
  --tg-theme-link-color: #2481cc;
  --tg-theme-button-color: #5288c1;
  --tg-theme-button-text-color: #ffffff;
  --tg-theme-secondary-bg-color: #f0f0f0;
  --tg-theme-header-bg-color: #ffffff;
  --tg-theme-accent-text-color: #2481cc;
  --tg-theme-section-bg-color: #ffffff;
  --tg-theme-section-header-text-color: #2481cc;
  --tg-theme-subtitle-text-color: #999999;
  --tg-theme-destructive-text-color: #cc2424;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  overflow: hidden; /* Mini App manages its own scroll */
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  background-color: var(--tg-theme-bg-color);
  color: var(--tg-theme-text-color);
  -webkit-font-smoothing: antialiased;
  /* Prevent text selection in app-like UI */
  -webkit-user-select: none;
  user-select: none;
}

/* Allow text selection in content areas */
.selectable {
  -webkit-user-select: text;
  user-select: text;
}

/* Scrollable content area */
.content {
  height: var(--tg-viewport-stable-height, 100vh);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

/* Component examples */
.card {
  background: var(--tg-theme-section-bg-color);
  border-radius: 12px;
  padding: 16px;
  margin: 8px 16px;
}

.card-title {
  color: var(--tg-theme-section-header-text-color);
  font-size: 14px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.hint {
  color: var(--tg-theme-hint-color);
  font-size: 13px;
}

.button-primary {
  background: var(--tg-theme-button-color);
  color: var(--tg-theme-button-text-color);
  border: none;
  border-radius: 10px;
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  width: 100%;
  transition: opacity 0.2s;
}

.button-primary:active {
  opacity: 0.7;
}

.button-destructive {
  background: transparent;
  color: var(--tg-theme-destructive-text-color);
  border: none;
  font-size: 16px;
  cursor: pointer;
}

.divider {
  height: 1px;
  background: var(--tg-theme-hint-color);
  opacity: 0.2;
  margin: 0 16px;
}

a {
  color: var(--tg-theme-link-color);
  text-decoration: none;
}
```

### Tailwind CSS Integration

```ts
// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        tg: {
          bg: "var(--tg-theme-bg-color)",
          text: "var(--tg-theme-text-color)",
          hint: "var(--tg-theme-hint-color)",
          link: "var(--tg-theme-link-color)",
          button: "var(--tg-theme-button-color)",
          "button-text": "var(--tg-theme-button-text-color)",
          "secondary-bg": "var(--tg-theme-secondary-bg-color)",
          "header-bg": "var(--tg-theme-header-bg-color)",
          accent: "var(--tg-theme-accent-text-color)",
          "section-bg": "var(--tg-theme-section-bg-color)",
          "section-header": "var(--tg-theme-section-header-text-color)",
          subtitle: "var(--tg-theme-subtitle-text-color)",
          destructive: "var(--tg-theme-destructive-text-color)",
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

Usage: `<div className="bg-tg-bg text-tg-text">` — adapts automatically to user theme.

---
