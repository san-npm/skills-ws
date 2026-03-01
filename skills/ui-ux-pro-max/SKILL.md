---
name: ui-ux-pro-max
description: >
  UI/UX design intelligence. 50 styles, 21 palettes, 50 font pairings, 20 charts, 9 stacks
  (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui).
  Actions: plan, build, create, design, implement, review, fix, improve, optimize, enhance,
  refactor, check UI/UX code. Projects: website, landing page, dashboard, admin panel,
  e-commerce, SaaS, portfolio, blog, mobile app, .html, .tsx, .vue, .svelte.
  Elements: button, modal, navbar, sidebar, card, table, form, chart.
  Styles: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid,
  dark mode, responsive, skeuomorphism, flat design.
  Topics: color palette, accessibility, animation, layout, typography, font pairing,
  spacing, hover, shadow, gradient.
  Integrations: shadcn/ui MCP for component search and examples.
version: 2.0.0
---

# UI/UX Pro Max — Design System Intelligence

## Design Token System

Design tokens are the single source of truth. Define them first, reference them everywhere.

### Token Architecture

```css
/* tokens.css — Primitive → Semantic → Component tokens */

:root {
  /* ═══ Primitive Tokens (raw values, never use directly in components) ═══ */

  /* Colors — HSL for easy manipulation */
  --color-blue-50: 214 100% 97%;
  --color-blue-100: 214 95% 93%;
  --color-blue-200: 213 97% 87%;
  --color-blue-300: 212 96% 78%;
  --color-blue-400: 213 94% 68%;
  --color-blue-500: 217 91% 60%;
  --color-blue-600: 221 83% 53%;
  --color-blue-700: 224 76% 48%;
  --color-blue-800: 226 71% 40%;
  --color-blue-900: 224 64% 33%;
  --color-blue-950: 226 57% 21%;

  --color-gray-50: 210 40% 98%;
  --color-gray-100: 210 40% 96%;
  --color-gray-200: 214 32% 91%;
  --color-gray-300: 213 27% 84%;
  --color-gray-400: 215 20% 65%;
  --color-gray-500: 215 16% 47%;
  --color-gray-600: 215 19% 35%;
  --color-gray-700: 215 25% 27%;
  --color-gray-800: 217 33% 17%;
  --color-gray-900: 222 47% 11%;
  --color-gray-950: 229 84% 5%;

  --color-red-500: 0 84% 60%;
  --color-green-500: 142 71% 45%;
  --color-amber-500: 38 92% 50%;

  /* Spacing — 4px base grid */
  --space-0: 0px;
  --space-0-5: 2px;
  --space-1: 4px;
  --space-1-5: 6px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;

  /* Typography — Major Third scale (1.250) */
  --text-xs: 0.75rem;     /* 12px */
  --text-sm: 0.875rem;    /* 14px */
  --text-base: 1rem;      /* 16px */
  --text-lg: 1.125rem;    /* 18px */
  --text-xl: 1.25rem;     /* 20px */
  --text-2xl: 1.563rem;   /* 25px */
  --text-3xl: 1.953rem;   /* 31px */
  --text-4xl: 2.441rem;   /* 39px */
  --text-5xl: 3.052rem;   /* 49px */

  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-relaxed: 1.625;

  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-display: 'Cal Sans', 'Inter', sans-serif;

  --font-normal: 400;
  --font-medium: 500;
  --font-semibold: 600;
  --font-bold: 700;

  /* Radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;
  --radius-full: 9999px;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

  /* Animation */
  --duration-fast: 100ms;
  --duration-normal: 200ms;
  --duration-slow: 300ms;
  --duration-slower: 500ms;
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);

  /* Z-index scale */
  --z-dropdown: 50;
  --z-sticky: 100;
  --z-overlay: 200;
  --z-modal: 300;
  --z-popover: 400;
  --z-toast: 500;

  /* ═══ Semantic Tokens (USE these in components) ═══ */

  --bg-primary: var(--color-gray-50);
  --bg-secondary: var(--color-gray-100);
  --bg-tertiary: var(--color-gray-200);
  --bg-inverse: var(--color-gray-900);
  --bg-brand: var(--color-blue-600);
  --bg-brand-hover: var(--color-blue-700);
  --bg-danger: var(--color-red-500);
  --bg-success: var(--color-green-500);
  --bg-warning: var(--color-amber-500);

  --text-primary: hsl(var(--color-gray-900));
  --text-secondary: hsl(var(--color-gray-600));
  --text-tertiary: hsl(var(--color-gray-400));
  --text-inverse: hsl(var(--color-gray-50));
  --text-brand: hsl(var(--color-blue-600));
  --text-danger: hsl(var(--color-red-500));

  --border-default: hsl(var(--color-gray-200));
  --border-strong: hsl(var(--color-gray-300));
  --border-brand: hsl(var(--color-blue-500));
  --border-danger: hsl(var(--color-red-500));

  --ring-brand: hsl(var(--color-blue-500) / 0.5);
  --ring-danger: hsl(var(--color-red-500) / 0.5);
}
```

