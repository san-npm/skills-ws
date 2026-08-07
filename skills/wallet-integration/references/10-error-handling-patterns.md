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
