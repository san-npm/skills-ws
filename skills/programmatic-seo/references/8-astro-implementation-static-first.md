## 8. Astro Implementation (Static-First)

Astro is excellent for pSEO — static by default, fast builds, great for content sites.

```astro
---
// src/pages/[service]/[location].astro
import Layout from '@/layouts/Base.astro';
import { getLocationData, getServiceData, getAllCombos } from '@/lib/data';
import LocalStats from '@/components/LocalStats.astro';
import ProviderGrid from '@/components/ProviderGrid.astro';
import FAQSection from '@/components/FAQSection.astro';

export async function getStaticPaths() {
  const combos = await getAllCombos();
  return combos
    .filter(c => qualityGate(c, 'location').pass)
    .map(c => ({
      params: { service: c.serviceSlug, location: c.locationSlug },
      props: { serviceId: c.serviceId, locationId: c.locationId },
    }));
}

const { serviceId, locationId } = Astro.props;
const location = await getLocationData(locationId);
const service = await getServiceData(serviceId);
const providers = await getProviders(serviceId, locationId);
const stats = await getLocalStats(serviceId, locationId);
---

<Layout
  title={`${service.name} in ${location.city}, ${location.state}`}
  description={`Find ${service.name.toLowerCase()} in ${location.city}. ${location.providerCount}+ pros, ${location.reviewCount} reviews.`}
  canonical={`/${service.slug}/${location.slug}`}
>
  <h1>{service.name} in {location.city}, {location.state}</h1>
  <LocalStats stats={stats} city={location.city} />
  <ProviderGrid providers={providers} />
  <FAQSection service={service} location={location} stats={stats} />
</Layout>
```

---
