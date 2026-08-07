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
