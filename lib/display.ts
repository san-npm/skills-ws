// Human-readable display names + page metadata helpers for skill slugs.
// Skill slugs are kebab-case (e.g. "ab-testing"); pages render generic titles
// unless we humanize them — important for both classic SERP CTR and AI citation
// entity recognition (Bing GEO: "avoid ambiguous entity references").

const SPECIAL_CASE_TITLES: Record<string, string> = {
  "ab-testing": "A/B Testing",
  "ai-agent-building": "AI Agent Building",
  "api-design": "API Design",
  "aws-production-deploy": "AWS Production Deploy",
  "bing-webmaster": "Bing Webmaster Tools",
  "ci-cd-pipeline": "CI/CD Pipeline",
  "cicd-pipelines": "CI/CD Pipelines",
  "crm-builder": "CRM Builder",
  "crm-operations": "CRM Operations",
  "defi-integration": "DeFi Integration",
  "eu-legal-compliance": "EU Legal Compliance",
  "eu-tax-accounting": "EU Tax & Accounting",
  "mcp-client": "MCP Client",
  "mcp-server-builder": "MCP Server Builder",
  "mvp-launcher": "MVP Launcher",
  "nextjs-performance": "Next.js Performance",
  "nextjs-stack": "Next.js Stack",
  "pr-media-outreach": "PR & Media Outreach",
  "saas-billing": "SaaS Billing",
  "seo-geo": "SEO & GEO",
  "ui-ux-pro-max": "UI/UX Pro Max",
};

export function skillDisplayName(slug: string): string {
  if (SPECIAL_CASE_TITLES[slug]) return SPECIAL_CASE_TITLES[slug];
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function categoryDisplayName(slug: string): string {
  return slug.charAt(0).toUpperCase() + slug.slice(1);
}

// Answer-first description: leads with "X is Y" sentence that AI engines can
// extract as a self-contained snippet (OpenAI: optimal cited passage 135–165
// words; first 30% of content gets ~44% of citations).
//
// If the raw description already opens with the display name (a self-contained
// answer-first sentence), skip the boilerplate prefix to avoid double-naming.
export function answerFirstDescription(slug: string, rawDescription: string): string {
  const name = skillDisplayName(slug);
  const installNote = `Install with: npx skills-ws install ${slug}.`;
  const trimmed = rawDescription.trim();
  const startsWithName = trimmed.toLowerCase().startsWith(name.toLowerCase());
  if (startsWithName) {
    return `${trimmed} ${installNote}`;
  }
  return `${name} is an agent skill for AI coding assistants (Claude Code, OpenClaw, Cursor, Codex). ${trimmed} ${installNote}`;
}
