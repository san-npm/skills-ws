---
name: design-system
description: "Build and audit React/Tailwind design systems: design tokens, CVA component libraries, Storybook 10 docs/tests, WCAG 2.2 accessibility, theming, Figma-to-code token pipelines, npm publishing. Use when building or reviewing a component library, token pipeline, Storybook setup, theming, or Figma handoff on React 18/19 + Tailwind v4."
---

# Design System Implementation

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

## 2. Component Architecture (Atomic Design)

### Hierarchy

```
Atoms       → Button, Input, Badge, Avatar, Icon
Molecules   → SearchBar (Input + Button), FormField (Label + Input + Error)
Organisms   → Header (Logo + Nav + Avatar), Card (Image + Title + Badge + Button)
Templates   → Page layouts, grid systems
Pages       → Composed from templates + organisms
```

### Component File Structure

```
packages/ui/src/
├── components/
│   ├── button/
│   │   ├── button.tsx          # Component implementation
│   │   ├── button.variants.ts  # CVA variants
│   │   ├── button.test.tsx     # Unit tests
│   │   ├── button.stories.tsx  # Storybook stories
│   │   └── index.ts            # Re-export
│   ├── input/
│   │   └── ...
│   └── card/
│       └── ...
├── tokens/
│   ├── base.css
│   └── dark.css
├── utils/
│   └── cn.ts                   # classname merge utility
└── index.ts                    # Public API exports
```

### The `cn()` Utility

```typescript
// packages/ui/src/utils/cn.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

---

## 3. Component Variants with CVA

```typescript
// components/button/button.variants.ts
import { cva, type VariantProps } from 'class-variance-authority';

export const buttonVariants = cva(
  // Base styles (always applied). Covers BOTH native disabled and the
  // aria-disabled state used when rendered asChild (anchor / custom element).
  'inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary-hover',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive-hover',
        outline: 'border border-border bg-background hover:bg-muted',
        ghost: 'hover:bg-muted',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-sm gap-1.5',
        md: 'h-10 px-4 text-sm gap-2',
        lg: 'h-12 px-6 text-base gap-2.5',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export type ButtonVariants = VariantProps<typeof buttonVariants>;
```

```tsx
// components/button/button.tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '../../utils/cn';
import { buttonVariants, type ButtonVariants } from './button.variants';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariants {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, onClick, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    const isDisabled = disabled || loading;

    // CAUTION: `disabled` is NOT a valid attribute on <a> or arbitrary custom
    // elements. When asChild forwards props to a non-<button>, the native
    // `disabled` is silently ignored — the element stays focusable and clickable.
    // So: only set the native `disabled` on a real <button>; for everything else
    // express the disabled state with aria-disabled + tabIndex={-1} and block clicks.
    const disabledProps = asChild
      ? {
          'aria-disabled': isDisabled || undefined,
          'data-disabled': isDisabled ? '' : undefined,
          tabIndex: isDisabled ? -1 : props.tabIndex,
          onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
            if (isDisabled) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            onClick?.(e);
          },
        }
      : { disabled: isDisabled, onClick };

    // Spread props FIRST, then disabledProps, so the guarded onClick / tabIndex
    // and aria-disabled win over anything passed in by the consumer.
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        aria-busy={loading || undefined}
        {...props}
        {...disabledProps}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';
```

> The `disabled:pointer-events-none disabled:opacity-50` base style only fires on a real `disabled` button. To dim a disabled `asChild` link, add the matching `aria-disabled` selector to the variant base: `aria-disabled:pointer-events-none aria-disabled:opacity-50`. Note `pointer-events-none` stops mouse clicks but **not** keyboard activation — that is why the `onClick` guard and `tabIndex={-1}` above are still required.

---

## 4. Storybook Setup (Storybook 10)

Storybook 10 (stable Oct 2025; ESM-only, Node 20.19+ or 22.12+) keeps the big 9.x shifts in place:

- **`addon-essentials`, `addon-docs`, `addon-controls`, `addon-interactions`, `addon-viewport`, `addon-backgrounds` are folded into the core.** Do not list them in `addons` anymore — `init` strips them. Autodocs and controls work out of the box.
- **Component testing moved to Vitest.** The old `@storybook/test-runner` (Jest + Playwright) is superseded by **`@storybook/addon-vitest`**, which runs every story as a real Vitest browser-mode test. `play` functions become assertions; failures fail `vitest`/CI.
- **`@storybook/test` is deprecated** in favor of importing `within`, `userEvent`, `expect`, `waitFor` from `storybook/test`.
- Bundle is another ~29% lighter than v9; ESM-only and a Vite-based framework are expected.

### Installation

```bash
# Fresh install (detects React + Vite, scaffolds addon-vitest + a11y)
npx storybook@latest init

# Upgrading an existing 7/8 project — runs codemods (removes merged addons, migrates test-runner)
npx storybook@latest upgrade
```

The init flow asks to set up component testing; accept it to get `@storybook/addon-vitest`, a `vitest.config.ts` project, and `.storybook/vitest.setup.ts` wired automatically.

### Configuration

```typescript
// .storybook/main.ts
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(ts|tsx)'],
  // Only NON-core addons go here in SB10. essentials/docs/controls are built in.
  addons: ['@storybook/addon-a11y', '@storybook/addon-vitest'],
  framework: '@storybook/react-vite',
};
export default config;
```

> Autodocs is driven by the `'autodocs'` tag (per story/component, or project-wide via `tags: ['autodocs']` in `preview.ts`); the old `docs.autodocs` option in `main.ts` was removed in 9.0.

```typescript
// .storybook/preview.ts — turn the a11y addon into a hard gate
import type { Preview } from '@storybook/react-vite';

