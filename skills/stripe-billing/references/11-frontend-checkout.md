## 11. Frontend Checkout

**Prerequisites for this self-hosted Payment Element flow** (vs. Stripe-hosted Checkout):
- Wrap this form in `<Elements stripe={getStripe()} options={{ clientSecret }}>` (the deferred-intent variant uses `options={{ mode, amount, currency }}`); `clientSecret` is the `confirmation_secret.client_secret` returned by §2's subscribe route.
- The parent generates a `requestId` once (`useState(() => crypto.randomUUID())`) and POSTs it with `priceId`/`paymentMethodId` so the server's idempotency key is stable across retries.
- `clientSecret` may be `null` (trial-only or $0 first invoice → nothing to confirm). Skip confirmation and treat it as success.
- This path charges in the Price's currency — it does **not** get Adaptive Pricing (§7). For localized presentment, use Stripe-hosted Checkout instead.
- SCA/3D Secure is handled by `confirmPayment` + `redirect: 'if_required'`: cards needing a challenge redirect to `return_url`; on return, read the status from the URL's `payment_intent_client_secret` and reconcile via webhook.

```tsx
'use client';
import { useState } from 'react';
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';

export function CheckoutForm({ clientSecret, onSuccess }: { clientSecret: string | null; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    // No secret ⇒ trial/$0 invoice: subscription is already active, nothing to confirm.
    if (!clientSecret) { onSuccess(); setLoading(false); return; }

    const { error: submitErr } = await elements.submit();
    if (submitErr) { setError(submitErr.message ?? 'Validation failed'); setLoading(false); return; }

    const { error: confirmErr } = await stripe.confirmPayment({
      elements, clientSecret,
      confirmParams: { return_url: `${window.location.origin}/billing/success` },
      redirect: 'if_required',
    });

    if (confirmErr) { setError(confirmErr.message ?? 'Payment failed'); setLoading(false); return; }
    onSuccess();
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={!stripe || loading}
        className="mt-4 w-full rounded-lg bg-blue-600 px-4 py-2 text-white disabled:opacity-50">
        {loading ? 'Processing...' : 'Subscribe'}
      </button>
    </form>
  );
}
```

---
