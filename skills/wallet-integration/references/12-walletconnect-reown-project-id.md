## 12. WalletConnect / Reown Project ID

WalletConnect rebranded its developer platform to **Reown**; the dashboard now lives at https://dashboard.reown.com (the old `cloud.walletconnect.com` redirects there). Steps:

1. Sign in at https://dashboard.reown.com and create a new project.
2. Copy the **Project ID**.
3. Add it to `.env.local` as `NEXT_PUBLIC_WC_PROJECT_ID=...` (the `NEXT_PUBLIC_` prefix exposes it to the browser, which is required and safe for this ID).
4. In the dashboard, set the project's **allowed domains / origins** to your production + localhost URLs, or connections will be rejected.

Required for: the WalletConnect modal, RainbowKit, ConnectKit, and any mobile wallet connection.

> **Quotas/pricing change** — there is a free tier suitable for development and small dApps, with paid plans above it. Do not hardcode a specific message/MAU cap; confirm current limits and pricing at https://dashboard.reown.com and https://reown.com/pricing (as of Jun 2026).

---
