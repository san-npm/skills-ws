## Contents

- 1. Design Tokens
- CSS Custom Properties (raw :root — Tailwind v3 / non-Tailwind)
- Tailwind v4 Integration (CSS-first — recommended in 2026)
- Legacy Tailwind v3 appendix (tailwind.config.js)

## 1. Design Tokens

Design tokens are the atomic values of your design system — colors, spacing, typography, shadows. Define once, use everywhere.

> **Where tokens live depends on your Tailwind version.** On **Tailwind v4** put them directly in `@theme {}` (see the next subsection) — they become CSS vars *and* utilities in one declaration. On **v3** (or framework-agnostic CSS), keep them as raw custom properties in `:root` like below and map them through `tailwind.config.js`.

### CSS Custom Properties (raw `:root` — Tailwind v3 / non-Tailwind)

```css
/* tokens/base.css */
:root {
  /* Colors - semantic naming */
  --color-primary: #2563eb;
  --color-primary-hover: #1d4ed8;
  --color-primary-active: #1e40af;
  --color-primary-foreground: #ffffff;

  --color-secondary: #64748b;
  --color-secondary-hover: #475569;
  --color-secondary-foreground: #ffffff;

  --color-destructive: #dc2626;
  --color-destructive-hover: #b91c1c;
  --color-destructive-foreground: #ffffff;

  --color-background: #ffffff;
  --color-foreground: #0f172a;
  --color-muted: #f1f5f9;
  --color-muted-foreground: #64748b;
  --color-border: #e2e8f0;
  --color-ring: #2563eb;

  /* Spacing scale */
  --space-0: 0;
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-5: 1.25rem;   /* 20px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-10: 2.5rem;   /* 40px */
  --space-12: 3rem;     /* 48px */
  --space-16: 4rem;     /* 64px */

  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;

  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.5rem;     /* 24px */
  --text-3xl: 1.875rem;   /* 30px */
  --text-4xl: 2.25rem;    /* 36px */

  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.75;

  --weight-normal: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

  /* Border radius */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  --radius-full: 9999px;

  /* Transitions */
  --duration-fast: 150ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Tailwind v4 Integration (CSS-first — recommended in 2026)

Tailwind v4 (stable since Jan 2025) replaced `tailwind.config.js` with a **CSS-first** model: a single `@import "tailwindcss";` plus a `@theme {}` block. Names inside `@theme` do double duty — they become both CSS custom properties **and** matching utility classes. A `--color-primary` token there generates `bg-primary`, `text-primary`, `border-primary`, etc., automatically — so you no longer maintain a parallel `colors: {}` map. Use the `oklch()` color space (v4's default) for perceptually-uniform palettes and wider gamut.

```css
/* app.css — the ONLY config most v4 projects need */
@import "tailwindcss";

/* Optional: opt into class-based dark mode instead of the default
   prefers-color-scheme. The variant below matches .dark on any ancestor. */
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Colors — oklch(L C H). These define both --color-* vars and utilities. */
  --color-primary: oklch(0.546 0.245 262.9);          /* ≈ #2563eb */
  --color-primary-hover: oklch(0.488 0.243 264.4);    /* ≈ #1d4ed8 */
  --color-primary-active: oklch(0.424 0.199 265.6);   /* ≈ #1e40af */
  --color-primary-foreground: oklch(1 0 0);

  --color-secondary: oklch(0.554 0.041 257.4);
  --color-secondary-hover: oklch(0.446 0.043 257.3);
  --color-secondary-foreground: oklch(1 0 0);

  --color-destructive: oklch(0.577 0.245 27.3);       /* ≈ #dc2626 */
  --color-destructive-hover: oklch(0.505 0.213 27.5);
  --color-destructive-foreground: oklch(1 0 0);

  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.208 0.042 265.8);
  --color-muted: oklch(0.968 0.007 247.9);
  --color-muted-foreground: oklch(0.554 0.046 257.4);
  --color-border: oklch(0.929 0.013 255.5);
  --color-ring: oklch(0.546 0.245 262.9);

  /* Typography — registering --font-* yields font-sans / font-mono utilities */
  --font-sans: "Inter", system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", "Fira Code", monospace;

  /* Radii — yields rounded-sm … rounded-xl */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;

  /* Motion — yields ease-fluid / ease-snappy and duration-* utilities */
  --ease-fluid: cubic-bezier(0.3, 0, 0, 1);
  --ease-snappy: cubic-bezier(0.2, 0, 0, 1);
}
```

PostCSS / Vite wiring for v4 (no JS config needed):

```js
// postcss.config.mjs  (only if you are NOT using @tailwindcss/vite)
export default { plugins: { "@tailwindcss/postcss": {} } };
```

```ts
// vite.config.ts — preferred: the dedicated Vite plugin (faster, no PostCSS)
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
export default defineConfig({ plugins: [tailwindcss()] });
```

> **Token-pipeline note:** when tokens are generated by Style Dictionary (see §7), emit them as `@theme {}` CSS for v4 rather than a `theme.extend` JS object. v4 auto-detects content (no `content: []` array), so deleting `tailwind.config.js` is expected, not a mistake.

### Legacy Tailwind v3 appendix (`tailwind.config.js`)

Only for projects still on v3 (or v4 running in JS-config compat mode via `@config "./tailwind.config.js";`). Here tokens stay as raw CSS variables in `:root` (the block above in "CSS Custom Properties") and are mapped through `theme.extend`:

```javascript
// tailwind.config.js  (Tailwind v3 only)
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          active: 'var(--color-primary-active)',
          foreground: 'var(--color-primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          hover: 'var(--color-secondary-hover)',
          foreground: 'var(--color-secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)',
          foreground: 'var(--color-destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--color-muted)',
          foreground: 'var(--color-muted-foreground)',
        },
        border: 'var(--color-border)',
        ring: 'var(--color-ring)',
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
      },
    },
  },
};
```

---
