## Contents

- 1. wagmi v2 + viem Setup
- Install Dependencies
- Configuration (wagmi.ts)
- Provider Setup (App.tsx)

## 1. wagmi v2 + viem Setup

### Install Dependencies
```bash
npm install wagmi@2 viem @tanstack/react-query
# For wallet UI kit (pick one):
npm install @rainbow-me/rainbowkit    # RainbowKit
# OR
npm install connectkit                  # ConnectKit
```

### Configuration (wagmi.ts)
```typescript
import { http, createConfig } from 'wagmi';
import { mainnet, polygon, arbitrum, base, celo, sepolia } from 'wagmi/chains';
import { injected, walletConnect, coinbaseWallet } from 'wagmi/connectors';

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID!; // WalletConnect Cloud

export const config = createConfig({
  chains: [mainnet, polygon, arbitrum, base, celo, sepolia],
  connectors: [
    injected(),
    walletConnect({ projectId }),
    coinbaseWallet({ appName: 'My dApp' }),
  ],
  transports: {
    [mainnet.id]: http('https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY'),
    [polygon.id]: http('https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY'),
    [arbitrum.id]: http('https://arb-mainnet.g.alchemy.com/v2/YOUR_KEY'),
    [base.id]: http('https://base-mainnet.g.alchemy.com/v2/YOUR_KEY'),
    [celo.id]: http('https://forno.celo.org'),
    [sepolia.id]: http('https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY'),
  },
});
```

### Provider Setup (App.tsx)
```tsx
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { config } from './wagmi';

const queryClient = new QueryClient();

export default function App({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

---
