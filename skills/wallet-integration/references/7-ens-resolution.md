## 7. ENS Resolution

```tsx
import { useEnsName, useEnsAvatar, useEnsAddress } from 'wagmi';

function UserProfile({ address }: { address: `0x${string}` }) {
  const { data: ensName } = useEnsName({ address });
  const { data: ensAvatar } = useEnsAvatar({ name: ensName || undefined });

  return (
    <div>
      {ensAvatar && <img src={ensAvatar} alt="avatar" width={32} height={32} />}
      <span>{ensName || `${address.slice(0, 6)}...${address.slice(-4)}`}</span>
    </div>
  );
}

// Resolve ENS name to address
function ResolveENS({ name }: { name: string }) {
  const { data: address } = useEnsAddress({ name });
  return <span>{address || 'Not found'}</span>;
}
```

---
