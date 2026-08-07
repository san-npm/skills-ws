## Contents

- 5. Server-side tagging & Measurement Protocol
- 5.1 Two distinct things — don't conflate them
- 5.2 GA4 Measurement Protocol request

## 5. Server-side tagging & Measurement Protocol

Move collection server-side for durability (ad-blocker/ITP resilience, first-party cookies, PII redaction before it reaches Google) and to capture events the browser can't (renewals, refunds, offline conversions).

### 5.1 Two distinct things — don't conflate them

- **Server-side GTM (sGTM):** a tagging container you run on your own subdomain (e.g. `https://gtm.example.com`) in Cloud Run / App Engine. The browser sends to *your* endpoint; sGTM forwards to GA4, Ads, etc. Best for high-volume, first-party web measurement.
- **Measurement Protocol (MP):** a raw HTTP API to send events to GA4 from any backend. Best for offline/async server events (subscription renewal, post-checkout confirmation, IoT).

### 5.2 GA4 Measurement Protocol request

`POST https://www.google-analytics.com/mp/collect?measurement_id=G-XXXXXXXXXX&api_secret=YOUR_API_SECRET`

```bash
curl -s -X POST \
  "https://www.google-analytics.com/mp/collect?measurement_id=G-XXXXXXXXXX&api_secret=$GA4_MP_API_SECRET" \
  -H 'Content-Type: application/json' \
  -d '{
    "client_id": "1234567890.1680000000",
    "user_id": "u_8f3a2c",
    "timestamp_micros": 1718000000000000,
    "consent": { "ad_user_data": "GRANTED", "ad_personalization": "DENIED" },
    "user_properties": { "plan_tier": { "value": "pro" } },
    "events": [{
      "name": "subscribe",
      "params": {
        "value": 49.99,
        "currency": "USD",
        "transaction_id": "T_12345",
        "session_id": "s_001",            
        "engagement_time_msec": "1"        
      }
    }]
  }'
```

Constraints & gotchas:
- `client_id` is **required** and should match the browser's GA4 `client_id` (read it from the `_ga` cookie or GA4's `get` API) so server events join the same user/session. A fresh random `client_id` creates orphan sessions.
- Up to **25 events per request**; event/param naming follows the same rules as §1.2.
- Include `session_id` and `engagement_time_msec` if you want the event to count toward an active session; without them MP events can land outside any session.
- Pass the user's `consent` object so MP respects consent.
- Validate against the debug endpoint first: `POST https://www.google-analytics.com/debug/mp/collect` returns `validationMessages`. **The production endpoint never returns errors** — a `2xx` does not mean the event was accepted.
- Keep the **API secret in an env var/secret manager**, never in client code or the repo. Reference: https://developers.google.com/analytics/devguides/collection/protocol/ga4.

---
