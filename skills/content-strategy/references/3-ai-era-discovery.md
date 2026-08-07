## Contents

- 3. AI-Era Discovery
- What actually gets cited (content levers you control)
- Page pattern optimized for both SERP snippets and AI answers
- Query-class test prompts (run before and after publishing)

## 3. AI-Era Discovery

Discovery in 2026 is split across classic blue links **and** generative answer surfaces: **Google AI Overviews / AI Mode**, **Bing Copilot**, **ChatGPT Search**, **Perplexity**, **Claude**, and **Gemini**. They synthesize an answer and cite a handful of sources. Your goal shifts from "rank #1" to "**be one of the cited sources**." This section is content-strategy-specific; for the technical/schema substrate (JSON-LD types, Core Web Vitals, indexing, `llms.txt` placement) defer to the `seo-geo` sibling.

### What actually gets cited (content levers you control)

| Lever | What to do | Why it matters for AI answers |
|---|---|---|
| **Direct answers** | Put a 40-60 word, self-contained answer in the first paragraph under each H2, phrased as a complete sentence. | Answer engines extract passages; a clean, quotable passage is far likelier to be lifted and cited. |
| **Extractable structure** | Use descriptive H2/H3 phrased as questions; tables for comparisons; numbered steps for processes; an FAQ block. | Structured chunks are easier to retrieve and attribute than walls of prose. |
| **Entity clarity** | Name entities explicitly (don't rely on "it"/"this"); keep one canonical definition; use consistent naming across the cluster. | Retrieval and answer synthesis are entity-driven; ambiguous referents get dropped. |
| **Freshness & dates** | Show a visible "Last updated YYYY-MM"; date every statistic; refresh pillars quarterly. | Answer engines prefer—and often label—recent sources; undated claims are low-trust. |
| **Source transparency / E-E-A-T** | Real author + bio + credentials; cite primary sources with links; show first-hand experience (original data, screenshots, tests). | Trust signals raise both classic ranking and citation probability; experience is the part AI can't synthesize. |
| **Statistics & original data** | Publish one genuinely original, citable number or dataset per pillar (a survey, a benchmark, your own results). | Answer engines love a quotable stat with a clear source — original data is the highest-leverage citation magnet. |
| **Retrievability** | Ensure the page is crawlable, fast, and not gated; keep the key answer above the fold and in HTML (not lazy-loaded JS). | If a crawler/retriever can't fetch the passage cleanly, it can't cite you. (Mechanics → `seo-geo`.) |

### Page pattern optimized for both SERP snippets and AI answers

```html
<article>
  <h1>{Specific, current title — include the year only if the topic is time-bound}</h1>
  <p class="updated">Last updated {Mon YYYY} · Reviewed by {Author, credential}</p>

  <h2>What is {entity}?</h2>
  <p><!-- 40-60 words, complete sentence, no "as mentioned above" --></p>

  <h2>How to {do the thing}</h2>
  <ol><li>…</li></ol>

  <h2>{Option A} vs {Option B}</h2>
  <table><!-- explicit comparison rows --></table>

  <h2>Frequently asked questions</h2>
  <!-- Q as <h3>, 40-60 word answer each; mirror PAA wording -->
</article>
<!-- JSON-LD (Article + FAQPage + author/Organization sameAs) → see `seo-geo` -->
```

### Query-class test prompts (run before and after publishing)

Pick the queries your page targets, then probe each answer engine. Record whether your domain is **cited**, **mentioned**, or **absent**, and which competitor is cited instead.

```text
# Definitional
"what is {your topic}"
# Procedural
"how do I {task your page solves}"
# Comparative
"{your product/approach} vs {top competitor}"
# Recommendation / commercial
"best {category} for {audience/use-case}"
# Long-tail / specific
"{specific question from your FAQ block, verbatim}"
```

For each: note the cited sources and the *exact claim* the engine made. If a competitor is cited and you're not, diff your page against theirs on the levers above (usually missing direct answer, missing original data, weaker author signals, or stale dates). Re-test after the page is re-crawled.

> **Don't fabricate to chase citations.** Original "data" must be real and reproducible, author credentials must be true, and review dates must reflect actual reviews. Manufactured stats and fake bylines are the fastest way to lose trust with both readers and answer engines.

---
