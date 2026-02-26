---
name: programmatic-seo
description: "Create SEO-driven pages at scale using templates and data. Directory pages, location pages, comparison pages."
---

# Programmatic SEO v2

## When to Use pSEO

Good candidates:
- Location + service combinations ("plumber in {city}")
- Tool/product comparisons ("{Tool A} vs {Tool B}")
- Integration pages ("{Product} + {Integration}")
- Glossary/definition pages ("{Term} definition")
- Directory/listing pages ("{Category} in {Location}")
- Alternative pages ("{Product} alternatives")

Bad candidates (will get penalized):
- Thin pages with just swapped city names
- Auto-generated content with no unique value
- Doorway pages targeting variations of one keyword

## Pipeline

### 1. Data Collection
- Identify all variable combinations (cities × services, tools × tools)
- Gather unique data per page (statistics, local info, product details)
- Validate data quality (no empty fields, accurate information)

### 2. Template Design

Each template needs:
- **Unique intro** (not just "{city} + {service}" boilerplate)
- **Data-driven content** (real statistics, comparisons, facts per entity)
- **User value** (answers a real question, not just keyword targeting)
- **Internal links** (to related pages within the programmatic set)
- **Schema markup** (appropriate type per page category)

### 3. Quality Thresholds
- Minimum 500 unique words per page (not counting boilerplate)
- At least 3 data points unique to that page
- No more than 40% shared content across pages
- Every page must answer at least one question a real user would have

### 4. Internal Linking
- Hub pages link to all children (e.g., "Plumbers" → all city pages)
- Child pages link to hub and 3-5 siblings
- Cross-link between related categories
- Breadcrumb navigation on every page

### 5. Indexing Strategy
- XML sitemap for all programmatic pages
- Noindex thin pages until they have enough content
- Monitor Search Console for "Crawled — currently not indexed"
- Submit in batches (1000-5000 pages at a time)

## Page Templates

Detailed templates by type: references/template-patterns.md
Data pipeline architecture: references/data-pipeline.md

## References

- references/template-patterns.md — Templates for each page type
- references/data-pipeline.md — Data collection and generation pipelines
