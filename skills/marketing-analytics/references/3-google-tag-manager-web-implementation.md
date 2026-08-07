## Contents

- 3. Google Tag Manager (web) implementation
- 3.1 Minimal, production-grade dataLayer contract
- 3.2 Tag/trigger/variable wiring
- 3.3 Always test in Preview/Debug before publishing

## 3. Google Tag Manager (web) implementation

Use GTM as the single deployment surface so marketers can add tags without code deploys, and so Consent Mode (§4) is enforced centrally.

### 3.1 Minimal, production-grade dataLayer contract

Agree this schema with engineering; it is the contract GTM reads.

```js
// Fired on every route change in an SPA (and on initial load):
dataLayer.push({
  event: 'page_view',
  page: { path: location.pathname, title: document.title, type: 'pricing' }
});

// Fired when a known user is present (after login / on hydrate):
dataLayer.push({
  event: 'user_data_ready',
  user: { id: 'u_8f3a2c', type: 'paid', plan: 'pro' }   // id is non-PII
});

// Generic marketing interaction:
dataLayer.push({
  event: 'cta_click',
  cta: { id: 'start_trial', location: 'pricing_header', variant: 'b' }
});
```

### 3.2 Tag/trigger/variable wiring

- **One GA4 Configuration tag** (the "Google Tag", `G-XXXXXXXXXX`) firing on Consent Initialization → All Pages, with **"Send a page view"** left ON for the initial load.
- **GA4 Event tags** for each custom event, triggered on the matching `event` name, reading Data Layer Variables (`cta.id`, `user.type`, …) into event parameters and user properties.
- For SPA page views, **turn OFF** the config tag's automatic page_view and fire your own `page_view` event tag on the `page_view` dataLayer push, so route changes are captured.
- Use **Data Layer Variables** (not DOM scraping / auto-event variables) for anything load-bearing — DOM selectors break on the next redesign.

### 3.3 Always test in Preview/Debug before publishing

Open **GTM → Preview**, walk the funnel, and confirm each tag fires once (not twice), with the expected parameters, and that consent state is correct. Then **Submit/Publish** with a version note.

---
