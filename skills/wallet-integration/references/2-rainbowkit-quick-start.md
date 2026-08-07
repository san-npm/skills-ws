## Contents

- 2. RainbowKit Quick Start
- Setup (client-only / SPA)
- Next.js App Router (SSR-safe — avoids hydration mismatch)
- Custom Connect Button

## 2. RainbowKit Quick Start

### Setup (client-only / SPA)
```bash
npm install @rainbow-me/rainbowkit wagmi@2 viem @tanstack/react-query
```

```tsx
import '@rainbow-me/rainbowkit/styles.css';
import { getDefaultConfig, RainbowKitProvider, ConnectButton } from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { mainnet, polygon, arbitrum, base, celo } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const config = getDefaultConfig({
  appName: 'My dApp',
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
  chains: [mainnet, polygon, arbitrum, base, celo],
});

const queryClient = new QueryClient();

export default function App({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
          <ConnectButton />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### Next.js App Router (SSR-safe — avoids hydration mismatch)

`ssr: true` alone is **not** enough. On the server wagmi has no `localStorage`, so the connected account renders as disconnected; the client then hydrates *connected* and React throws a hydration mismatch (and the wallet may appear to "flicker" disconnected on every reload). The fix is to persist connection state in a **cookie**, read it in the server layout, and pass it as `initialState`. This is the current wagmi + RainbowKit Next.js pattern (as of Jun 2026; verify at https://rainbowkit.com/docs/installation and https://wagmi.sh/react/guides/ssr).

```tsx
// app/wagmi.ts  — config with ssr + cookieStorage
import { cookieStorage, createStorage } from 'wagmi';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { mainnet, polygon, arbitrum, base, celo } from 'wagmi/chains';

export function getConfig() {
  return getDefaultConfig({
    appName: 'My dApp',
    projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
    chains: [mainnet, polygon, arbitrum, base, celo],
    ssr: true,
    storage: createStorage({ storage: cookieStorage }), // persist to cookie, not localStorage
  });
}
```

```tsx
// app/providers.tsx  — 'use client'; rebuild config once per mount, seed initialState
'use client';
import '@rainbow-me/rainbowkit/styles.css';
import { useState, type ReactNode } from 'react';
import { WagmiProvider, type State } from 'wagmi';
import { RainbowKitProvider } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getConfig } from './wagmi';

export function Providers({ children, initialState }: { children: ReactNode; initialState?: State }) {
  const [config] = useState(() => getConfig());
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={config} initialState={initialState}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

```tsx
// app/layout.tsx  — server component reads the cookie and hydrates state
import { headers } from 'next/headers';
import { cookieToInitialState } from 'wagmi';
import { getConfig } from './wagmi';
import { Providers } from './providers';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const initialState = cookieToInitialState(
    getConfig(),
    (await headers()).get('cookie'), // Next.js 15+: headers() is async
  );
  return (
    <html lang="en">
      <body>
        <Providers initialState={initialState}>{children}</Providers>
      </body>
    </html>
  );
}
```

> Still seeing mismatches on a single `<ConnectButton />`? Gate any wallet-derived UI on a `mounted` flag (see the Custom Connect Button below — it already checks `mounted`) so the first client paint matches the server.

### Custom Connect Button
```tsx
import { ConnectButton } from '@rainbow-me/rainbowkit';

export function CustomConnect() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const connected = mounted && account && chain;
        return (
          <div>
            {!connected ? (
              <button onClick={openConnectModal}>Connect Wallet</button>
            ) : chain.unsupported ? (
              <button onClick={openChainModal}>Wrong Network</button>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={openChainModal}>{chain.name}</button>
                <button onClick={openAccountModal}>
                  {account.displayName}
                  {account.displayBalance ? ` (${account.displayBalance})` : ''}
                </button>
              </div>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
```

---
