import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSkills, getSkill, categoryColors } from "@/lib/skills";
import InstallBox from "@/components/InstallBox";
import SkillContent from "@/components/SkillContent";

const BASE_URL = "https://skills.ws";

export function generateStaticParams() {
  return getSkills().map((s) => ({ name: s.name }));
}

export function generateMetadata({ params }: { params: { name: string } }): Metadata {
  const skill = getSkill(params.name);
  if (!skill) return {};

  const title = `${skill.name} — AI Agent Skill`;
  const description = `${skill.description} Install with npx skills-ws install ${skill.name}. Works with OpenClaw, Claude Code, Cursor, and Codex.`;
  const url = `${BASE_URL}/skills/${skill.name}`;

  return {
    title,
    description,
    keywords: [
      skill.name,
      `${skill.name} skill`,
      `${skill.category} AI skill`,
      "AI agent skill",
      "SKILL.md",
      ...skill.platforms,
    ],
    openGraph: {
      title,
      description,
      url,
      type: "article",
      siteName: "skills.ws",
      images: [{ url: `${BASE_URL}/og.png`, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary",
      title: `${skill.name} — skills.ws`,
      description: skill.description,
    },
    alternates: {
      canonical: url,
    },
  };
}

export default function SkillPage({ params }: { params: { name: string } }) {
  const skill = getSkill(params.name);
  if (!skill) notFound();

  const colors = categoryColors[skill.category] ?? {
    text: "text-text-dim",
    bg: "bg-border/10",
  };

  const schemaData = [
    // SoftwareApplication
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: skill.name,
      description: skill.description,
      applicationCategory: "DeveloperApplication",
      operatingSystem: "Cross-platform",
      softwareVersion: skill.version,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      url: `${BASE_URL}/skills/${skill.name}`,
      downloadUrl: "https://www.npmjs.com/package/skills-ws",
      author: { "@type": "Organization", name: "Commit Media", url: "https://openletz.com" },
    },
    // BreadcrumbList
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "Skills", item: `${BASE_URL}/#skills` },
        { "@type": "ListItem", position: 3, name: skill.name, item: `${BASE_URL}/skills/${skill.name}` },
      ],
    },
    // FAQPage for the skill
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `What is the ${skill.name} skill?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: skill.description,
          },
        },
        {
          "@type": "Question",
          name: `How do I install the ${skill.name} skill?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Run: npx skills-ws install ${skill.name}. This works with OpenClaw, Claude Code, Cursor, and Codex.`,
          },
        },
      ],
    },
  ];

  return (
    <div className="max-w-[700px] mx-auto px-6 py-16">
      <Link
        href="/"
        className="text-text-muted text-sm hover:text-accent transition-colors mb-8 inline-block"
      >
        back to all skills
      </Link>

      <div className="bg-bg-card border border-border rounded-xl p-8 mt-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold font-sans text-text-main mb-2">
            {skill.name}
          </h1>
          <div className="flex items-center gap-3 mb-4">
            <span
              className={`text-[11px] uppercase tracking-wide font-medium px-2.5 py-1 rounded ${colors.text} ${colors.bg}`}
            >
              {skill.category}
            </span>
            <span className="text-[11px] text-text-muted">v{skill.version}</span>
          </div>
          <p className="text-text-dim font-sans leading-relaxed text-[15px]">
            {skill.description}
          </p>
        </div>

        <div className="mb-8">
          <InstallBox command={`npx skills-ws install ${skill.name}`} />
        </div>

        <div className="mb-8">
          <div className="flex gap-2 flex-wrap">
            {skill.platforms.map((p) => (
              <span
                key={p}
                className="text-[12px] text-text-dim bg-bg border border-border rounded px-3 py-1"
              >
                {p}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 text-[12px] text-text-muted mt-4 flex-wrap">
          <span className="flex items-center gap-1.5">
            {(skill.installs ?? 0).toLocaleString()} installs
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500/70" />
            VirusTotal: clean
          </span>
          <a
            href="https://github.com/san-npm/skills-ws"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-accent transition-colors"
          >
            Source code
          </a>
        </div>

        {skill.content && (
          <>
            <hr className="border-border my-8" />
            <SkillContent content={skill.content} />
          </>
        )}
      </div>

      {schemaData.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </div>
  );
}
