## Contents

- Snapshot Testing
- When to Use
- Best Practices
- Snapshot Hygiene

## Snapshot Testing

### When to Use

✅ **Good for:** Serialized component output, API response shapes, config file generation, error messages
❌ **Avoid for:** Large/frequently changing outputs, CSS (use visual regression instead), implementation details

### Best Practices

```tsx
// snapshot.test.tsx
import { test, expect } from 'vitest';
import { render } from '@testing-library/react'; // needs jsdom/happy-dom env
import { Alert } from '@/components/Alert';
import { formatDisplayName } from '@/lib/format';

// ✅ Inline snapshots for small, focused assertions
test('formats user display name', () => {
  expect(formatDisplayName({ first: 'Jane', last: 'Doe' }))
    .toMatchInlineSnapshot(`"Jane Doe"`);
});

// ✅ Named snapshots for component output
test('renders error state', () => {
  const { container } = render(<Alert type="error" message="Failed" />);
  expect(container).toMatchSnapshot('alert-error');
});

// ❌ Avoid: massive snapshots that nobody reviews
test('renders entire page', () => {
  expect(render(<DashboardPage />).container).toMatchSnapshot(); // 500+ lines nobody reads
});
```

### Snapshot Hygiene

```bash
# Update snapshots after intentional changes
npx vitest --update
npx jest --updateSnapshot

# CI: fail on obsolete snapshots
npx jest --ci  # --ci flag makes Jest fail on new snapshots (must be committed)
```

```typescript
// Keep snapshots small — use property matchers
test('creates user with generated fields', () => {
  expect(createUser({ name: 'Test' })).toMatchSnapshot({
    id: expect.any(String),
    createdAt: expect.any(Date),
  });
});
```

**Rule:** If a snapshot is >50 lines, break the test into smaller assertions or use inline snapshots.
