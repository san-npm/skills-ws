---
name: wallet-integration
description: "Web3 wallet integration for React/Next.js dApps — RainbowKit, ConnectKit, WalletConnect, wagmi v2/viem, contract reads/writes, EIP-712 signing, chain switching, and SSR-safe hydration. Use when connecting wallets, sending transactions, signing messages, or fixing wallet hydration/precision/security issues."
---
# Web3 Wallet Integration

> Stack: **wagmi v2 + viem v2 + @tanstack/react-query v5**. ethers-era patterns are out. RainbowKit and ConnectKit are wallet-UI layers on top of wagmi. Note: wagmi v3 is the latest major (it renames `useAccount` to `useConnection` and hook action functions to `mutate`/`mutateAsync`, and makes connector SDKs optional peer deps), but RainbowKit and ConnectKit still peer-require wagmi 2.x, so this skill targets wagmi v2: install `wagmi@2`, not latest. For kit-free builds you can adopt wagmi v3 via https://wagmi.sh/react/guides/migrate-from-v2-to-v3 (the hooks below need the v3 renames applied).

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

## Safety gate

Before executing commands or changing external systems, confirm scope, credentials, target environment, rollback, and required approval. Pin and verify third-party artifacts; never expose secrets to client code or logs.

## Reference guide

Read only the references needed for the current request:

- **1. wagmi v2 + viem Setup**: [references/1-wagmi-v2-viem-setup.md](references/1-wagmi-v2-viem-setup.md)
- **2. RainbowKit Quick Start**: [references/2-rainbowkit-quick-start.md](references/2-rainbowkit-quick-start.md)
- **3. ConnectKit Alternative**: [references/3-connectkit-alternative.md](references/3-connectkit-alternative.md)
- **4. Contract Read/Write Hooks**: [references/4-contract-read-write-hooks.md](references/4-contract-read-write-hooks.md)
- **5. EIP-712 Typed Message Signing**: [references/5-eip-712-typed-message-signing.md](references/5-eip-712-typed-message-signing.md)
- **6. Chain Switching**: [references/6-chain-switching.md](references/6-chain-switching.md)
- **7. ENS Resolution**: [references/7-ens-resolution.md](references/7-ens-resolution.md)
- **8. viem Client (Non-React)**: [references/8-viem-client-non-react.md](references/8-viem-client-non-react.md)
- **9. TypeScript Contract Types**: [references/9-typescript-contract-types.md](references/9-typescript-contract-types.md)
- **10. Error Handling Patterns**: [references/10-error-handling-patterns.md](references/10-error-handling-patterns.md)
- **11. Mobile Wallet Deep Links**: [references/11-mobile-wallet-deep-links.md](references/11-mobile-wallet-deep-links.md)
- **12. WalletConnect / Reown Project ID**: [references/12-walletconnect-reown-project-id.md](references/12-walletconnect-reown-project-id.md)
- **13. Security Guardrails (money-moving — read before shipping)**: [references/13-security-guardrails-money-moving-read-before-shipping.md](references/13-security-guardrails-money-moving-read-before-shipping.md)
