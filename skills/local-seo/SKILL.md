---
name: local-seo
description: "Local SEO across Google Business Profile, Apple Business Connect, Bing Places, citations, reviews, location pages, map-pack and AI-Overview local visibility. Use when working on multi-location SEO, single-location optimization, or local pack ranking."
---

# Local SEO

> In 2026 you optimize for **three** map-pack ecosystems, not one: Google (Maps + AI Overviews), Apple (Maps + Siri + Spotlight + Wallet), and Bing (Maps + ChatGPT Search). Skipping any of the three leaves visibility on the table — Apple ships in iOS by default, and ChatGPT Search routes through Bing's index.

## Google Business Profile (GBP)

### Setup Checklist
- [ ] Claim and verify listing
- [ ] Correct business name (no keyword stuffing)
- [ ] Primary + secondary categories (most specific first)
- [ ] Complete address (or service area for mobile businesses)
- [ ] Phone number (local, not toll-free)
- [ ] Website URL (to location-specific page if multi-location)
- [ ] Business hours (keep updated, mark holidays)
- [ ] Business description (750 chars, natural keywords)
- [ ] 10+ high-quality photos (exterior, interior, team, products)
- [ ] Enable booking if applicable (~~messaging~~ — see deprecation note below)

> **GBP chat sunset:** Google retired Business Profile chat and call-history on **July 31, 2024** (deprecation began July 15, 2024). Past records were exportable via Google Takeout until Aug 30, 2024. Move customer messaging to your website chat widget, SMS, or WhatsApp Business.

### Ongoing Optimization
- Post weekly (offers, events, updates, products)
- Respond to ALL reviews within 24 hours
- Add new photos monthly
- Update seasonal hours
- Use Google Posts for promotions
- Answer Q&A section proactively

## Apple Business Connect (ABC)

Apple's free, self-serve listing manager — launched **Jan 11, 2023** — covers business presence across **Apple Maps, Siri, Wallet, Messages, Spotlight**, and other Apple surfaces. Independent from GBP; you must claim separately.

### Setup
1. Sign in at `businessconnect.apple.com` with the Apple ID you want to associate with the business
2. Search for the business location → claim → Apple verifies (typically by phone call, postcard, or document upload)
3. Fill the place card: categories, hours, photos, logo, action button (call / website / order / book)
4. Add **Showcases** — time-bound promotions, menu items, seasonal offers — these surface on the Maps place card

### Why it matters
- Apple Maps drives the default "directions" experience on >1B iOS devices
- Siri uses ABC data to answer "is X open?" and "directions to nearest Y"
- Wallet shows logo + place card data on Apple Pay receipts
- iOS Spotlight (system-wide search) pulls from the same listing

## Bing Places for Business (Microsoft + ChatGPT Search)

Bing Places powers Bing Maps and is the underlying business-listing graph for **ChatGPT Search** (which uses Microsoft's web index via the OpenAI-Microsoft partnership). Skipping Bing Places means you're invisible in the AI search surface that ChatGPT users see when they ask local questions.

### Setup
1. Sign in at `bingplaces.com` with a Microsoft account
2. **Fastest path: import from GBP** — Bing offers one-click import of any verified Google Business Profile
3. Verify via phone, mail, or email
4. Keep NAP identical to GBP and ABC

## NAP Consistency

NAP = Name, Address, Phone. Must be IDENTICAL everywhere:
- Google Business Profile
- Website footer and contact page
- All directory listings
- Social media profiles
- Schema markup

Even small variations hurt ("St." vs "Street", "Suite" vs "Ste.").

## Local Citations

Submit to top directories: references/citation-sources.md

## Local Schema

Add LocalBusiness schema to every location page. Minimal example (extend with `Restaurant`, `Dentist`, etc. subtypes when applicable):

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://example.com/locations/austin#business",
  "name": "Example Coffee Roasters — Austin",
  "url": "https://example.com/locations/austin",
  "telephone": "+1-512-555-0100",
  "image": "https://example.com/img/austin-store.jpg",
  "priceRange": "$$",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "1234 Congress Ave",
    "addressLocality": "Austin",
    "addressRegion": "TX",
    "postalCode": "78701",
    "addressCountry": "US"
  },
  "geo": { "@type": "GeoCoordinates", "latitude": 30.2672, "longitude": -97.7431 },
  "openingHoursSpecification": [{
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": ["Monday","Tuesday","Wednesday","Thursday","Friday"],
    "opens": "07:00", "closes": "18:00"
  }],
  "sameAs": [
    "https://www.google.com/maps/place/?q=place_id:ChIJ...",
    "https://maps.apple.com/?q=Example+Coffee+Roasters+Austin",
    "https://www.bing.com/maps?ss=ypid.YN..."
  ]
}
</script>
```

The `sameAs` array linking Google, Apple, and Bing map URLs is the strongest entity-disambiguation signal for AI search engines. See also `references/local-schema.md`.

## Review Management

- Ask happy customers for reviews (email 1 week after purchase/service)
- Respond to negative reviews: acknowledge, apologize, offer resolution offline
- Never buy fake reviews (Google penalizes heavily)
- Display reviews on your website (with Review schema)
- Target: 4.0+ average, 50+ reviews for competitive niches

## Geo-Targeted Content

For each location:
- Unique location page (not boilerplate with city swapped)
- Local landmarks, events, community references
- Local testimonials from that area
- Embedded Google Map
- Location-specific schema markup

## References

- references/gbp-optimization.md — Detailed GBP guide
- references/citation-sources.md — Top directory sites
- references/local-schema.md — LocalBusiness JSON-LD
