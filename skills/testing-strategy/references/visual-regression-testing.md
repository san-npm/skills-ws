## Contents

- Visual Regression Testing
- Playwright Screenshot Comparisons
- Percy Integration (Cross-Browser Visual Testing)
- Chromatic (Storybook Visual Testing)
- Threshold Tuning Rules

## Visual Regression Testing

### Playwright Screenshot Comparisons

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01, // allow 1% pixel diff
      threshold: 0.2,          // per-pixel color threshold (0-1)
      animations: 'disabled',  // freeze animations
    },
  },
});

// tests/visual.spec.ts
test('homepage visual regression', async ({ page }) => {
  await page.goto('/');
  // readiness via web-first assertion, not waitForLoadState('networkidle') (discouraged for tests)
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
  await expect(page).toHaveScreenshot('homepage.png', {
    fullPage: true,
    mask: [page.locator('.dynamic-timestamp')], // mask flaky elements
  });
});

// Component-level screenshot
test('pricing card renders correctly', async ({ page }) => {
  await page.goto('/pricing');
  const card = page.locator('[data-testid="pro-plan"]');
  await expect(card).toHaveScreenshot('pro-plan-card.png');
});
```

```bash
# Update baselines after intentional changes
npx playwright test --update-snapshots
# Run only visual tests
npx playwright test tests/visual/
```

### Percy Integration (Cross-Browser Visual Testing)

```typescript
// Install: npm i -D @percy/cli @percy/playwright
import { percySnapshot } from '@percy/playwright';

test('checkout flow visual', async ({ page }) => {
  await page.goto('/checkout');
  await page.fill('#email', 'test@example.com');
  await percySnapshot(page, 'Checkout - Email Filled', {
    widths: [375, 768, 1280], // test responsive breakpoints
    minHeight: 1024,
  });
});
```

```yaml
# CI: Percy runs
- run: npx percy exec -- npx playwright test tests/visual/
  env:
    PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}
```

### Chromatic (Storybook Visual Testing)

```bash
npm i -D chromatic
# Token from the CI secret store, never committed:
npx chromatic --project-token="$CHROMATIC_PROJECT_TOKEN"
# CI: runs on every push, compares against baseline branch
```

### Threshold Tuning Rules

| Scenario | maxDiffPixelRatio | threshold | Notes |
|----------|-------------------|-----------|-------|
| Pixel-perfect UI | 0.001 | 0.1 | Tight — catches font rendering diffs |
| General pages | 0.01 | 0.2 | Balanced default |
| Data-heavy pages | 0.05 | 0.3 | Loose — dynamic content |

**Tip:** Mask timestamps, avatars, and animated elements. Use `animations: 'disabled'` globally.