### Tailwind Config with Tokens

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx,astro,html}'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
        display: ['var(--font-display)'],
      },
      animation: {
        'fade-in': 'fadeIn var(--duration-normal) var(--ease-out)',
        'fade-out': 'fadeOut var(--duration-normal) var(--ease-in)',
        'slide-up': 'slideUp var(--duration-slow) var(--ease-out)',
        'slide-down': 'slideDown var(--duration-slow) var(--ease-out)',
        'scale-in': 'scaleIn var(--duration-normal) var(--ease-bounce)',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        fadeOut: { from: { opacity: '1' }, to: { opacity: '0' } },
        slideUp: { from: { transform: 'translateY(8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        slideDown: { from: { transform: 'translateY(-8px)', opacity: '0' }, to: { transform: 'translateY(0)', opacity: '1' } },
        scaleIn: { from: { transform: 'scale(0.95)', opacity: '0' }, to: { transform: 'scale(1)', opacity: '1' } },
      },
    },
  },
};
export default config;
```

---

## Dark Mode Implementation

### CSS Custom Properties Approach (Recommended)

```css
/* globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  --primary: 221 83% 53%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --secondary-foreground: 222 47% 11%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 16% 47%;
  --accent: 210 40% 96%;
  --accent-foreground: 222 47% 11%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 210 40% 98%;
  --border: 214 32% 91%;
  --ring: 221 83% 53%;
  --radius: 0.5rem;
}

.dark {
  --background: 222 47% 11%;
  --foreground: 210 40% 98%;
  --card: 217 33% 17%;
  --card-foreground: 210 40% 98%;
  --primary: 217 91% 60%;
  --primary-foreground: 222 47% 11%;
  --secondary: 215 25% 27%;
  --secondary-foreground: 210 40% 98%;
  --muted: 215 25% 27%;
  --muted-foreground: 215 20% 65%;
  --accent: 215 25% 27%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 63% 31%;
  --destructive-foreground: 210 40% 98%;
  --border: 215 25% 27%;
  --ring: 217 91% 60%;
}
```

### Theme Toggle (React)

```tsx
'use client';
import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system');

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null;
    if (stored) setTheme(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.remove('light', 'dark');
    root.classList.add(theme === 'system' ? (systemDark ? 'dark' : 'light') : theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const icons = { light: Sun, dark: Moon, system: Monitor };
  const next: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' };
  const Icon = icons[theme];

  return (
    <button
      onClick={() => setTheme(next[theme])}
      className="rounded-md p-2 hover:bg-accent transition-colors"
      aria-label={`Switch to ${next[theme]} theme`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
```

### Dark Mode Checklist
- [ ] All colors reference CSS variables (no hardcoded hex in components)
- [ ] Shadows reduce in darkness (lighter shadow or none in dark mode)
- [ ] Images/illustrations have dark variants or use `mix-blend-mode`
- [ ] Borders use lower contrast in dark mode
- [ ] Text uses off-white (`gray-100`) not pure white
- [ ] Background uses off-black (`gray-900/950`) not pure black
- [ ] Prevent flash of wrong theme (inline script in `<head>`)
- [ ] System preference detection works

---

## Responsive Breakpoint Strategy

### Mobile-First Breakpoints

```
Default:   0px+      → Mobile (single column)
sm:        640px+    → Large phone / small tablet
md:        768px+    → Tablet portrait
lg:        1024px+   → Tablet landscape / small laptop
xl:        1280px+   → Desktop
2xl:       1536px+   → Large desktop
```

### Container Queries (Modern Approach)

```tsx
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="@container">
      <div className="flex flex-col @md:flex-row gap-4 p-4">
        {children}
      </div>
    </div>
  );
}
```

### Responsive Patterns

```tsx
{/* Stack → Side by side */}
<div className="flex flex-col md:flex-row gap-4">
  <div className="md:w-1/3">Sidebar</div>
  <div className="md:w-2/3">Main</div>
