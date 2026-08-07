## 14. Environment Variables Reference

```bash
# .env.example

# Server
PORT=3100
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com

# Auth
API_KEYS=key1:user1,key2:user2
ADMIN_KEY=your-admin-secret

# x402 Payments (v2 — see §7; these names match the §7 helpers, NOT the legacy X402_TOKEN/X402_CHAIN)
X402_RECIPIENT_ADDRESS=0xYourWalletAddress
X402_NETWORK=base                 # or "base-sepolia" (testnet), "celo", etc.
X402_ASSET=0xYourTokenContractAddress       # token contract addr (e.g. USDC on Base, 6 decimals)
X402_PRICE_ATOMIC=5000            # atomic units: USDC has 6 decimals → 5000 = $0.005
X402_FACILITATOR_URL=https://x402.org/facilitator   # facilitator BASE url (verify+settle live under it), NOT a bare /verify
# Coinbase hosted facilitator (mainnet verify+settle) also needs CDP credentials:
# CDP_API_KEY_ID=...   CDP_API_KEY_SECRET=...

# Stripe (omit a pinned apiVersion to track the SDK; see §7 for the current-version policy)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CHECKOUT_LINK=https://buy.stripe.com/...

# Upstream API Keys
SCREENSHOT_API_KEY=...
OCR_API_KEY=...
```

---
