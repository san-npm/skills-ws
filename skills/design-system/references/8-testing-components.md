## Contents

- 8. Testing Components
- Visual Regression with Chromatic
- Component / Interaction Tests with Vitest (Storybook 10)
- Unit Testing with Vitest + Testing Library

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
