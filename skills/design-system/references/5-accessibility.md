## Contents

- 5. Accessibility
- Component Accessibility Checklist (WCAG 2.2 AA)
- Accessible Dialog Example
- Focus Management
- Reduced Motion
- Forced Colors / Windows High Contrast
- Per-Component ARIA Patterns (WAI-ARIA APG)
- Automated A11y Enforcement (CI gate)

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
