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
