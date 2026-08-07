## Contents

- 6. Theming (Dark Mode)
- CSS Variables Approach
- No-FOUC theme script (run before paint)
- Theme Toggle Component (SSR-safe, accessible)

## 6. Theming (Dark Mode)

### CSS Variables Approach

Override the same token names under a `.dark` selector. On Tailwind v4 this lives in plain CSS *after* the `@theme` block (it re-points the existing `--color-*` vars); on v3 it's a separate `tokens/dark.css`.

```css
/* Dark theme — overrides the --color-* tokens defined in @theme / :root */
.dark, [data-theme="dark"] {
  --color-primary: oklch(0.707 0.165 254.6);          /* ≈ #60a5fa */
  --color-primary-hover: oklch(0.789 0.135 255.5);
  --color-primary-foreground: oklch(0.208 0.042 265.8);

  --color-background: oklch(0.208 0.042 265.8);        /* ≈ #0f172a */
  --color-foreground: oklch(0.984 0.003 247.9);
  --color-muted: oklch(0.279 0.041 260);
  --color-muted-foreground: oklch(0.704 0.04 256.8);
  --color-border: oklch(0.372 0.044 257.3);
}

/* Tell the UA to render native form controls / scrollbars dark too. */
.dark { color-scheme: dark; }
```

### No-FOUC theme script (run before paint)

Reading `localStorage` in `useEffect` flashes the wrong theme on first paint (the class is applied after hydration). Set the class **synchronously** before React mounts via a blocking inline script in `<head>`. In Next.js App Router this goes in the root `layout.tsx`; with a CMS/HTML it's a `<script>` in `<head>`.

```tsx
// app/layout.tsx — runs before first paint, no flash, no hydration mismatch
<script
  dangerouslySetInnerHTML={{
    __html: `(function(){try{var t=localStorage.getItem('theme');
      var d=t?t==='dark':matchMedia('(prefers-color-scheme:dark)').matches;
      document.documentElement.classList.toggle('dark',d);
      document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`,
  }}
/>
```
> In real projects prefer `next-themes` (`<ThemeProvider attribute="class">`), which ships this exact script and a `useTheme()` hook. The component below shows the mechanics for a standalone library.

### Theme Toggle Component (SSR-safe, accessible)

Use real icon components (e.g. `lucide-react`), an accessible name, and `aria-pressed` for the toggle state. Guard against hydration mismatch with a `mounted` flag so SSR and the first client render agree, then reveal the resolved state.

```tsx
'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // The no-FOUC script already set the <html> class; read it back as truth.
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    setMounted(true);
  }, []);

  function toggle() {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    document.documentElement.style.colorScheme = next;
  }

  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      // Stable, non-flipping label so the accessible name doesn't jump pre-hydration.
      aria-label="Toggle dark mode"
      aria-pressed={mounted ? isDark : undefined}
      className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* suppressHydrationWarning: the icon legitimately differs from the SSR default */}
      <span suppressHydrationWarning>
        {isDark ? <Moon className="h-5 w-5" aria-hidden="true" /> : <Sun className="h-5 w-5" aria-hidden="true" />}
      </span>
      <span className="sr-only">{isDark ? 'Dark mode on' : 'Light mode on'}</span>
    </button>
  );
}
```

---
