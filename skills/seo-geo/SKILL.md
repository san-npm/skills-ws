---
name: seo-geo
description: Technical SEO audit checklist, on-page optimization, schema markup, Core Web Vitals, AI search optimization, keyword research, and competitor analysis
version: 2.0.0
---

# SEO-GEO v2.0: Technical SEO & AI Search Optimization

Complete framework for technical SEO audits, on-page optimization, schema markup, Core Web Vitals, and AI search visibility optimization.

## Table of Contents

1. [Technical SEO Audit Checklist](#technical-seo-audit-checklist)
2. [On-Page Optimization Framework](#on-page-optimization-framework)
3. [Schema Markup Implementation](#schema-markup-implementation)
4. [Core Web Vitals Optimization](#core-web-vitals-optimization)
5. [AI Search Optimization](#ai-search-optimization)
6. [Keyword Research Workflow](#keyword-research-workflow)
7. [Competitor Gap Analysis](#competitor-gap-analysis)

---

## Technical SEO Audit Checklist

### Site Structure & Architecture

**✅ URL Structure**
```
✓ Clean, descriptive URLs: /category/subcategory/page-name
✓ No more than 3-4 directory levels deep
✓ Consistent URL patterns across site sections
✓ No dynamic parameters when avoidable (?id=123)
✓ Proper use of hyphens for word separation
✓ Lowercase URLs only
✓ No trailing slashes inconsistency
```

**✅ Internal Linking**
```
✓ Proper link hierarchy with clear navigation paths
✓ Breadcrumb navigation on all pages
✓ Related content suggestions within articles
✓ Footer links to important pages
✓ No broken internal links (404s)
✓ Link depth analysis - important pages ≤3 clicks from homepage
✓ Anchor text variation and relevance
```

**✅ Site Speed & Performance**
```bash
# Core Web Vitals thresholds:
✓ Largest Contentful Paint (LCP): < 2.5s
✓ First Input Delay (FID): < 100ms  
✓ Cumulative Layout Shift (CLS): < 0.1
✓ First Contentful Paint (FCP): < 1.8s
✓ Time to Interactive (TTI): < 3.8s
```

**Performance Audit Tools:**
```javascript
// PageSpeed Insights API
const auditUrl = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
const params = new URLSearchParams({
  url: 'https://example.com',
  key: 'YOUR_API_KEY',
  category: 'performance',
  strategy: 'mobile'
});

fetch(`${auditUrl}?${params}`)
  .then(response => response.json())
  .then(data => {
    const metrics = data.lighthouseResult.audits;
    console.log('LCP:', metrics['largest-contentful-paint'].displayValue);
    console.log('FID:', metrics['max-potential-fid'].displayValue);
    console.log('CLS:', metrics['cumulative-layout-shift'].displayValue);
  });
```

### Technical Implementation

**✅ Crawling & Indexing**
```xml
<!-- robots.txt -->
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /private/
Disallow: /search?
Disallow: /*.json$
Disallow: /*?*utm_*

Sitemap: https://example.com/sitemap.xml
Sitemap: https://example.com/news-sitemap.xml
```

```xml
<!-- XML Sitemap structure -->
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
  <url>
    <loc>https://example.com/</loc>
    <lastmod>2024-03-01</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://example.com/important-page/</loc>
    <lastmod>2024-03-01</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>
```

**✅ Meta Tags & Headers**
```html
<!-- Essential meta tags -->
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Primary Keyword | Brand Name</title>
<meta name="description" content="Compelling 150-160 char description with target keyword">
<meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large">
<link rel="canonical" href="https://example.com/current-page/">

<!-- Open Graph -->
<meta property="og:title" content="Social-optimized title">
<meta property="og:description" content="Social description">
<meta property="og:image" content="https://example.com/og-image.jpg">
<meta property="og:url" content="https://example.com/current-page/">
<meta property="og:type" content="article">

<!-- Twitter Cards -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Twitter-optimized title">
<meta name="twitter:description" content="Twitter description">
<meta name="twitter:image" content="https://example.com/twitter-image.jpg">
```

---

## On-Page Optimization Framework

### Content Optimization Hierarchy

**H1-H6 Structure Best Practices:**
```html
<h1>Primary Target Keyword | Page Topic</h1>
  <h2>Secondary Keyword | Main Section</h2>
    <h3>Supporting Keyword | Subsection</h3>
      <h4>Long-tail Keyword | Detail</h4>
    <h3>Related Topic | Subsection</h3>
  <h2>Secondary Keyword 2 | Main Section</h2>
    <h3>Supporting Content</h3>
```

### Keyword Optimization Framework

**Primary Keyword Placement:**
```
✓ H1 tag (exact match)
✓ First 100 words of content
✓ Meta title (beginning preferred)
✓ Meta description (natural integration)
✓ URL slug (/primary-keyword/)
✓ Alt text for hero image
✓ First and last paragraph
```

**Semantic Keyword Integration:**
```html
<!-- Example: Target = "content marketing strategy" -->
<h1>Content Marketing Strategy: Complete Guide for 2024</h1>
<p>A comprehensive <strong>content marketing strategy</strong> helps businesses create, 
distribute, and measure content effectiveness. This guide covers content planning, 
editorial calendars, and performance optimization techniques.</p>

<!-- Related terms: content planning, editorial calendar, content distribution -->
<h2>Content Planning and Editorial Calendar Development</h2>
<p>Effective content planning begins with understanding your audience's content 
consumption patterns and preferred content distribution channels.</p>
```

### Content Depth & Quality Signals

**Content Scoring Matrix:**
```
Word Count Targets:
- Commercial pages: 800-1,500 words
- Informational articles: 1,500-3,000 words  
- Ultimate guides: 3,000+ words
- Product descriptions: 150-300 words

Quality Factors:
✓ Answer search intent completely
✓ Include relevant examples and case studies
✓ Add original data, quotes, or insights
✓ Update content regularly (freshness signals)
✓ Include multimedia (images, videos, infographics)
✓ Provide actionable takeaways
```

---

## Schema Markup Implementation

### Essential Schema Types

**Organization Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Company Name",
  "url": "https://example.com",
  "logo": "https://example.com/logo.png",
  "description": "Brief company description",
  "foundingDate": "2020-01-01",
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-555-123-4567",
    "contactType": "customer service",
    "availableLanguage": ["English"]
  },
  "sameAs": [
    "https://facebook.com/company",
    "https://twitter.com/company",
    "https://linkedin.com/company/company"
  ],
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main Street",
    "addressLocality": "City",
    "addressRegion": "State",
    "postalCode": "12345",
    "addressCountry": "US"
  }
}
```

**Article Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Article Title Here",
  "description": "Article description",
  "image": "https://example.com/article-image.jpg",
  "author": {
    "@type": "Person",
    "name": "Author Name",
    "url": "https://example.com/author/name"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Company Name",
    "logo": {
      "@type": "ImageObject",
      "url": "https://example.com/logo.png"
    }
  },
  "datePublished": "2024-03-01T10:00:00Z",
  "dateModified": "2024-03-01T10:00:00Z",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://example.com/article-url/"
  }
}
```

**Product Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Product Name",
  "description": "Product description",
  "image": "https://example.com/product-image.jpg",
  "brand": {
    "@type": "Brand",
    "name": "Brand Name"
  },
  "offers": {
    "@type": "Offer",
    "price": "99.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock",
    "url": "https://example.com/product-page",
    "seller": {
      "@type": "Organization",
      "name": "Company Name"
    }
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "127"
  }
}
```

**FAQ Schema:**
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is content marketing?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Content marketing is a strategic marketing approach focused on creating and distributing valuable, relevant, and consistent content to attract and retain a clearly defined audience."
      }
    },
    {
      "@type": "Question", 
      "name": "How do you measure content marketing ROI?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Content marketing ROI is measured through metrics like organic traffic growth, lead generation, conversion rates, brand awareness, and customer lifetime value attribution."
      }
    }
  ]
}
```

---

## Core Web Vitals Optimization

### Performance Optimization Checklist

**Image Optimization:**
```html
<!-- Modern image formats -->
<picture>
  <source srcset="image.webp" type="image/webp">
  <source srcset="image.avif" type="image/avif">
  <img src="image.jpg" alt="Descriptive alt text" loading="lazy">
</picture>

<!-- Responsive images -->
<img src="image-800.jpg"
     srcset="image-400.jpg 400w, image-800.jpg 800w, image-1200.jpg 1200w"
     sizes="(max-width: 400px) 400px, (max-width: 800px) 800px, 1200px"
     alt="Descriptive alt text"
     loading="lazy">
```

**Resource Optimization:**
```html
<!-- Critical resource hints -->
<link rel="preload" href="/fonts/main.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/css/critical.css" as="style">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="dns-prefetch" href="https://analytics.google.com">

<!-- Non-critical CSS -->
<link rel="preload" href="/css/non-critical.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
```

**JavaScript Optimization:**
```javascript
// Lazy loading implementation
const lazyImages = document.querySelectorAll('img[loading="lazy"]');
const imageObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const img = entry.target;
      img.src = img.dataset.src;
      img.classList.remove('lazy');
      imageObserver.unobserve(img);
    }
  });
});

lazyImages.forEach(img => imageObserver.observe(img));
```

---

## AI Search Optimization

### ChatGPT/Perplexity/Gemini Visibility

**llms.txt Implementation:**
```
# /llms.txt
# AI Training Data Guidelines

# About this site
This is [Company Name], a [industry] company providing [services/products].
Founded in [year], we specialize in [main expertise areas].

# Key content areas
- [Primary topic area]: Comprehensive guides and tutorials
- [Secondary topic area]: Best practices and case studies  
- [Tertiary topic area]: Industry analysis and trends

# Authoritative content
Our most authoritative and up-to-date content includes:
- Ultimate guides: /guides/
- Case studies: /case-studies/  
- Data reports: /reports/
- Tool reviews: /reviews/

# Content freshness
- News and updates: Updated daily
- Guides and tutorials: Reviewed quarterly
- Data reports: Updated annually

# Contact
For AI training inquiries: ai@company.com
Press contact: press@company.com
```

**AI-Optimized Content Structure:**
```markdown
# Primary Topic: Complete Guide

## Quick Answer (for AI snippet)
[Direct, concise answer to main query in 2-3 sentences]

## Detailed Explanation
[Comprehensive coverage with examples]

## Key Takeaways
- Point 1: [Actionable insight]
- Point 2: [Specific recommendation]  
- Point 3: [Measurable outcome]

## Common Questions
### What is [topic]?
[Clear, specific answer]

### How do you [action]?
[Step-by-step process]

### When should you [decision]?
[Decision framework with criteria]
```

---

## Keyword Research Workflow

### Research Process Framework

**1. Seed Keyword Generation**
```
Primary Sources:
✓ Google Search Console (existing rankings)
✓ Customer support tickets (pain points)
✓ Sales team feedback (common questions)  
✓ Social media comments and messages
✓ Industry forums and communities
✓ Competitor analysis (tools: Ahrefs, SEMrush)
```

**2. Keyword Expansion Techniques**
```bash
# Google Keyword Planner API example
curl -X POST \
  https://googleads.googleapis.com/v8/customers/{customer_id}/keywordPlanAdGroups:generateKeywordIdeas \
  -H "Authorization: Bearer {access_token}" \
  -d '{
    "customerId": "123456789",
    "keywordSeed": {
      "keywords": ["content marketing", "content strategy"]
    },
    "keywordPlanNetwork": "GOOGLE_SEARCH",
    "geoTargetConstants": ["geoTargetConstants/2840"],
    "language": "languageConstants/1000"
  }'
```

**3. Keyword Classification Matrix**
```
Intent Categories:
- Informational: "what is", "how to", "guide", "tutorial"
- Commercial: "best", "review", "comparison", "vs"  
- Transactional: "buy", "price", "cost", "discount"
- Navigational: brand names, product names, login

Difficulty Scoring:
- Low (0-30): Target for quick wins
- Medium (31-60): Long-term content strategy
- High (61-100): Avoid unless brand-relevant

Volume Priorities:
- High volume (>10K): Pillar content
- Medium volume (1K-10K): Cluster content
- Low volume (<1K): Long-tail capture
```

---

## Competitor Gap Analysis

### Analysis Framework

**1. Competitor Identification**
```
Direct Competitors:
✓ Same products/services
✓ Same target audience
✓ Same geographic market

Indirect Competitors:
✓ Alternative solutions
✓ Adjacent industries
✓ Different approaches to same problem

Content Competitors:
✓ Ranking for your target keywords
✓ Similar content topics
✓ Overlapping audience interests
```

**2. Content Gap Analysis Process**

**SEMrush/Ahrefs Gap Analysis:**
```bash
# Export competitor keyword data
# Analyze keyword intersections
# Identify content opportunities

Competitor Analysis Checklist:
✓ Top-performing content pieces
✓ Content formats and lengths  
✓ Publishing frequency
✓ Social sharing patterns
✓ Backlink acquisition strategies
✓ Technical SEO implementation
✓ SERP feature optimization
```

**3. Opportunity Prioritization Matrix**

```
Priority Score = (Search Volume × Intent Match × Ranking Difficulty⁻¹) × Competition Gap

High Priority Opportunities:
- Keywords competitors rank for but you don't
- Topics with high engagement but low competition
- SERP features not being targeted
- Content formats not being used

Medium Priority:
- Improvement opportunities on existing content
- Related keywords in same topic clusters  
- Seasonal/trending topic opportunities

Low Priority:
- Highly competitive broad terms
- Low commercial intent keywords
- Saturated SERP features
```

### Implementation Checklist

#### Monthly SEO Tasks
```
Week 1:
✓ Technical SEO audit (site speed, crawling, indexing)
✓ Core Web Vitals monitoring and optimization
✓ Schema markup validation and updates

Week 2:  
✓ Keyword ranking analysis and reporting
✓ Content performance review and optimization
✓ Competitor analysis and gap identification

Week 3:
✓ New content planning based on keyword research
✓ On-page optimization of existing content
✓ Internal linking improvement and expansion

Week 4:
✓ Backlink analysis and outreach planning
✓ Local SEO optimization (if applicable)
✓ AI search optimization and llms.txt updates
```

#### Quarterly Strategic Reviews
```
✓ Complete technical SEO audit
✓ Comprehensive keyword research refresh
✓ Competitor landscape analysis
✓ Content strategy alignment with SEO goals
✓ ROI analysis and budget allocation review
```

This comprehensive SEO-GEO framework provides the foundation for sustainable organic search growth through technical excellence, content optimization, and strategic competitive intelligence.