---
name: wallet-integration
description: "Web3 wallet integration for React/Next.js dApps — RainbowKit, ConnectKit, WalletConnect, wagmi v2/viem, contract reads/writes, EIP-712 signing, chain switching, and SSR-safe hydration. Use when connecting wallets, sending transactions, signing messages, or fixing wallet hydration/precision/security issues."
---

# Web3 Wallet Integration

> Stack: **wagmi v2 + viem v2 + @tanstack/react-query v5** (the current React Web3 standard as of mid-2026; ethers-era patterns are out). RainbowKit and ConnectKit are wallet-UI layers on top of wagmi. Pin to the latest majors — check `npm view wagmi version` / `npm view viem version` before starting.

> **Address typing rule (read first).** wagmi/viem use the template-literal type `` `0x${string}` `` for every address. A placeholder like `'0xRecipient...'` (with a literal `...`) is **not** assignable to that type — TypeScript will reject it and the example won't compile. Every address in this skill is a full 40-hex-char value. **None of these are real or safe to use on mainnet** — replace them with addresses you have verified for the correct chain. Centralize them so they're easy to swap:

```typescript
// addresses.ts — verified per chain; replace before mainnet use.
import type { Address } from 'viem';

// USDC on Ethereum mainnet (chainId 1). USDC has a DIFFERENT address on every chain —
// never reuse an address across chains. Look up the canonical address per chain.
export const USDC_MAINNET: Address = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

// Obvious dummy recipients/contracts for examples. Do NOT send funds here.
export const RECIPIENT: Address      = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'; // Anvil acct #1
export const EXAMPLE_CONTRACT: Address = '0x5FbDB2315678afecb367f032d93F642f64180aa3'; // Anvil deploy #0
export const ZERO_ADDRESS: Address   = '0x0000000000000000000000000000000000000000';
```

## 1. wagmi v2 + viem Setup

### Install Dependencies
```bash
npm install wagmi viem @tanstack/react-query
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

## 2. RainbowKit Quick Start

### Setup (client-only / SPA)
```bash
npm install @rainbow-me/rainbowkit wagmi viem @tanstack/react-query
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

## 3. ConnectKit Alternative

```bash
npm install connectkit wagmi viem @tanstack/react-query
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

## 4. Contract Read/Write Hooks

### Read Contract Data
```tsx
import { useReadContract } from 'wagmi';
import { erc20Abi, formatUnits, type Address } from 'viem';

function TokenBalance({ token, account }: { token: Address; account: Address }) {
  const { data: balance, isLoading, error } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account],
  });

  const { data: decimals } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: 'decimals',
  });

  const { data: symbol } = useReadContract({
    address: token,
    abi: erc20Abi,
    functionName: 'symbol',
  });

  if (isLoading) return <span>Loading...</span>;
  if (error) return <span>Error: {error.message}</span>;

  // NEVER do `Number(balance) / 10 ** decimals`: ERC-20 balances are `bigint` (uint256).
  // Number maxes out at 2^53-1, so an 18-decimal token balance silently loses precision.
  // viem's formatUnits keeps full precision and returns a string.
  const formatted =
    balance !== undefined && decimals !== undefined
      ? Number(formatUnits(balance, decimals)).toLocaleString(undefined, { maximumFractionDigits: 4 })
      : '0';

  return <span>{formatted} {symbol}</span>;
}
```

> `formatUnits(value, decimals)` (bigint → display string) and `parseUnits('1.5', decimals)` (display string → bigint) are the only correct way to convert token amounts. `formatEther`/`parseEther` are the 18-decimal shorthands. Do arithmetic on the raw `bigint`, format only at the display edge.

### Write Contract (simulate → write → wait)

Production writes follow a strict order: **verify the chain → simulate → write the simulated request → wait for receipt.** `useSimulateContract` does an `eth_call` against the current state, so it surfaces reverts (insufficient balance, paused contract, bad args) *before* the wallet popup and gives `writeContract` a fully-typed, gas-estimated request. Sending a raw object instead skips that safety net.

```tsx
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useSimulateContract,
  useChainId,
} from 'wagmi';
import { parseUnits } from 'viem';
import { mainnet } from 'wagmi/chains';
import { USDC_MAINNET, RECIPIENT } from './addresses';

const erc20Abi = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

