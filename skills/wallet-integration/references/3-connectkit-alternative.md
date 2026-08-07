## 3. ConnectKit Alternative

```bash
npm install connectkit wagmi@2 viem @tanstack/react-query
```

```tsx
import { ConnectKitProvider, ConnectKitButton, getDefaultConfig } from 'connectkit';
import { WagmiProvider, createConfig } from 'wagmi';
import { mainnet, polygon } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const config = createConfig(
  getDefaultConfig({
    chains: [mainnet, polygon],
    walletConnectProjectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
    appName: 'My dApp',
  })
);

const queryClient = new QueryClient();

export default function App({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <ConnectKitProvider>
          {children}
          <ConnectKitButton />
        </ConnectKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

> For Next.js App Router, wrap ConnectKit with the same `ssr: true` + `cookieStorage` + `initialState` pattern shown above for RainbowKit — the hydration concern is identical.

---
