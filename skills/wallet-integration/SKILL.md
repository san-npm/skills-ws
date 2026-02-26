---
name: wallet-integration
description: "Web3 wallet integration — RainbowKit, ConnectKit, WalletConnect, wagmi/viem, transaction signing, and chain switching."
---

# Web3 Wallet Integration

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

### Setup
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
  ssr: true, // for Next.js
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

const config = createConfig(
  getDefaultConfig({
    chains: [mainnet, polygon],
    walletConnectProjectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID!,
    appName: 'My dApp',
  })
);

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

---

## 4. Contract Read/Write Hooks

### Read Contract Data
```tsx
import { useReadContract } from 'wagmi';
import { erc20Abi } from 'viem';

function TokenBalance({ token, account }: { token: `0x${string}`; account: `0x${string}` }) {
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

  const formatted = balance && decimals
    ? (Number(balance) / 10 ** decimals).toFixed(4)
    : '0';

  return <span>{formatted} {symbol}</span>;
}
```

### Write Contract (Send Transaction)
```tsx
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, parseUnits } from 'viem';

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
  const { data: hash, writeContract, isPending, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function handleTransfer() {
    writeContract({
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      abi: erc20Abi,
      functionName: 'transfer',
      args: ['0xRecipient...', parseUnits('100', 6)], // 100 USDC
    });
  }

  return (
    <div>
      <button onClick={handleTransfer} disabled={isPending}>
        {isPending ? 'Confirming...' : 'Send 100 USDC'}
      </button>
      {isConfirming && <p>Waiting for confirmation...</p>}
      {isSuccess && <p>Transfer confirmed! TX: {hash}</p>}
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

### Send Native ETH
```tsx
import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';

function SendEth() {
  const { data: hash, sendTransaction, isPending } = useSendTransaction();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  return (
    <button onClick={() => sendTransaction({
      to: '0xRecipient...',
      value: parseEther('0.1'),
    })}>
      {isPending ? 'Sending...' : 'Send 0.1 ETH'}
    </button>
  );
}
```

---

## 5. EIP-712 Typed Message Signing

```tsx
import { useSignTypedData } from 'wagmi';

function SignPermit() {
  const { signTypedData, data: signature } = useSignTypedData();

  function handleSign() {
    signTypedData({
      domain: {
        name: 'My dApp',
        version: '1',
        chainId: 1,
        verifyingContract: '0xContractAddress...',
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
        owner: '0xOwner...',
        spender: '0xSpender...',
        value: 1000000n,
        nonce: 0n,
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
import { createPublicClient, createWalletClient, http, custom } from 'viem';
import { mainnet } from 'viem/chains';

// Read-only client
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http('https://eth-mainnet.g.alchemy.com/v2/KEY'),
});

// Read data
const balance = await publicClient.getBalance({ address: '0x...' });
const blockNumber = await publicClient.getBlockNumber();
const txReceipt = await publicClient.getTransactionReceipt({ hash: '0x...' });

// Read contract
const totalSupply = await publicClient.readContract({
  address: '0xTokenAddress',
  abi: erc20Abi,
  functionName: 'totalSupply',
});

// Wallet client (browser)
const walletClient = createWalletClient({
  chain: mainnet,
  transport: custom(window.ethereum!),
});

const [account] = await walletClient.getAddresses();
const hash = await walletClient.writeContract({
  address: '0xTokenAddress',
  abi: erc20Abi,
  functionName: 'transfer',
  args: ['0xRecipient', 1000000n],
  account,
});
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

// Full type safety in hooks:
const { data } = useReadContract({
  address: '0x...',
  abi: vaultAbi,
  functionName: 'balanceOf', // autocomplete works
  args: ['0x...'],           // typed as [address]
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

```typescript
// WalletConnect handles mobile automatically via QR code / deep link
// For direct deep links:
const metamaskDeepLink = `https://metamask.app.link/dapp/${window.location.host}`;
const trustWalletDeepLink = `https://link.trustwallet.com/open_url?url=${encodeURIComponent(window.location.href)}`;
const coinbaseDeepLink = `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(window.location.href)}`;

// Detect mobile
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
if (isMobile && !window.ethereum) {
  window.location.href = metamaskDeepLink; // Redirect to wallet app
}
```

---

## 12. WalletConnect v2 Project ID

1. Go to https://cloud.walletconnect.com
2. Create a new project
3. Copy the Project ID
4. Set as `NEXT_PUBLIC_WC_PROJECT_ID` in `.env.local`

Required for: WalletConnect modal, RainbowKit, ConnectKit, and any mobile wallet connection.

Free tier: 100k monthly relay messages (sufficient for most dApps).