function TransferToken() {
  const chainId = useChainId();
  const onMainnet = chainId === mainnet.id; // token address below is mainnet-only

  // 1. Simulate first. `simulateData?.request` is a typed, ready-to-send tx.
  const { data: simulateData, error: simError } = useSimulateContract({
    address: USDC_MAINNET,
    abi: erc20Abi,
    functionName: 'transfer',
    args: [RECIPIENT, parseUnits('100', 6)], // USDC has 6 decimals
    query: { enabled: onMainnet },           // don't simulate against the wrong chain
  });

  const { data: hash, writeContract, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  if (!onMainnet) return <p>Switch to Ethereum mainnet to send USDC.</p>;
  if (simError)   return <p>Cannot send: {simError.message}</p>; // revert caught pre-popup

  return (
    <div>
      <button
        onClick={() => simulateData && writeContract(simulateData.request)}
        disabled={!simulateData || isPending}
      >
        {isPending ? 'Confirm in wallet...' : 'Send 100 USDC'}
      </button>
      {isConfirming && <p>Waiting for confirmation...</p>}
      {isSuccess && <p>Transfer confirmed! TX: {hash}</p>}
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

> Token addresses are **per-chain**. `USDC_MAINNET` is only valid on chainId 1 — sending it while connected to Polygon either reverts or hits an unrelated contract. Always gate writes on `chainId` and resolve the token address from a per-chain map.

### Send Native ETH
```tsx
import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { RECIPIENT } from './addresses';

function SendEth() {
  const { data: hash, sendTransaction, isPending } = useSendTransaction();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  return (
    <button onClick={() => sendTransaction({
      to: RECIPIENT,               // full 0x-address from your verified constants
      value: parseEther('0.1'),    // 0.1 ETH as bigint wei
    })}>
      {isPending ? 'Sending...' : 'Send 0.1 ETH'}
    </button>
  );
}
```

---

## 5. EIP-712 Typed Message Signing

```tsx
import { useSignTypedData, useAccount, useChainId } from 'wagmi';
import { USDC_MAINNET, RECIPIENT } from './addresses';

function SignPermit() {
  const { address: owner } = useAccount();
  const chainId = useChainId();
  const { signTypedData, data: signature } = useSignTypedData();

  function handleSign() {
    if (!owner) return;
    signTypedData({
      domain: {
        name: 'USD Coin',
        version: '2',
        chainId,                       // bind the signature to the connected chain
        verifyingContract: USDC_MAINNET, // the token/contract you're permitting
      },
      types: {
        Permit: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
        ],
      },
      primaryType: 'Permit',
      message: {
        owner,                         // the connected account, not a hardcoded address
        spender: RECIPIENT,            // who you're granting an allowance to
        value: 1000000n,               // 1 USDC (6 decimals) — show this to the user verbatim
        nonce: 0n,                     // read from the token's nonces(owner) before signing
        deadline: BigInt(Math.floor(Date.now() / 1000) + 3600),
      },
    });
  }

  return (
    <div>
      <button onClick={handleSign}>Sign Permit</button>
      {signature && <p>Signature: {signature}</p>}
    </div>
  );
}
```

> A `Permit` signature is a **gasless approval** — once signed, anyone can submit it to grant `spender` an allowance. Always render `spender`, `value`, the token name, and chain in your UI before calling `signTypedData`, fetch the live `nonce` from the contract, and prefer a finite `value` over `type(uint256).max`. See section 13 for the full signing-safety checklist.

---

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

## 8. viem Client (Non-React)

```typescript
import { createPublicClient, createWalletClient, http, custom, erc20Abi, type Hash } from 'viem';
import { mainnet } from 'viem/chains';
import { USDC_MAINNET, RECIPIENT } from './addresses';

// Read-only client
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http('https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY'),
});

// Read data — addresses/hashes are typed `0x${string}`
const balance = await publicClient.getBalance({ address: RECIPIENT });
const blockNumber = await publicClient.getBlockNumber();
const someHash = '0x0000000000000000000000000000000000000000000000000000000000000000' as Hash;
const txReceipt = await publicClient.getTransactionReceipt({ hash: someHash });

// Read contract
const totalSupply = await publicClient.readContract({
  address: USDC_MAINNET,
  abi: erc20Abi,
  functionName: 'totalSupply',
});

// Wallet client (browser). `window.ethereum` is injected by the wallet (EIP-1193).
const walletClient = createWalletClient({
  chain: mainnet,
  transport: custom(window.ethereum!),
});

const [account] = await walletClient.getAddresses();

// Simulate first, then send the validated request (same safety as useSimulateContract).
const { request } = await publicClient.simulateContract({
  address: USDC_MAINNET,
  abi: erc20Abi,
  functionName: 'transfer',
  args: [RECIPIENT, 1000000n], // 1 USDC (6 decimals)
  account,
});
const hash = await walletClient.writeContract(request);
```

---

## 9. TypeScript Contract Types

```typescript
// Define contract ABI as const for full type inference
const vaultAbi = [
  {
    name: 'deposit',
    type: 'function',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'Deposited',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;

// Full type safety in hooks (EXAMPLE_CONTRACT / RECIPIENT are typed `0x${string}`):
import { EXAMPLE_CONTRACT, RECIPIENT } from './addresses';

const { data } = useReadContract({
  address: EXAMPLE_CONTRACT,
  abi: vaultAbi,
  functionName: 'balanceOf', // autocomplete works
  args: [RECIPIENT],         // typed as [Address]
}); // data typed as bigint
```

---

## 10. Error Handling Patterns

```tsx
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { BaseError, ContractFunctionRevertedError, UserRejectedRequestError } from 'viem';

function MintNFT() {
  const { writeContract, error, data: hash, isPending } = useWriteContract();
  const { isLoading, isSuccess, error: receiptError } = useWaitForTransactionReceipt({ hash });

  function getErrorMessage(err: Error): string {
    if (err instanceof BaseError) {
      const revertError = err.walk((e) => e instanceof ContractFunctionRevertedError);
      if (revertError instanceof ContractFunctionRevertedError) {
        return revertError.data?.errorName || 'Contract reverted';
      }
      if (err.walk((e) => e instanceof UserRejectedRequestError)) {
        return 'Transaction rejected by user';
      }
    }
    return err.message;
  }

  return (
    <div>
      <button onClick={() => writeContract({ /* ... */ })} disabled={isPending || isLoading}>
        {isPending ? 'Confirm in wallet...' : isLoading ? 'Mining...' : 'Mint'}
      </button>
      {isSuccess && <p>✅ Minted! TX: {hash}</p>}
      {error && <p>❌ {getErrorMessage(error)}</p>}
    </div>
  );
}
```

---

## 11. Mobile Wallet Deep Links

**Prefer WalletConnect for mobile.** RainbowKit / ConnectKit already render a "Get the app" / QR flow over WalletConnect, which opens the wallet's in-app browser and survives across wallets — you rarely need to build deep links by hand. Reach for raw deep links only for a single, branded "Open in MetaMask" button.

```typescript
// Deep-link builders. Host paths/params change — verify against each wallet's current docs
// (as of Jun 2026): MetaMask https://docs.metamask.io/wallet/how-to/use-mobile/ ,
// Coinbase Wallet https://docs.cdp.coinbase.com/ , Trust https://developer.trustwallet.com/ .
const deepLinks = {
  metamask: `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`,
  trust: `https://link.trustwallet.com/open_url?url=${encodeURIComponent(window.location.href)}`,
  coinbase: `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(window.location.href)}`,
};

const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
```

```tsx
// Render an EXPLICIT button. NEVER do `window.location.href = deepLink` automatically:
// auto-navigating on `!window.ethereum` hijacks the page, breaks the back button, and
// can be abused to bounce users to an attacker-controlled URL. Make wallet hand-off a click.
function OpenInWallet() {
  if (!isMobile || typeof window.ethereum !== 'undefined') return null; // wallet already present
  return (
    <a href={deepLinks.metamask} rel="noopener noreferrer">
      Open in MetaMask
    </a>
  );
}
```

---

## 12. WalletConnect / Reown Project ID

WalletConnect rebranded its developer platform to **Reown**; the dashboard now lives at https://dashboard.reown.com (the old `cloud.walletconnect.com` redirects there). Steps:

1. Sign in at https://dashboard.reown.com and create a new project.
2. Copy the **Project ID**.
3. Add it to `.env.local` as `NEXT_PUBLIC_WC_PROJECT_ID=...` (the `NEXT_PUBLIC_` prefix exposes it to the browser, which is required and safe for this ID).
4. In the dashboard, set the project's **allowed domains / origins** to your production + localhost URLs, or connections will be rejected.

Required for: the WalletConnect modal, RainbowKit, ConnectKit, and any mobile wallet connection.

> **Quotas/pricing change** — there is a free tier suitable for development and small dApps, with paid plans above it. Do not hardcode a specific message/MAU cap; confirm current limits and pricing at https://dashboard.reown.com and https://reown.com/pricing (as of Jun 2026).

---

## 13. Security Guardrails (money-moving — read before shipping)

> A wallet integration signs and broadcasts transactions that move real, irreversible funds. Treat every signature request as adversarial input and every contract address as untrusted until verified. The rules below are non-negotiable for production.

**Seed phrases & private keys**
- **Never** ask the user for their seed phrase, mnemonic, or private key — no legitimate dApp ever needs them. A field that requests them is a phishing pattern; remove it. The wallet (MetaMask, etc.) holds the key and signs locally.
- Never put a private key in frontend code, env vars shipped to the browser, or logs. Server-side signers (relayers) keep keys in a KMS/HSM or a secret manager, never in `NEXT_PUBLIC_*`.

**Before every write / signature, show and verify**
- **Chain:** confirm `chainId` is one you support and that the contract/token address is the correct one *for that chain* (addresses differ per chain — see the per-chain note in section 4).
- **Spender & amount:** render the spender address (or `verifyingContract`) and the human-readable amount (via `formatUnits`) in your own UI. Don't rely solely on the wallet popup.
- **Simulate:** run `useSimulateContract` / `publicClient.simulateContract` first so reverts surface before the popup (section 4).

**Approvals (ERC-20 `approve` / Permit2)**
- Handle approvals as a **separate, explicit step** from the action that spends the allowance — never bundle an unlimited approval into an unrelated click.
- Prefer **exact-amount** approvals over `type(uint256).max` (unlimited). If you must use unlimited for UX, say so and offer a one-click revoke.
- A signed **Permit/Permit2** is a gasless allowance — anyone can submit it. Show spender + value + token + deadline + chain, fetch the live `nonce`, and keep deadlines short.

```tsx
// Allowance check → approve (exact amount) → spend. Approve only the shortfall.
import { useReadContract, useSimulateContract, useWriteContract, useAccount } from 'wagmi';
import { erc20Abi, parseUnits } from 'viem';
import { USDC_MAINNET, EXAMPLE_CONTRACT } from './addresses';

function ApproveThenAct({ amount }: { amount: bigint }) {
  const { address: owner } = useAccount();
  const { data: allowance } = useReadContract({
    address: USDC_MAINNET,
    abi: erc20Abi,
    functionName: 'allowance',
    args: owner ? [owner, EXAMPLE_CONTRACT] : undefined,
    query: { enabled: !!owner },
  });

  const needsApproval = allowance === undefined || allowance < amount;

  const { data: sim } = useSimulateContract({
    address: USDC_MAINNET,
    abi: erc20Abi,
    functionName: 'approve',
    args: [EXAMPLE_CONTRACT, amount], // exact amount, NOT 2**256-1
    query: { enabled: needsApproval },
  });
  const { writeContract, isPending } = useWriteContract();

  if (!needsApproval) return <p>Allowance OK — proceed.</p>;
  return (
    <button onClick={() => sim && writeContract(sim.request)} disabled={!sim || isPending}>
      {isPending ? 'Approving...' : `Approve ${amount} (exact)`}
    </button>
  );
}
```

**Verifying contract addresses**
- Pin known addresses in a typed, per-chain constants file (the `addresses.ts` shown at the top of this skill); don't accept a token/contract address from a URL or untrusted API without an allowlist check.
- For tokens, cross-check against a reputable token list (e.g. Uniswap's) before trusting metadata. Phishers deploy fake tokens with familiar symbols.

**Blind signing**
- Warn (or block) when a wallet would sign opaque data the user can't read — raw `personal_sign` of a hash, or `eth_sign` (legacy, dangerous; many wallets disable it). Prefer **EIP-712 typed data** so the wallet can render fields.
- For login, use **Sign-In with Ethereum (EIP-4361 / SIWE)** with a domain-bound, nonce'd message instead of signing an arbitrary string.

**Other production hardening**
- RPC URLs in `transports` are public — use a provider key restricted by domain/origin, and a server-side proxy for anything sensitive. Rotate keys; never commit them.
- Re-validate `chainId` and balances **after** the user switches networks mid-flow.
- Reads from the chain are public data, but never trust client-supplied amounts/addresses on a backend; re-verify server-side before crediting anything.

> This skill covers integration mechanics, not financial, legal, or tax advice. Handling user funds may trigger regulatory (KYC/AML), licensing, and tax obligations that vary by jurisdiction — consult a qualified professional before going to production.
