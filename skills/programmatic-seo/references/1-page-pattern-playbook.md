## Contents

- 1. Page Pattern Playbook
- 1.1 Location Pages — "[Service] in [City]"
- 1.2 Comparison Pages — "[Product A] vs [Product B]"
- 1.3 Integration Pages — "[Your Product] + [Integration]"
- 1.4 "X for Y" Pages — "[Tool/Concept] for [Audience]"
- 1.5 Directory / Listing Pages

## 1. Page Pattern Playbook

### 1.1 Location Pages — "[Service] in [City]"

**When to use:** Local services, marketplaces, delivery, real estate, jobs.

**Data you need per location:**
- Population, demographics, cost of living
- Local competitors / providers
- Geo-specific stats (median home price, avg salary, weather)
- Real reviews or testimonials from that area
- Local regulations or requirements

**URL structure:**
```
/plumbers/austin-tx
/plumbers/austin-tx/drain-cleaning
```

**Quality signals to include:**
- Map embed or service area polygon
- Local phone number or office address
- Area-specific pricing ("Average drain cleaning in Austin: $150–$280")
- Nearby areas linked ("Also serving: Round Rock, Cedar Park, Georgetown")

**Next.js implementation:**

> **Next.js version note (App Router, Next 15+ → mid-2026).** Since Next 15, `params` and `searchParams` are **async** — they are `Promise`s you must `await`. The pre-15 synchronous shape (`params: { service: string }`) no longer type-checks. Examples below use the async form. On Next 14 these were synchronous; if you must support 14, drop the `Promise<>` wrapper and the `await`. A `Metadata` return type from `next` is also recommended for `generateMetadata`.

```tsx
// app/[service]/[location]/page.tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getLocationData, getServiceData } from '@/lib/data';
import { generateLocationSchema } from '@/lib/schema';

// params is async in Next 15+ — type it as a Promise and await it.
type Params = Promise<{ service: string; location: string }>;

// Pre-render only validated combos (see §6). Other slugs render on-demand
// because dynamicParams defaults to true; we noindex/404 invalid ones there.
export async function generateStaticParams() {
  const combos = await getServiceLocationCombos();
  return combos.map(({ service, location }) => ({
    service: service.slug,
    location: location.slug,
  }));
}

// On-demand rendering for slugs not in generateStaticParams, revalidated daily.
export const revalidate = 86400;

export async function generateMetadata(
  { params }: { params: Params },
): Promise<Metadata> {
  const { service: serviceSlug, location: locationSlug } = await params;
  const location = await getLocationData(locationSlug);
  const service = await getServiceData(serviceSlug);
  if (!location || !service) return {};

  return {
    title: `${service.name} in ${location.city}, ${location.state} — Top ${location.providerCount}+ Providers`,
    description: `Find trusted ${service.name.toLowerCase()} in ${location.city}. Compare ${location.providerCount} local pros, read ${location.reviewCount} reviews, and get free quotes.`,
    alternates: {
      canonical: `/${serviceSlug}/${locationSlug}`,
    },
  };
}

export default async function LocationPage({ params }: { params: Params }) {
  const { service: serviceSlug, location: locationSlug } = await params;
  const location = await getLocationData(locationSlug);
  const service = await getServiceData(serviceSlug);
  if (!location || !service) notFound();

  const providers = await getProviders(service.id, location.id);
  const stats = await getLocalStats(service.id, location.id);
  const faqs = generateLocalFAQs(service, location, stats);
  const nearbyLocations = await getNearbyLocations(location.id, service.id);

  return (
    <>
      {/* Escape < so scraped or user-supplied strings cannot break out of the script tag (XSS). */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateLocationSchema(service, location, providers, faqs)).replace(/</g, '\\u003c'),
        }}
      />

      <h1>{service.name} in {location.city}, {location.state}</h1>

      {/* Unique local context — NOT just the template */}
      <LocalStatsBar stats={stats} city={location.city} />

      {/* Provider listings with real data */}
      <ProviderGrid providers={providers} />

      {/* Area-specific pricing data */}
      <PricingTable service={service} location={location} stats={stats} />

      {/* Genuine FAQ with local answers */}
      <FAQSection faqs={faqs} />

      {/* Internal linking to nearby areas */}
      <NearbyAreas locations={nearbyLocations} service={service} />

      {/* Internal linking to related services */}
      <RelatedServices location={location} currentService={service} />
    </>
  );
}
```

### 1.2 Comparison Pages — "[Product A] vs [Product B]"

**When to use:** SaaS directories, review sites, marketplaces.

**URL structure:**
```
/compare/notion-vs-coda
/compare/slack-vs-teams-vs-discord    (three-way)
```

**Critical: avoid thin comparisons.** Every comparison page needs:
- Feature-by-feature breakdown with actual data
- Pricing comparison (current, verified)
- Use-case recommendations ("Best for X: Product A. Best for Y: Product B.")
- Unique pros/cons per product
- User sentiment data (review aggregates, NPS if available)

```tsx
// app/compare/[slug]/page.tsx
import type { Metadata } from 'next';

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const comparisons = await getPopularComparisons();
  // Only generate pages for combinations with search volume
  return comparisons
    .filter(c => c.monthlySearchVolume > 50)
    .map(c => ({ slug: c.slug }));
}

// Generate bidirectional — "A vs B" and "B vs A" both resolve and stay
// crawlable; canonical consolidates ranking to the higher-volume variant.
export async function generateMetadata(
  { params }: { params: Params },
): Promise<Metadata> {
  const { slug } = await params;
  const comparison = await getComparison(slug);
  const canonical = comparison.searchVolume.aVsB > comparison.searchVolume.bVsA
    ? `${comparison.productA.slug}-vs-${comparison.productB.slug}`
    : `${comparison.productB.slug}-vs-${comparison.productA.slug}`;

  return {
    title: `${comparison.productA.name} vs ${comparison.productB.name} (${new Date().getFullYear()}) — Features, Pricing, Verdict`,
    alternates: { canonical: `/compare/${canonical}` },
  };
}
```

### 1.3 Integration Pages — "[Your Product] + [Integration]"

**When to use:** SaaS products with integrations, API platforms, automation tools.

**URL structure:**
```
/integrations/salesforce
/integrations/salesforce/setup-guide
```

**Unique value per page:**
- What specific data syncs between products
- Step-by-step setup with screenshots
- Use-case examples ("When a deal closes in Salesforce, automatically create an invoice in [Your Product]")
- Limitations and workarounds
- Pricing impact (does this integration require a specific plan?)

### 1.4 "X for Y" Pages — "[Tool/Concept] for [Audience]"

**When to use:** Products serving multiple verticals or personas.

**URL structure:**
```
/solutions/project-management-for-agencies
/solutions/crm-for-real-estate
```

**Each page needs:**
- Industry-specific pain points (not generic)
- Tailored feature highlights (same features, different framing)
- Social proof from that vertical (logos, quotes, case studies)
- Industry-specific terminology and workflows
- Compliance or regulatory callouts relevant to that vertical

### 1.5 Directory / Listing Pages

**URL structure:**
```
/tools/email-marketing              (category)
/tools/email-marketing/mailchimp    (individual listing)
```

**Aggregation pages (category level) must include:**
- Curated top picks with brief rationale
- Filterable/sortable table or grid
- Quick comparison of top 3–5
- Last-updated date (freshness signal)

---
