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