</div>

{/* Grid: 1 → 2 → 3 → 4 columns */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>

{/* Show/hide elements */}
<nav className="hidden md:flex gap-4">Desktop Nav</nav>
<button className="md:hidden">Menu</button>

{/* Responsive typography */}
<h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold">Headline</h1>

{/* Responsive spacing */}
<section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24">Content</section>
```

---

## Typography System

### Modular Scale (Major Third — 1.250)

| Token | Size | Use |
|-------|------|-----|
| `text-xs` | 12px | Captions, badges |
| `text-sm` | 14px | Secondary text, form labels |
| `text-base` | 16px | Body text |
| `text-lg` | 18px | Lead paragraphs |
| `text-xl` | 20px | Card titles, H4 |
| `text-2xl` | 25px | Section titles, H3 |
| `text-3xl` | 31px | Page subtitles, H2 |
| `text-4xl` | 39px | Page titles, H1 |
| `text-5xl` | 49px | Hero headlines |

### Font Pairing Quick Reference

| Heading | Body | Vibe |
|---------|------|------|
| Inter | Inter | Clean, neutral SaaS |
| Cal Sans | Inter | Modern SaaS, bold |
| Fraunces | Inter | Editorial, premium |
| Space Grotesk | DM Sans | Tech, developer tools |
| Playfair Display | Source Sans 3 | Luxury, editorial |
| Satoshi | Inter | Trendy startup |
| Cabinet Grotesk | General Sans | Bold, contemporary |
| Sora | Nunito | Friendly, approachable |
| JetBrains Mono | Inter | Developer, technical |
| Clash Display | Outfit | Statement, bold |

### Line Height Rules

- **Headings (>24px):** `leading-tight` (1.25)
- **Body text:** `leading-normal` (1.5) to `leading-relaxed` (1.625)
- **Small text (<14px):** `leading-normal` (1.5) minimum
- **Max line width:** 65–75 characters (`max-w-prose` = 65ch)

---

## Spacing System — 4px Grid

Everything aligns to a 4px grid. Use 8px as the primary increment.

| Token | px | Use |
|-------|----|-----|
| `space-1` | 4px | Inline icon gap, tight padding |
| `space-2` | 8px | Button padding-x, input padding, icon + label |
| `space-3` | 12px | Card padding (compact), list item gap |
| `space-4` | 16px | Card padding (default), section gap (small) |
| `space-6` | 24px | Card padding (spacious), group gap |
| `space-8` | 32px | Section padding (small screen) |
| `space-12` | 48px | Section padding (desktop) |
| `space-16` | 64px | Page section gap |
| `space-24` | 96px | Hero section vertical padding |

### Spacing Rules

1. **Consistent padding:** Cards use `p-4` or `p-6`, never mix within the same card type
2. **Gap > margin:** Use `gap-*` on flex/grid containers, not margin on children
3. **Vertical rhythm:** Sections separated by `py-16` (mobile) / `py-24` (desktop)
4. **Related items closer:** Items in a group: `gap-2` to `gap-4`. Groups apart: `gap-8` to `gap-12`

---

## Color System Design

### Building a Palette

```
Brand: Pick 1 primary color → Generate full scale (50–950)
Gray: Pick a gray with slight hue tint matching brand
Semantic: Success (green), Warning (amber), Danger (red), Info (blue)
```

### Contrast Requirements (WCAG AA)

| Element | Min Ratio | Example |
|---------|-----------|---------|
| Normal text (<18px) | 4.5:1 | `text-gray-700` on white |
| Large text (>=18px bold or >=24px) | 3:1 | `text-gray-500` on white |
| UI components (borders, icons) | 3:1 | `border-gray-300` on white |
| Focus indicators | 3:1 | `ring-blue-500` on white |

### Palette Recipes

**Neutral SaaS (shadcn-style):** Primary: Slate 900/White. Accent: Blue 600. BG: White/Slate 50.

**Warm & Friendly:** Primary: Amber 600. Accent: Rose 500. Gray: Stone. BG: Stone 50.

**Developer/Tech:** Primary: Emerald 500. Accent: Violet 500. Gray: Slate. BG: Slate 950 (dark default).

---

## 50+ UI Patterns with Code

### 1. Button Variants

```tsx
const buttonVariants = {
  base: "inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  variant: {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    outline: "border border-border bg-transparent hover:bg-accent hover:text-accent-foreground",
    ghost: "hover:bg-accent hover:text-accent-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
  },
  size: {
    sm: "h-8 px-3 text-sm gap-1.5",
    md: "h-10 px-4 text-sm gap-2",
    lg: "h-12 px-6 text-base gap-2.5",
    icon: "h-10 w-10",
  },
};
```

### 2. Input Field

```tsx
<div className="space-y-1.5">
  <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
  <input
    id="email" type="email" placeholder="you@example.com"
    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm
               placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2
               focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
  />
  <p className="text-sm text-muted-foreground">We'll never share your email.</p>
