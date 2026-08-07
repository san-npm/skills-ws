## Contents

- 4. Contract Read/Write Hooks
- Read Contract Data
- Write Contract (simulate → write → wait)
- Send Native ETH

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
