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
