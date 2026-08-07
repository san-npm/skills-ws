## Contents

- Feature Flags
- DIY Feature Flags
- LaunchDarkly Integration

## Feature Flags

### DIY Feature Flags

```typescript
type FeatureFlag = {
  enabled: boolean;
  rolloutPercentage?: number;
  allowList?: string[];
};

const FLAGS: Record<string, FeatureFlag> = {
  'new-checkout-flow': {
    enabled: true,
    rolloutPercentage: 25,
  },
  'admin-analytics-v2': {
    enabled: true,
    allowList: ['user_123', 'user_456'],
  },
  'dark-mode': {
    enabled: process.env.ENABLE_DARK_MODE === 'true',
  },
};

export function isFeatureEnabled(flag: string, userId?: string): boolean {
  const f = FLAGS[flag];
  if (!f || !f.enabled) return false;

  if (f.allowList && userId) {
    return f.allowList.includes(userId);
  }

  if (f.rolloutPercentage !== undefined && userId) {
    const hash = simpleHash(userId + flag);
    return (hash % 100) < f.rolloutPercentage;
  }

  return f.enabled;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
```

### LaunchDarkly Integration

```typescript
import * as LaunchDarkly from '@launchdarkly/node-server-sdk';

const client = LaunchDarkly.init(process.env.LAUNCHDARKLY_SDK_KEY!);
await client.waitForInitialization({ timeout: 5 });

async function handler(req: Request) {
  const user = {
    key: req.userId,
    email: req.userEmail,
    custom: { plan: req.userPlan, company: req.companyId },
  };

  const showNewCheckout = await client.variation('new-checkout-flow', user, false);
  return showNewCheckout ? renderNewCheckout() : renderOldCheckout();
}
```

---
