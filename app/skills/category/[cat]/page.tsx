import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSkills, getCategories, categoryColors } from "@/lib/skills";
import { skillDisplayName, categoryDisplayName } from "@/lib/display";

const BASE_URL = "https://www.skills.ws";
const MODIFIED = new Date().toISOString().slice(0, 10);

interface CategoryPageProps {
  params: Promise<{ cat: string }>;
}

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  marketing: "Marketing agent skills for AI coding assistants — brand strategy, copywriting, content strategy, paid ads, PR, influencer marketing, email sequences, and more.",
  growth: "Growth engineering agent skills — growth hacking, customer acquisition, retention analytics, product-led growth, viral mechanics, and funnel optimization.",
  web3: "Web3 agent skills — Solidity development, smart contract auditing, DeFi integration, wallet integration, on-chain analytics, and Telegram Mini Apps.",
  conversion: "Conversion rate optimization agent skills — A/B testing, landing page builder, page CRO, popup CRO, signup flow CRO, and sales funnels.",
  design: "Design system and UI/UX agent skills — design tokens, component libraries, accessibility audits (WCAG 2.1 AA), and ASCII banners.",
  dev: "Developer agent skills — API design, auth, databases, Docker, Next.js, Postgres, security hardening, testing, and Solidity.",
  analytics: "Analytics agent skills — GA4 setup, data analytics workflows, marketing analytics, on-chain analytics, retention analytics, and Search Console.",
  operations: "Operations and compliance agent skills — EU legal compliance (GDPR, DSA, DMA, EU AI Act), EU tax & accounting, hiring, project management, and revenue operations.",
};

export function generateStaticParams() {
  return getCategories().map((cat) => ({ cat }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { cat } = await params;
  const cats = getCategories();
  if (!cats.includes(cat)) return notFound();

  const display = categoryDisplayName(cat);
  const skills = getSkills().filter((s) => s.category === cat);
  const description = CATEGORY_DESCRIPTIONS[cat] ??
    `${display} agent skills for AI coding assistants. ${skills.length} skills covering ${display.toLowerCase()} workflows.`;
  const url = `${BASE_URL}/skills/category/${cat}`;

  return {
    title: `${display} Skills — Agent Skills for AI Coding Assistants`,
    description,
    keywords: [
      `${display} AI skills`,
      `${display} agent skills`,
      `${display} for Claude Code`,
      `${display} for Cursor`,
      "SKILL.md",
      "npx skills-ws",
    ],
    openGraph: {
      title: `${display} Skills — ${skills.length} agent skills`,
      description,
      url,
      type: "website",
      siteName: "skills.ws",
      images: [{ url: `${BASE_URL}/og.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${display} Skills — skills.ws`,
      description,
      images: [`${BASE_URL}/og.png`],
    },
    alternates: { canonical: url },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { cat } = await params;
  const cats = getCategories();
  if (!cats.includes(cat)) notFound();

  const display = categoryDisplayName(cat);
  const url = `${BASE_URL}/skills/category/${cat}`;
  const skills = getSkills().filter((s) => s.category === cat);
  const colors = categoryColors[cat] ?? { text: "text-text-main", bg: "bg-border/10" };
  const description = CATEGORY_DESCRIPTIONS[cat] ??
    `${display} agent skills for AI coding assistants.`;

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${display} Skills`,
    description,
    url,
    dateModified: MODIFIED,
    isPartOf: { "@type": "WebSite", name: "skills.ws", url: BASE_URL },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: skills.length,
      itemListElement: skills.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${BASE_URL}/skills/${s.name}`,
        name: skillDisplayName(s.name),
        description: s.description,
      })),
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
      { "@type": "ListItem", position: 2, name: "Skills", item: `${BASE_URL}/#skills` },
      { "@type": "ListItem", position: 3, name: display, item: url },
    ],
  };

  return (
    <div className="max-w-[900px] mx-auto px-6 py-16">
      <nav aria-label="Breadcrumb" className="mb-8 text-[12px] text-text-muted">
        <Link href="/" className="hover:text-accent transition-colors">Home</Link>
        <span className="mx-2">›</span>
        <Link href="/" className="hover:text-accent transition-colors">Skills</Link>
        <span className="mx-2">›</span>
        <span className="text-text-dim">{display}</span>
      </nav>

      <header className="mb-10">
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <h1 className="text-2xl font-bold font-sans text-text-main">
            {display} skills
          </h1>
          <span className={`text-[11px] uppercase tracking-wide font-medium px-2.5 py-1 rounded ${colors.text} ${colors.bg}`}>
            {skills.length} skills
          </span>
        </div>
        <p className="text-text-dim font-sans leading-relaxed text-[15px]">
          {description}
        </p>
      </header>

      <div className="grid gap-3">
        {skills.map((s) => (
          <Link
            key={s.name}
            href={`/skills/${s.name}`}
            className="bg-bg-card border border-border rounded-xl px-6 py-5 grid grid-cols-[1fr_auto] items-start gap-4 transition-all hover:border-border-hover hover:bg-bg-hover hover:-translate-y-px no-underline text-inherit"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1.5">
                <span className="text-base font-semibold text-text-main font-sans">
                  {skillDisplayName(s.name)}
                </span>
                <span className="text-[11px] text-text-muted font-mono">v{s.version}</span>
              </div>
              <p className="text-[13px] text-text-dim leading-relaxed font-sans">
                {s.description}
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="text-center mt-12">
        <Link href="/" className="text-text-muted text-sm hover:text-accent transition-colors">
          ← All {getSkills().length} skills
        </Link>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}