const preview: Preview = {
  parameters: {
    a11y: {
      // 'error' fails the build/test on axe violations; 'todo' only warns.
      test: 'error',
    },
  },
};
export default preview;
```

### Writing Stories

```tsx
// components/button/button.stories.tsx
// SB10: import the typed helpers from the framework package, not '@storybook/react'.
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button } from './button';

const meta = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
    },
    size: { control: 'select', options: ['sm', 'md', 'lg', 'icon'] },
    loading: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: 'Button', variant: 'default', size: 'md' },
};

export const Secondary: Story = {
  args: { children: 'Secondary', variant: 'secondary' },
};

export const Destructive: Story = {
  args: { children: 'Delete', variant: 'destructive' },
};

export const Loading: Story = {
  args: { children: 'Saving...', loading: true },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};
```

---

## 5. Accessibility

### Component Accessibility Checklist (WCAG 2.2 AA)

WCAG 2.2 (W3C Recommendation, Oct 2023) is the target baseline in 2026; it adds **2.4.11 Focus Not Obscured**, **2.4.13 Focus Appearance**, **2.5.8 Target Size (min 24×24 CSS px)**, and **3.3.8 Accessible Authentication** (2.4.13 is Level AAA; rows marked AAA exceed the AA baseline and are recommended, not required, for AA conformance). Every component must meet:

| Requirement | WCAG SC | Implementation |
|-------------|---------|----------------|
| Keyboard navigation | 2.1.1 | Tab, Enter, Space, Escape, Arrow keys per the WAI-ARIA APG pattern |
| Focus visible | 2.4.7 | `focus-visible:ring-2 focus-visible:ring-ring` |
| Focus appearance | 2.4.13 (AAA) | Indicator ≥ 2px thick, ≥ 3:1 contrast vs adjacent colors (`ring-offset-2` helps) |
| Focus not obscured | 2.4.11 | Sticky headers/toolbars must not cover the focused element |
| Target size | 2.5.8 | Interactive targets ≥ 24×24px (our `size="sm"` button is `h-8`=32px ✓; `size="icon"` is 40px ✓) |
| ARIA labels | 4.1.2 | `aria-label`, `aria-labelledby`, `aria-describedby` |
| Roles & state | 4.1.2 | Correct roles (`button`,`dialog`,`alert`) + state (`aria-expanded`, `aria-selected`, `aria-pressed`) |
| Screen reader text | 1.1.1 | `sr-only` class for visually-hidden labels; `aria-hidden` on decorative icons |
| Color contrast | 1.4.3 / 1.4.11 | 4.5:1 text, 3:1 large text **and** non-text UI (borders, icons, focus rings) |
| High-contrast / forced colors | 1.4.1 | Don't convey state by color alone; test Windows High Contrast / `forced-colors` |
| Motion | 2.3.3 (AAA) | `prefers-reduced-motion` media query |

### Accessible Dialog Example

```tsx
import * as Dialog from '@radix-ui/react-dialog';

