## Contents

- Announcement Banners
- Types
- Announcement Banner Best Practices
- Banner CSS Pattern

## Announcement Banners

### Types

```
TOP BAR (sticky, above navigation):
├── New feature launch
├── Upcoming event / webinar
├── Sale / promotion with deadline
├── Important update / status
└── Shipping threshold ("Free shipping over $50")

BOTTOM BAR (sticky, above footer):
├── Cookie consent
├── App download prompt
├── Chat / support availability
└── Persistent offer

INLINE BANNER (within page content):
├── Contextual upsell
├── Related product suggestion
└── Feature callout
```

### Announcement Banner Best Practices

- **Height:** 40-60px max (don't eat viewport)
- **Dismissible:** Always include a close button
- **Contrast:** High contrast with the site — it should stand out
- **One message:** Don't cram multiple messages into one banner
- **Urgency:** Include deadline if applicable ("Ends Friday" > "Limited time")
- **Link:** Always make the banner clickable or include a CTA link
- **Mobile:** Ensure text doesn't wrap to 3+ lines — shorten copy

### Banner CSS Pattern

```css
.announcement-banner {
  position: sticky;
  top: 0;
  z-index: 1000;
  background: #1a1a2e; /* Dark, high contrast */
  color: white;
  text-align: center;
  padding: 10px 40px 10px 16px; /* Right padding for close button */
  font-size: 14px;
  line-height: 1.4;
}

.announcement-banner a {
  color: #ffd700;
  text-decoration: underline;
  font-weight: 600;
}

.announcement-banner .close {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 8px;
  min-width: 44px;
  min-height: 44px;
}
```

---
