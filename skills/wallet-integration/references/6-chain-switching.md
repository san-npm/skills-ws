## 6. Chain Switching

```tsx
import { useSwitchChain, useChainId } from 'wagmi';
import { mainnet, polygon, arbitrum, base, celo } from 'wagmi/chains';

function ChainSwitcher() {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();
  const chains = [mainnet, polygon, arbitrum, base, celo];

  return (
    <div>
      {chains.map((chain) => (
        <button
          key={chain.id}
          onClick={() => switchChain({ chainId: chain.id })}
          disabled={chainId === chain.id || isPending}
        >
          {chain.name} {chainId === chain.id ? '✓' : ''}
        </button>
      ))}
    </div>
  );
}
```

---
