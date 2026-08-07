## Contents

- 4. Bundle Analysis & Tree Shaking
- Dynamic imports
- Tree shaking traps

## 4. Bundle Analysis & Tree Shaking

```bash
npm install -D @next/bundle-analyzer
```

```typescript
// next.config.ts (ESM/TS). For CommonJS next.config.js use require()/module.exports.
import type { NextConfig } from 'next';
import bundleAnalyzer from '@next/bundle-analyzer';

const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' });

const nextConfig: NextConfig = { /* ... */ };
export default withBundleAnalyzer(nextConfig);
```

```bash
ANALYZE=true npm run build   # opens treemaps for client + server bundles
```

### Dynamic imports

```tsx
// BAD: imports entire library for everyone
import { Chart } from 'chart.js/auto';

// GOOD: load only when needed
import dynamic from 'next/dynamic';
// Must live in a Client Component ('use client'): `ssr: false` throws in
// Server Components; move the dynamic() call into a client file.
const Chart = dynamic(() => import('@/components/chart'), {
  loading: () => <div className="h-[400px] animate-pulse bg-gray-100 rounded" />,
  ssr: false,
});
```

### Tree shaking traps

```tsx
// BAD: barrel import pulls everything
import { Button, Input } from '@/components/ui';

// GOOD: direct imports
import { Button } from '@/components/ui/button';

// BAD: full lodash (71KB)
import _ from 'lodash';

// GOOD: specific import (1KB)
import debounce from 'lodash/debounce';

// Heavy lib alternatives:
// moment (300KB) → dayjs (2KB) or date-fns
// axios (29KB) → native fetch
// uuid (12KB) → crypto.randomUUID()
// classnames (1KB) → clsx (228B)
```

---
