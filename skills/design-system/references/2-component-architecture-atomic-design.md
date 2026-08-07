## Contents

- 2. Component Architecture (Atomic Design)
- Hierarchy
- Component File Structure
- The cn() Utility

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
