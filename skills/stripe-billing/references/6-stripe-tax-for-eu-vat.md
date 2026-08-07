## 6. Stripe Tax for EU VAT

> Tax handling is jurisdiction-specific and changes often. The patterns below are wiring, not tax advice — confirm registration thresholds, rates, place-of-supply, and exemption rules with a tax professional for every country you sell in. Stripe Tax only files where you've registered and configured a registration in the Dashboard.

**Prerequisites:** enable Stripe Tax in the Dashboard and add a **registration** per jurisdiction; otherwise `automatic_tax: { enabled: true }` computes $0. Set **tax behavior** on every Price (`tax_behavior: 'exclusive'` to add tax on top, `'inclusive'` if the listed price already contains it) — `automatic_tax` cannot compute on a price whose `tax_behavior` is `unspecified`.

```typescript
// When creating customers, collect address for tax. validate_location:'deferred'
// validates lazily at the first taxable transaction (vs 'immediately', which throws on bad input).
const customer = await stripe.customers.create({
  email: user.email,
  metadata: { userId: user.id },
  tax: { validate_location: 'deferred' },
  address: {
    country: billingAddress.country,
    postal_code: billingAddress.postalCode,
    city: billingAddress.city,
    line1: billingAddress.line1,
  },
});

// Location validation can fail later (Stripe can't resolve the address to a tax jurisdiction).
// Surface it instead of silently billing untaxed: on customer.updated, inspect
// customer.tax.automatic_tax — 'unrecognized_location' / 'failed' means prompt the user to fix
// their address before the next invoice finalizes.
case 'customer.updated': {
  const c = event.data.object as Stripe.Customer;
  if (c.tax?.automatic_tax && c.tax.automatic_tax !== 'supported') {
    await flagAddressForReview(c.id, c.tax.automatic_tax); // your app concern
  }
  break;
}

// B2B reverse charge: validate the buyer's VAT number.
if (vatNumber) {
  try {
    await stripe.customers.createTaxId(customer.id, {
      type: 'eu_vat',
      value: vatNumber,  // e.g. 'DE123456789' — country prefix + digits
    });
    // Verified asynchronously — listen for customer.tax_id.updated webhook.
  } catch (err) {
    // Malformed value (wrong format) throws here; an invalid-but-well-formed number
    // fails later via the webhook. Don't grant exemption on this success path alone.
    console.error('VAT id rejected at creation:', err);
  }
}

// In webhook handler — only exempt AFTER verification succeeds:
case 'customer.tax_id.updated': {
  const taxId = event.data.object as Stripe.TaxId;
  if (taxId.verification?.status === 'verified') {
    // 'reverse' = EU reverse-charge (B2B cross-border): Stripe zero-rates VAT and notes it.
    await stripe.customers.update(taxId.customer as string, { tax_exempt: 'reverse' });
  } else if (taxId.verification?.status === 'failed') {
    await stripe.customers.update(taxId.customer as string, { tax_exempt: 'none' });
  }
  break;
}
```

**B2C vs B2B:** B2C in the EU is always taxed at the customer's rate (destination principle, no threshold for digital services). B2B with a *verified* VAT id in a different member state is reverse-charged (`tax_exempt: 'reverse'`); same-country B2B is still taxed normally. **Non-EU caveats:** US sales tax is economic-nexus based (per-state thresholds, not VAT), the UK is post-Brexit standalone (separate registration), and many countries have their own digital-goods rules — register per jurisdiction in the Dashboard before relying on automatic tax there.

---
