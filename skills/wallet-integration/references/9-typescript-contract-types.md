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
