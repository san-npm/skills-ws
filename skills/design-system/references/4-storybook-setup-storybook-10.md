## Contents

- 4. Storybook Setup (Storybook 10)
- Installation
- Configuration
- Writing Stories

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
