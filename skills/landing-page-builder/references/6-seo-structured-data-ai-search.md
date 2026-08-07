## 6. SEO / structured data / AI-search

- **FAQPage JSON-LD — read this before adding it.** As of **May 7, 2026, Google no longer shows FAQ rich results in Search** for any site (the appearance, the rich-results report, and Rich Results Test support were retired in mid-2026; from Aug 2023 it had already been limited to authoritative government/health sites). So **do not promise the user FAQ rich snippets.** FAQPage is still a valid schema.org type, causes no harm, and **still gets cited disproportionately by AI answer engines** (ChatGPT, Perplexity, Google AI Overviews). Keep it for AI-search/AEO value, not for Google rich results. *Verify current status at https://developers.google.com/search/docs/appearance/structured-data/faqpage.* Mark up only Q&As that genuinely appear visibly on the page:

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Do I need a credit card to start?",
      "acceptedAnswer": { "@type": "Answer", "text": "No. The free plan needs no card; add one only when you upgrade." }
    },
    {
      "@type": "Question",
      "name": "Can I cancel anytime?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yes — cancel from your dashboard with one click; you keep access through the end of the billing period." }
    }
  ]
}
</script>
```
Rules: questions/answers in JSON-LD must match the visible page text; don't stuff promotional copy or links into answers; one `FAQPage` per page. Add `Organization` + `Product`/`SoftwareApplication` schema where it fits.

- **On-page SEO basics:** one keyword-aligned `<h1>`; descriptive `<title>` (50–60 chars) and `meta description` (150–160); `canonical`; semantic headings; descriptive `alt` text; fast LCP (rank factor). Deeper SEO/AI-search optimization → `seo-geo`.

---