</div>
```

### 3. Card

```tsx
<div className="rounded-xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
  <div className="flex items-center gap-3 mb-4">
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
      <Icon className="h-5 w-5 text-primary" />
    </div>
    <h3 className="font-semibold text-card-foreground">Card Title</h3>
  </div>
  <p className="text-sm text-muted-foreground leading-relaxed">Card description.</p>
</div>
```

### 4. Avatar with Fallback

```tsx
<div className="relative h-10 w-10 rounded-full overflow-hidden bg-muted">
  {src ? (
    <img src={src} alt={name} className="h-full w-full object-cover" />
  ) : (
    <span className="flex h-full w-full items-center justify-center text-sm font-medium text-muted-foreground">
      {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
    </span>
  )}
  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
</div>
```

### 5. Badge

```tsx
const badgeVariants = {
  default: "bg-primary/10 text-primary border-primary/20",
  success: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800",
  warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  danger: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
};
// <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${badgeVariants.success}`}>Active</span>
```

### 6. Modal / Dialog

```tsx
{/* Backdrop */}
<div className="fixed inset-0 z-[var(--z-overlay)] bg-black/50 backdrop-blur-sm animate-fade-in" />
{/* Dialog */}
<div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
  <div role="dialog" aria-modal="true" aria-labelledby="dialog-title"
    className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl animate-scale-in">
    <h2 id="dialog-title" className="text-lg font-semibold">Dialog Title</h2>
    <p className="mt-2 text-sm text-muted-foreground">Description.</p>
    <div className="mt-6 flex justify-end gap-3">
      <button className="h-10 px-4 rounded-lg text-sm font-medium hover:bg-accent">Cancel</button>
      <button className="h-10 px-4 rounded-lg text-sm font-medium bg-primary text-primary-foreground">Confirm</button>
    </div>
  </div>
</div>
```

### 7. Toast / Notification

```tsx
<div className="fixed bottom-4 right-4 z-[var(--z-toast)] flex flex-col gap-2">
  <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-lg animate-slide-up">
    <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
    <p className="text-sm font-medium">Changes saved.</p>
    <button className="ml-auto text-muted-foreground hover:text-foreground" aria-label="Dismiss">
      <X className="h-4 w-4" />
    </button>
  </div>
</div>
```

### 8. Dropdown Menu

```tsx
<div className="relative">
  <button aria-expanded={open} aria-haspopup="true">Options</button>
  {open && (
    <div role="menu" className="absolute right-0 mt-2 w-48 rounded-lg border border-border bg-card py-1 shadow-lg animate-fade-in">
      <button role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent">
        <Edit className="h-4 w-4" /> Edit
      </button>
      <div className="my-1 h-px bg-border" role="separator" />
      <button role="menuitem" className="flex w-full items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
        <Trash className="h-4 w-4" /> Delete
      </button>
    </div>
  )}
</div>
```

### 9. Tabs

```tsx
<div role="tablist" className="flex border-b border-border">
  {tabs.map(tab => (
    <button key={tab.id} role="tab" aria-selected={active === tab.id}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors
        ${active === tab.id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
      onClick={() => setActive(tab.id)}>
      {tab.label}
    </button>
  ))}
</div>
```

### 10. Sidebar Navigation

```tsx
<aside className="flex h-screen w-64 flex-col border-r border-border bg-card">
  <div className="flex h-14 items-center gap-2 px-4 border-b border-border">
    <Logo className="h-6 w-6" /><span className="font-semibold">AppName</span>
  </div>
  <nav className="flex-1 overflow-y-auto p-3 space-y-1">
    {navItems.map(item => (
      <a key={item.href} href={item.href}
        className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors
          ${item.active ? 'bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:bg-accent'}`}>
        <item.icon className="h-4 w-4" />
        {item.label}
        {item.badge && <span className="ml-auto text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">{item.badge}</span>}
      </a>
    ))}
  </nav>
</aside>
```

### 11. Data Table

```tsx
<div className="rounded-lg border border-border overflow-hidden">
  <table className="w-full text-sm">
    <thead>
      <tr className="border-b border-border bg-muted/50">
        <th className="h-10 px-4 text-left font-medium text-muted-foreground">Name</th>
        <th className="h-10 px-4 text-left font-medium text-muted-foreground">Status</th>
        <th className="h-10 px-4 text-right font-medium text-muted-foreground">Amount</th>
      </tr>
    </thead>
    <tbody>
      {rows.map(row => (
        <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/50">
          <td className="h-12 px-4 font-medium">{row.name}</td>
          <td className="h-12 px-4"><Badge variant={row.statusVariant}>{row.status}</Badge></td>
          <td className="h-12 px-4 text-right tabular-nums">{formatCurrency(row.amount)}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

### 12. Empty State

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
    <Inbox className="h-8 w-8 text-muted-foreground" />
  </div>
  <h3 className="text-lg font-semibold">No projects yet</h3>
  <p className="mt-1 text-sm text-muted-foreground max-w-sm">Get started by creating your first project.</p>
  <button className="mt-6 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Create Project</button>
</div>
```

### 13. Skeleton Loading

```tsx
<div className="rounded-xl border border-border p-6 space-y-4 animate-pulse">
  <div className="flex items-center gap-3">
    <div className="h-10 w-10 rounded-lg bg-muted" />
    <div className="h-4 w-32 rounded bg-muted" />
  </div>
  <div className="space-y-2">
    <div className="h-3 w-full rounded bg-muted" />
    <div className="h-3 w-4/5 rounded bg-muted" />
  </div>
</div>
```

### 14. Command Palette

```tsx
<div className="fixed inset-0 z-[var(--z-modal)] flex items-start justify-center pt-[20vh] p-4">
  <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
    <div className="flex items-center border-b border-border px-4">
      <Search className="h-4 w-4 text-muted-foreground shrink-0" />
      <input className="flex-1 h-12 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
        placeholder="Search commands..." autoFocus />
      <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">Esc</kbd>
    </div>
    <div className="max-h-72 overflow-y-auto p-2">
      {groups.map(group => (
        <div key={group.label}>
          <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{group.label}</p>
          {group.items.map(item => (
            <button key={item.id} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent">
              <item.icon className="h-4 w-4 text-muted-foreground" />
              <span>{item.label}</span>
              {item.shortcut && <kbd className="ml-auto text-xs text-muted-foreground">{item.shortcut}</kbd>}
            </button>
          ))}
        </div>
      ))}
    </div>
  </div>
</div>
```

### 15. Pricing Card

```tsx
<div className={`rounded-2xl border p-8 ${featured ? 'border-primary bg-primary/5 shadow-lg ring-1 ring-primary' : 'border-border bg-card'}`}>
  {featured && <span className="text-xs font-semibold text-primary uppercase tracking-wide">Most Popular</span>}
  <h3 className="mt-2 text-xl font-bold">{plan.name}</h3>
  <div className="mt-6">
    <span className="text-4xl font-bold tabular-nums">${plan.price}</span>
    <span className="text-sm text-muted-foreground">/month</span>
  </div>
  <ul className="mt-6 space-y-3">
    {plan.features.map(f => (
      <li key={f} className="flex items-center gap-2 text-sm">
        <Check className="h-4 w-4 text-primary shrink-0" /> {f}
      </li>
    ))}
  </ul>
  <button className={`mt-8 w-full h-11 rounded-lg text-sm font-medium
    ${featured ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'}`}>
    Get Started
  </button>
</div>
```

### 16–20. Quick Patterns

**16. Tooltip:** `absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-gray-900 px-2 py-1 text-xs text-white shadow-lg`

**17. Progress Bar:** Outer `h-2 rounded-full bg-muted` → Inner `h-full rounded-full bg-primary transition-all duration-500` with width style

**18. Toggle/Switch:** `relative h-6 w-11 rounded-full bg-muted` + thumb `h-5 w-5 rounded-full bg-white shadow-sm translate-x-0.5 data-[state=checked]:translate-x-5`

**19. Accordion:** Chevron `transition-transform data-[state=open]:rotate-180`, content `grid grid-rows-[0fr] data-[state=open]:grid-rows-[1fr] transition-all`

**20. Breadcrumb:** `flex items-center gap-1.5 text-sm text-muted-foreground` with separators

### 21–30. Layout Patterns

**21. Bento Grid:**
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  <div className="col-span-2 row-span-2 rounded-2xl bg-card border border-border p-6">Large</div>
  <div className="rounded-2xl bg-card border border-border p-6">Small 1</div>
  <div className="rounded-2xl bg-card border border-border p-6">Small 2</div>
  <div className="col-span-2 rounded-2xl bg-card border border-border p-6">Wide</div>
</div>
```

**22. Sticky Header:** `sticky top-0 z-[var(--z-sticky)] border-b border-border bg-background/80 backdrop-blur-md`

**23. Centered Content:** `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`

**24. Split Screen Hero:**
```tsx
<section className="grid lg:grid-cols-2 min-h-[80vh] items-center gap-12 px-4 sm:px-6 lg:px-8">
  <div className="max-w-lg">
    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">Headline</h1>
    <p className="mt-4 text-lg text-muted-foreground">Subtext</p>
  </div>
  <div className="relative aspect-square">
    <img src="/hero.png" alt="" className="rounded-2xl object-cover" />
  </div>
</section>
```

**25. Masonry:** `columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4`

**26. Full-bleed Section:** `relative -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-16 bg-muted`

**27. Fixed Bottom Bar (Mobile CTA):** `fixed bottom-0 inset-x-0 z-[var(--z-sticky)] border-t border-border bg-background p-4 md:hidden`

**28. Dashboard Shell:**
```tsx
<div className="flex h-screen">
  <Sidebar className="hidden lg:flex w-64 shrink-0" />
  <div className="flex-1 flex flex-col overflow-hidden">
    <Header className="h-14 shrink-0 border-b" />
    <main className="flex-1 overflow-y-auto p-6">{children}</main>
  </div>
</div>
```

**29. Feature Grid:**
```tsx
<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
  {features.map(f => (
    <div key={f.title} className="space-y-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <f.icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-semibold">{f.title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
    </div>
  ))}
</div>
```

**30. Stat Cards:**
```tsx
<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
  {stats.map(s => (
    <div key={s.label} className="rounded-xl border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{s.label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{s.value}</p>
      <p className={`mt-1 text-xs ${s.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
        {s.change > 0 ? '↑' : '↓'} {Math.abs(s.change)}%
      </p>
    </div>
  ))}
</div>
```

### 31–40. Form & Interactive Patterns

**31. Multi-step Form:**
```tsx
<div className="flex items-center gap-2 mb-8">
  {steps.map((step, i) => (
    <Fragment key={step}>
      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium
        ${i <= current ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
        {i < current ? <Check className="h-4 w-4" /> : i + 1}
      </div>
      {i < steps.length - 1 && <div className={`h-0.5 flex-1 ${i < current ? 'bg-primary' : 'bg-muted'}`} />}
    </Fragment>
  ))}
</div>
```

**32. Inline Edit:** Display text → click → input replaces → blur saves

**33. Search with Filters:** Input + dropdown filters + tag chips for active filters

**34. Date Picker Trigger:** `flex h-10 items-center gap-2 rounded-lg border px-3 text-sm` + calendar icon

**35. File Upload Zone:**
```tsx
<div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border p-8
  hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
  <p className="text-sm font-medium">Drop files here or click to browse</p>
  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
</div>
```

**36. Tag Input:** Input that creates dismissible badges

**37. Password Strength Meter:** Four bars progressively colored below password field

**38. Combobox:** Input + dropdown with search filtering

**39. Rating Stars:** Interactive star row with hover state

**40. Quantity Stepper:** `- [input] +` with min/max bounds

### 41–50. Advanced Patterns

**41. Kanban Board:** Horizontal scroll with vertical card lists per column

**42. Timeline:** Vertical line with dots and alternating content cards

**43. Chat Interface:** Messages with avatars, timestamps, typing indicator

**44. Notification Center:** Slide-over panel with grouped notifications

**45. Onboarding Checklist:** Collapsible card with progress bar and tasks

**46. Color Picker:** Hue slider + saturation area + hex input

**47. Rich Text Toolbar:** Icon buttons with separators, active states

**48. Infinite Scroll:** Intersection observer + skeleton loaders

**49. Resizable Panels:** Two panes with draggable divider (`cursor-col-resize`)

**50. Keyboard Shortcuts Sheet:** Grid of action + shortcut badges grouped by category

---

## Animation Principles

### Duration Guide

| Type | Duration | Use |
|------|----------|-----|
| Micro-interactions | 100–150ms | Button press, toggle, checkbox |
| State changes | 200–300ms | Dropdown open, tab switch |
| Entrances | 200–400ms | Modal appear, slide-in |
| Exits | 150–250ms | Close/dismiss (faster than enter) |
| Page transitions | 300–500ms | Route changes |

### Easing Guide

| Easing | CSS | Use |
|--------|-----|-----|
| Ease out | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering |
| Ease in | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving |
| Ease in-out | `cubic-bezier(0.4, 0, 0.2, 1)` | Moving within screen |
| Bounce | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful entrances |

### Rules
1. **Exit faster than entrance.** Users don't wait for things to leave.
2. **Stagger children.** Lists: 30–50ms delay between items.
3. **Reduce motion.** Always respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## WCAG 2.1 AA Accessibility Checklist

### Perceivable
- [ ] **1.1.1** All images have meaningful `alt` text (or `alt=""` for decorative)
- [ ] **1.2.1** Pre-recorded audio/video has captions or transcript
- [ ] **1.3.1** Semantic HTML: `<nav>`, `<main>`, `<aside>`, `<header>`, `<footer>`, headings in order
- [ ] **1.3.2** Content order meaningful when CSS disabled
- [ ] **1.3.3** Instructions don't rely solely on shape, size, position, or color
- [ ] **1.3.4** Content works in portrait and landscape
- [ ] **1.3.5** Form inputs have `autocomplete` attributes
- [ ] **1.4.1** Color is not the only means of conveying info
- [ ] **1.4.2** Audio controls for auto-playing audio
- [ ] **1.4.3** Text contrast >= 4.5:1 (normal) / 3:1 (large)
- [ ] **1.4.4** Text resizable to 200% without loss
- [ ] **1.4.5** Text used instead of images of text
- [ ] **1.4.10** Content reflows at 320px (no horizontal scroll)
- [ ] **1.4.11** Non-text contrast >= 3:1
- [ ] **1.4.12** Text spacing overrides don't break layout
- [ ] **1.4.13** Hover/focus content dismissible, hoverable, persistent

### Operable
- [ ] **2.1.1** All functionality via keyboard
- [ ] **2.1.2** No keyboard traps
- [ ] **2.1.4** Single-character shortcuts remappable
- [ ] **2.2.1** Time limits adjustable
- [ ] **2.3.1** No flashing >3/sec
- [ ] **2.4.1** Skip-to-main link exists
- [ ] **2.4.2** Descriptive `<title>`
- [ ] **2.4.3** Logical focus order
- [ ] **2.4.4** Link purpose clear from text
- [ ] **2.4.5** Multiple ways to find pages
- [ ] **2.4.6** Descriptive headings/labels
- [ ] **2.4.7** Visible focus indicator (2px+, 3:1 contrast)
- [ ] **2.5.1** Complex gestures have alternatives
- [ ] **2.5.2** Pointer cancellation (use `click` not `mousedown`)
- [ ] **2.5.3** Accessible name matches visible label
- [ ] **2.5.4** Motion-activated functions have UI alternatives

### Understandable
- [ ] **3.1.1** `<html lang="en">` set
- [ ] **3.1.2** Language changes marked (`<span lang="fr">`)
- [ ] **3.2.1** No context change on focus
- [ ] **3.2.2** No context change on input
- [ ] **3.2.3** Consistent navigation
- [ ] **3.2.4** Consistent component identification
- [ ] **3.3.1** Errors identified in text
- [ ] **3.3.2** Labels/instructions for inputs
- [ ] **3.3.3** Error correction suggestions
- [ ] **3.3.4** Submissions reversible/verified/confirmed

### Robust
- [ ] **4.1.1** Valid HTML (no duplicate IDs)
- [ ] **4.1.2** Custom components have ARIA name, role, value
- [ ] **4.1.3** Status messages use `role="status"` or `aria-live`

### Focus Patterns

```tsx
// Skip link
<a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4
  focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg">
  Skip to main content
</a>

// Live regions
<div role="status" aria-live="polite" className="sr-only">{statusMessage}</div>
<div role="alert" aria-live="assertive">{errorMessage}</div>
```

---

## Form UX Patterns

### Rules
1. **Labels above inputs.** Not placeholder-only, not floating labels.
2. **Validate on blur, not on change.** Don't yell mid-keystroke.
3. **Show errors inline** below the field, not in a top banner.
4. **Mark optional fields,** not required ones.
5. **Single column.** Multi-column forms have 50%+ higher error rates.
6. **Button says what it does:** "Create Account" not "Submit."

### Error State

```tsx
<div className="space-y-1.5">
  <label htmlFor="email" className="text-sm font-medium">Email</label>
  <input id="email" type="email" aria-invalid={!!error} aria-describedby={error ? 'email-error' : undefined}
    className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2
      ${error ? 'border-destructive focus-visible:ring-destructive' : 'border-border focus-visible:ring-ring'}`}
  />
  {error && (
    <p id="email-error" role="alert" className="flex items-center gap-1.5 text-sm text-destructive">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
    </p>
  )}
</div>
```

---

## Dashboard Layout Patterns

### Metric Card with Sparkline
```tsx
<div className="rounded-xl border border-border bg-card p-5">
  <div className="flex items-center justify-between">
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <TrendBadge value={change} />
  </div>
  <p className="mt-2 text-3xl font-bold tabular-nums">{value}</p>
  <Sparkline data={sparkData} className="mt-4 h-12" />
</div>
```

### Chart + Table Split
```tsx
<div className="grid lg:grid-cols-5 gap-6">
  <div className="lg:col-span-3 rounded-xl border border-border bg-card p-6">
    <h3 className="font-semibold mb-4">Revenue Over Time</h3>
    <LineChart data={revenueData} height={300} />
  </div>
  <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
    <h3 className="font-semibold mb-4">Top Products</h3>
    <ProductTable data={topProducts} />
  </div>
</div>
```

---

## Component Architecture

### File Structure

```
src/
  components/
    ui/              # Primitives (Button, Input, Badge)
    patterns/         # Composed (PricingCard, StatCard)
    layouts/          # Shells (DashboardShell, MarketingLayout)
  styles/
    tokens.css
    globals.css
  lib/
    cn.ts            # className merge utility
```

### className Merge Utility

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

### Composable Component Pattern

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof buttonVariants.variant;
  size?: keyof typeof buttonVariants.size;
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp ref={ref}
        className={cn(buttonVariants.base, buttonVariants.variant[variant], buttonVariants.size[size], className)}
        {...props} />
    );
  }
);
```

---

## Performance Checklist

- [ ] Images: `loading="lazy"` with explicit `width`/`height`
- [ ] Fonts: `font-display: swap`, preload critical, subset characters
- [ ] CSS: Purge unused (Tailwind auto)
- [ ] Animations: `transform` and `opacity` only (GPU-accelerated)
- [ ] Bundle: Code-split routes, lazy-load below-fold
- [ ] Icons: Inline SVG or sprite, not icon fonts

---

## Quick Reference: Design Decisions

| Decision | Recommendation |
|----------|---------------|
| Border radius | One size: `rounded-lg` (8px) everywhere, or `rounded-xl` for cards + `rounded-lg` for inputs |
| Shadow vs border | Borders for structure, shadows for elevation. Don't combine heavy shadows + borders |
| Icon size | 16px in text, 20px in buttons, 24px standalone |
| Button height | 32px (sm), 40px (md), 48px (lg) |
| Input height | 40px (match md button) |
| Max content width | 1280px (`max-w-7xl`) for pages, 65ch (`max-w-prose`) for text |
| Grid gap | 16px tight, 24px default, 32px spacious |
| Section padding | `py-16` mobile, `py-24` desktop |
