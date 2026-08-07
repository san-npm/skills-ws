## Contents

- 12. Pre-Launch Checklist
- Data Quality
- Technical SEO
- Performance
- Content Quality
- Monitoring

## 12. Pre-Launch Checklist

### Data Quality
- [ ] Every page passes quality gate (minimum data thresholds met)
- [ ] No duplicate pages (check slugs for collisions)
- [ ] Data is current (enrichment pipeline ran within last 7 days)
- [ ] Spot-check 20 random pages manually for accuracy

### Technical SEO
- [ ] Every page has unique `<title>` and `<meta description>`
- [ ] Self-referencing canonical on every page
- [ ] Sitemap submitted and all URLs return 200
- [ ] robots.txt doesn't block template pages OR pagination (`?page=`)
- [ ] Structured data validates in Rich Results Test and matches on-page content
- [ ] Breadcrumbs with schema on every page
- [ ] Internal links: every page reachable within 3 clicks from homepage
- [ ] No orphan pages (every page has at least 1 inbound internal link)
- [ ] URL redirects for any slug changes (301, not 302)

### Performance
- [ ] LCP < 2.5s on template pages
- [ ] CLS < 0.1
- [ ] Pages work without JavaScript (SSR/SSG)
- [ ] Images have width/height attributes and lazy loading

### Content Quality
- [ ] Each page carries genuinely unique data (passes the §6 quality gates — unique facts, source coverage, low duplicate-similarity), not just padded word count
- [ ] No boilerplate-only pages (data swap ≠ unique value)
- [ ] Headings are descriptive, not generic
- [ ] Last-updated dates reflect real data freshness, not `new Date()` theater

### Monitoring
- [ ] GSC property verified and sitemap submitted
- [ ] Indexing monitoring script running weekly
- [ ] Core Web Vitals monitoring active
- [ ] 404 monitoring for broken internal links
- [ ] Alerting set up for >10% index drop

---