export function Modal({ trigger, title, description, children }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-fadeIn" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-lg p-6 shadow-xl w-full max-w-md"
          aria-describedby="modal-description"
        >
          <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
          <Dialog.Description id="modal-description" className="text-muted-foreground mt-2">
            {description}
          </Dialog.Description>
          <div className="mt-4">{children}</div>
          <Dialog.Close asChild>
            <button
              className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Close"
            >
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

### Focus Management

```typescript
// Trap focus within a container
import { useFocusTrap } from '@mantine/hooks';
// or use Radix primitives which handle focus trapping automatically

// Return focus after closing
const triggerRef = useRef<HTMLButtonElement>(null);
function onClose() {
  setOpen(false);
  triggerRef.current?.focus(); // Return focus to trigger element
}
```

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Forced Colors / Windows High Contrast

In forced-colors mode the OS overrides your palette with a system theme, so anything that relied on `background-color` or `box-shadow` to convey state can vanish. Prefer system color keywords and keep borders/outlines.

```css
@media (forced-colors: active) {
  /* Box-shadow focus rings are stripped — restore a real outline. */
  .btn:focus-visible { outline: 2px solid CanvasText; outline-offset: 2px; }
  /* Selected/active state must use a forced-colors-aware system color. */
  [aria-selected="true"] { forced-color-adjust: none; background: Highlight; color: HighlightText; }
  /* Disabled controls should map to GrayText. */
  [disabled], [aria-disabled="true"] { color: GrayText; }
}
```

### Per-Component ARIA Patterns (WAI-ARIA APG)

Implement these keyboard contracts. Radix UI / Ark UI / React Aria give them for free — but you still own testing them. Map to the [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/).

| Component | Role(s) | Required keys | Critical state attrs |
|-----------|---------|---------------|----------------------|
| **Button** | `button` | Enter, Space activate | `aria-pressed` (toggle), `aria-disabled`, `aria-busy` |
| **Dialog (modal)** | `dialog` `aria-modal="true"` | Esc closes; **focus trapped**; focus returns to trigger | `aria-labelledby`, `aria-describedby` |
| **Menu** | `menu` / `menuitem` | ↑↓ move, Enter/Space select, Esc close, Home/End, type-ahead | `aria-haspopup`, `aria-expanded`, `aria-orientation` |
| **Combobox** | `combobox` + `listbox` | ↑↓ navigate options, Enter select, Esc close, type filters | `aria-expanded`, `aria-controls`, `aria-activedescendant`, `aria-autocomplete` |
| **Tabs** | `tablist`/`tab`/`tabpanel` | ←→ (or ↑↓) move tabs, Home/End; automatic vs manual activation | `aria-selected`, `aria-controls`, `tabindex="-1"` on inactive |
| **Tooltip** | `tooltip` | Shows on focus **and** hover; Esc dismisses; not focusable itself | `aria-describedby` on the trigger |
| **Toast** | `status`/`alert` in an `aria-live` region | Reachable via keyboard; not auto-dismissed if interactive | `role="alert"` (assertive) vs `role="status"` (polite) |

> **Tooltip gotcha (WCAG 1.4.13 Content on Hover/Focus):** the tooltip must be dismissable (Esc), hoverable (stays open while the pointer moves onto it), and persistent (no time-out while hovered/focused). A pure CSS `:hover` tooltip fails all three.

### Automated A11y Enforcement (CI gate)

Catch ~30-40% of issues automatically with **axe-core**; the rest needs manual keyboard + screen-reader testing. Wire three layers:

**1. Storybook `addon-a11y` as a Vitest gate.** With `a11y: { test: 'error' }` set in `preview.ts` (above) and `@storybook/addon-vitest` installed, every story is axe-scanned during `vitest`. Annotate the setup file:

```typescript
// .storybook/vitest.setup.ts
import { setProjectAnnotations } from '@storybook/react-vite';
import * as a11yAddonAnnotations from '@storybook/addon-a11y/preview';
import * as previewAnnotations from './preview';

// addon-vitest loads Storybook's beforeAll hook automatically; no manual wiring.
setProjectAnnotations([previewAnnotations, a11yAddonAnnotations]);
```

**2. Jest/Vitest unit assertion with `jest-axe`** for components tested outside Storybook:

```tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect, it } from 'vitest';
import { Button } from './button';

// Register the custom matcher (jest-axe ships it; do this once, e.g. in test setup).
expect.extend(toHaveNoViolations);

it('has no axe violations', async () => {
  const { container } = render(<Button>Save</Button>);
  expect(await axe(container)).toHaveNoViolations();
});
```

**3. Keyboard interaction tests per pattern** — assert the contract from the table above, not just rendering. Example for a Menu (Storybook `play` / Vitest browser mode):

```tsx
import { within, userEvent, expect } from 'storybook/test';

export const MenuKeyboard: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('button', { name: 'Options' });
    await userEvent.click(trigger);
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Arrow keys move roving focus across menuitems
    await userEvent.keyboard('{ArrowDown}');
    const items = canvas.getAllByRole('menuitem');
    await expect(items[0]).toHaveFocus();
    await userEvent.keyboard('{ArrowDown}');
    await expect(items[1]).toHaveFocus();

    // Escape closes and returns focus to the trigger
    await userEvent.keyboard('{Escape}');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toHaveFocus();
  },
};
```

---

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

## 7. Figma-to-Code Workflow

### Handoff Checklist

| Step | Tool (2026) | Action |
|------|-------------|--------|
| Token source of truth | **Native Figma variables** (Dev Mode → Variables) or **Tokens Studio** plugin | Author colors/spacing/typography as variables with light/dark modes |
| Token export | Tokens Studio (→ GitHub/JSON sync) or Figma Variables REST API / Dev Mode "Export variables" | Emit **DTCG** JSON (`$value`/`$type`) |
| Component specs | Figma **Dev Mode** | Inspect spacing, colors, typography; copy values as CSS vars |
| Code linkage | Figma **Code Connect** | Map a Figma component to its real `<Button />` so Dev Mode shows your code |
| Asset export | Dev Mode → SVG/PNG, or SVGR for React icons | Export icons/images |
| Responsive behavior | Figma auto-layout | Map to flex/grid CSS |
| Interaction specs | Figma prototyping | Document hover, active, focus states |

> The old standalone **"Figma Tokens"** plugin was renamed **Tokens Studio** years ago. For simple systems, **native Figma variables** (with the Variables REST API or Dev Mode export) are now enough and need no plugin; reach for Tokens Studio when you want themes, math/aliasing, and Git two-way sync.

### Token Transform Pipeline (DTCG → CSS/TS)

Tokens Studio and Figma variables export the **Design Tokens Community Group (DTCG)** format (a community group draft, not a W3C standard). Style Dictionary v4+ consumes it natively and outputs platform files. For a **Tailwind v4** target, emit a `@theme {}` block instead of `:root` so tokens become utilities automatically (see §1).

```bash
npm i -D style-dictionary
npx style-dictionary build --config style-dictionary.config.mjs
```

```js
// style-dictionary.config.mjs  (Style Dictionary v4+, ESM)
import StyleDictionary from 'style-dictionary';

// Custom format: wrap CSS variables in @theme {} for Tailwind v4.
StyleDictionary.registerFormat({
  name: 'css/tailwind-theme',
  format: ({ dictionary }) =>
    `@import "tailwindcss";\n\n@theme {\n` +
    dictionary.allTokens.map((t) => `  --${t.name}: ${t.value};`).join('\n') +
    `\n}\n`,
});

export default {
  source: ['tokens/**/*.json'],
  // Style Dictionary v4+ parses DTCG $value/$type natively; no preprocessor needed for plain DTCG.
  platforms: {
    tailwind: {
      transformGroup: 'css',
      buildPath: 'src/tokens/',
      files: [{ destination: 'theme.css', format: 'css/tailwind-theme' }],
    },
    // Legacy/v3 or non-Tailwind: plain :root variables
    css: {
      transformGroup: 'css',
      buildPath: 'src/tokens/',
      files: [{ destination: 'variables.css', format: 'css/variables' }],
    },
    js: {
      transformGroup: 'js',
      buildPath: 'src/tokens/',
      files: [{ destination: 'tokens.ts', format: 'javascript/es6' }],
    },
  },
};
```

> Style Dictionary v4 ships with `@tokens-studio/sd-transforms` support; install it (`npm i -D @tokens-studio/sd-transforms`) and register its transforms/preprocessor if your tokens use Tokens Studio math, references, or typography composites.

---

## 8. Testing Components

### Visual Regression with Chromatic

```bash
npm i -D chromatic
npx chromatic --project-token="$CHROMATIC_PROJECT_TOKEN"
```

Add to CI so visual diffs **block the PR** until a reviewer accepts them. Do **not** ship `--exit-zero-on-changes` as the default — that lets regressions merge silently; it's only for a temporary unblock.

```yaml
# .github/workflows/ui.yml
- name: Visual regression (blocks PR on unreviewed diffs)
  # Pin the action (major tag or, stricter, a full commit SHA); avoid @latest in CI.
  uses: chromaui/action@v18
  with:
    projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
    # Auto-accept baselines only on the trunk; PRs must be reviewed.
    autoAcceptChanges: main
    exitZeroOnChanges: false   # non-zero exit on undecided changes → red check
    onlyChanged: true          # TurboSnap: snapshot only stories affected by the diff
```

### Component / Interaction Tests with Vitest (Storybook 10)

In SB10, stories run as Vitest browser tests via `@storybook/addon-vitest`. Run them in CI alongside Chromatic; `play` failures and `a11y: 'error'` violations turn the check red. Import test utilities from **`storybook/test`** (the `@storybook/test` package is deprecated).

```yaml
- name: Component + a11y tests (Storybook stories via Vitest)
  run: npx vitest run --project=storybook
```

```tsx
import { within, userEvent, expect } from 'storybook/test';

export const ClickTest: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole('button');
    await userEvent.click(button);
    await expect(button).toHaveAttribute('aria-busy', 'true');
  },
};
```

### Unit Testing with Vitest + Testing Library

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('handles click', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows loading state', () => {
    render(<Button loading>Save</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('applies variant classes', () => {
    render(<Button variant="destructive">Delete</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-destructive');
  });
});
```

---

## 9. Publishing Components

### Package.json for Publishing

```json
{
  "name": "@myorg/ui",
  "version": "1.2.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./styles.css": "./dist/styles.css"
  },
  "files": ["dist"],
  "sideEffects": ["**/*.css"],
  "peerDependencies": {
    "react": ">=18 <20",
    "react-dom": ">=18 <20"
  },
  "peerDependenciesMeta": {
    "react-dom": { "optional": false }
  },
  "scripts": {
    "build": "tsup",
    "prepublishOnly": "npm run build"
  }
}
```

> **React 19 support (stable since Dec 2024):** widen the peer range to `>=18 <20` so the package installs cleanly in React 19 apps. React 19 removed `propTypes`/`defaultProps` on function components, ships its own JSX runtime, and made `ref` a regular prop (so `forwardRef` is optional but still works — keep it for v18 compatibility). Verify your Radix/CVA deps have React 19 in *their* peer ranges before widening yours.

> **React Server Components:** a component library is consumed inside RSC trees. Any file using hooks, event handlers, or browser APIs (e.g. `ThemeToggle`, `Dialog`) must start with the `"use client"` directive, and your bundler must **preserve** that banner in the output — otherwise Next.js throws "You're importing a component that needs `useState`…". Purely presentational components (Button without `loading` state, Badge) can stay server-compatible.

### Build with tsup

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  // Externalize React AND the JSX runtimes so consumers dedupe a single copy.
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  treeshake: true,
  // Keep "use client" / "use server" directives in the emitted chunks (RSC-safe).
  banner: { js: '"use client";' }, // OR set esbuildOptions to preserve per-file directives
});
```

> If only *some* components are client components, don't blanket-banner the whole bundle. Instead split entries (e.g. `src/client.ts` + `src/server.ts`) or use a per-file directive-preserving plugin (`esbuild-plugin-preserve-directives`) so server-safe components stay in the RSC graph.

---

## 10. Popular Systems to Reference

| System | Approach | Best for |
|--------|----------|----------|
| **shadcn/ui** | Copy-paste components (Radix + Tailwind) via a CLI registry; you own the code | Full control, custom design systems on Tailwind |
| **Radix Primitives** | Unstyled, accessible behavior primitives | Hand-styled custom systems |
| **React Aria Components** (Adobe) | Unstyled, behavior + a11y; the deepest keyboard/i18n/screen-reader coverage | A11y-critical or i18n-heavy products |
| **Base UI** | Unstyled primitives from the Radix/MUI/Floating-UI teams | Newer alternative to Radix; framework-styled systems |
| **Headless UI** | Unstyled components from the Tailwind team | Small Tailwind-first projects |
| **Ark UI** | Headless, framework-agnostic (Zag.js state machines) | React + Vue + Solid from one source |
| **Mantine** | Full-featured styled components + hooks | Feature-rich apps, fast delivery |
| **Chakra UI** | Styled components + theme system | Rapid development, themeable apps |

### shadcn/ui Pattern (Recommended Starting Point)

```bash
# Initializes components.json, the cn() util, and a Tailwind-aware setup.
npx shadcn@latest init
npx shadcn@latest add button card dialog input
```

shadcn/ui generates components directly into your project — you own the code, there is no runtime dependency to upgrade. It works with Tailwind v4 (init scaffolds the CSS-first setup) and React 19. The CLI is also a **registry**: you can publish your own `registry.json` and `add` components from a private URL, which is how teams distribute an internal design system without an npm publish step. The path to a custom system:
1. Start with shadcn/ui components.
2. Customize tokens (`@theme`) and CVA variants to match your brand.
3. Add custom components following the same `cn()` + CVA + Radix patterns.
4. Extract into a shared package (§9) — or your own shadcn registry — when reused across apps.
