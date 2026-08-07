## Contents

- 2. Ecommerce & gtag/dataLayer payloads
- 2.1 Recommended event sequence
- 2.2 purchase via gtag.js (client-side)
- 2.3 Same event via GTM dataLayer
- 2.4 Setting user properties

## 2. Ecommerce & gtag/dataLayer payloads

GA4 ecommerce uses **reserved event names** with a required `items[]` array and a top-level `currency` + `value`. Omitting `currency` makes `value` unusable in revenue reports.

### 2.1 Recommended event sequence

`view_item_list → select_item → view_item → add_to_cart → begin_checkout → add_payment_info → purchase` (and `refund` for returns).

### 2.2 `purchase` via gtag.js (client-side)

```html
<script>
gtag('event', 'purchase', {
  transaction_id: 'T_12345',        // REQUIRED, must be unique — dedupes refunds & re-fires
  value: 59.97,                     // sum of item revenue actually charged
  currency: 'USD',                  // REQUIRED ISO-4217; without it value is dropped
  coupon: 'SPRING2026',
  shipping: 4.99,
  tax: 5.00,
  items: [
    { item_id: 'SKU_1', item_name: 'Pro Plan (annual)', item_category: 'subscription',
      price: 49.99, quantity: 1, item_brand: 'Acme', discount: 10.00 },
    { item_id: 'SKU_2', item_name: 'Add-on seat', price: 9.99, quantity: 1 }
  ]
});
</script>
```

### 2.3 Same event via GTM dataLayer

With a GTM "GA4 Event" tag whose **Event Name = `{{Event}}`** and ecommerce data read from the dataLayer (toggle *"Send Ecommerce data" → Data source: Data Layer*):

```html
<script>
window.dataLayer = window.dataLayer || [];
dataLayer.push({ ecommerce: null });   // clear the previous ecommerce object first (prevents bleed-through)
dataLayer.push({
  event: 'purchase',
  ecommerce: {
    transaction_id: 'T_12345',
    value: 59.97,
    currency: 'USD',
    items: [
      { item_id: 'SKU_1', item_name: 'Pro Plan (annual)', price: 49.99, quantity: 1 }
    ]
  }
});
</script>
```

The `dataLayer.push({ ecommerce: null })` line is mandatory between ecommerce events — without it, items from a prior event leak into the next.

### 2.4 Setting user properties

```js
gtag('set', 'user_properties', {
  user_type: 'paid',
  plan_tier: 'pro'
});
gtag('config', 'G-XXXXXXXXXX', { user_id: 'u_8f3a2c' });  // non-PII stable id
```

---
