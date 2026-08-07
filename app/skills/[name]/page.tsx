import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSkills, getSkill, categoryColors } from "@/lib/skills";
import { skillDisplayName, categoryDisplayName, answerFirstDescription } from "@/lib/display";
import InstallBox from "@/components/InstallBox";
import SkillContent from "@/components/SkillContent";

const BASE_URL = "https://www.skills.ws";
const ORG = {
  "@type": "Organization",
  name: "Commit Media",
  url: "https://openletz.com",
  logo: `${BASE_URL}/favicon.svg`,
} as const;

const PUBLISHED = "2026-03-02";
const MODIFIED = new Date().toISOString().slice(0, 10);
const UPDATED_LABEL = "Aug 2026";

export function generateStaticParams() {
  return getSkills().map((s) => ({ name: s.name }));
}

export async function generateMetadata({ params }: { params: Promise<{ name: string }> }): Promise<Metadata> {
  const { name } = await params;
  const skill = getSkill(name);
  if (!skill) return notFound();

  const display = skillDisplayName(skill.name);
  const title = `${display} skill — Agent Skill for AI Coding Assistants`;
  const description = answerFirstDescription(skill.name, skill.description);
  const url = `${BASE_URL}/skills/${skill.name}`;

  return {
    title,
    description,
    keywords: [
      skill.name,
      display,
      `${display} skill`,
      `${display} for Claude Code`,
      `${display} for Cursor`,
      `${categoryDisplayName(skill.category)} AI skill`,
      "AI agent skill",
      "SKILL.md",
      "npx skills-ws",
      ...skill.platforms,
    ],
    openGraph: {
      title: `${display} — Agent Skill`,
      description,
      url,
      type: "article",
      siteName: "skills.ws",
      publishedTime: PUBLISHED,
      modifiedTime: MODIFIED,
      authors: ["https://openletz.com"],
      images: [{ url: `${BASE_URL}/og.png`, width: 1200, height: 630, alt: `${display} agent skill` }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${display} — skills.ws`,
      description: skill.description,
      images: [`${BASE_URL}/og.png`],
    },
    alternates: { canonical: url },
  };
}

export default async function SkillPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const skill = getSkill(name);
  if (!skill) notFound();

  const display = skillDisplayName(skill.name);
  const url = `${BASE_URL}/skills/${skill.name}`;
  const description = answerFirstDescription(skill.name, skill.description);
  const colors = categoryColors[skill.category] ?? {
    text: "text-text-main",
    bg: "bg-border/10",
  };

  const related = getSkills()
    .filter((s) => s.category === skill.category && s.name !== skill.name)
    .slice(0, 6);

  const schemaData = [
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: `${display} — Agent Skill for AI Coding Assistants`,
      description,
      url,
      mainEntityOfPage: { "@type": "WebPage", "@id": url },
      datePublished: PUBLISHED,
      dateModified: MODIFIED,
      inLanguage: "en",
      keywords: [display, skill.category, "AI skill", "SKILL.md", ...skill.platforms].join(", "),
      author: ORG,
      publisher: ORG,
      image: `${BASE_URL}/og.png`,
      articleSection: categoryDisplayName(skill.category),
      proficiencyLevel: "Expert",
      about: skill.features?.map((f) => ({ "@type": "Thing", name: f })),
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: `${display} skill`,
      alternateName: skill.name,
      description: skill.description,
      applicationCategory: "DeveloperApplication",
      applicationSubCategory: categoryDisplayName(skill.category),
      operatingSystem: "Cross-platform",
      softwareVersion: skill.version,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      url,
      downloadUrl: "https://www.npmjs.com/package/skills-ws",
      installUrl: url,
      softwareRequirements:
        "Node.js 18+ and an AI coding assistant supporting SKILL.md (Claude Code, OpenClaw, Cursor, Codex, or GitHub Copilot)",
      author: ORG,
      publisher: ORG,
      releaseNotes: "https://github.com/san-npm/skills-ws/releases",
      license: "https://github.com/san-npm/skills-ws/blob/main/LICENSE",
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "Skills", item: `${BASE_URL}/#skills` },
        {
          "@type": "ListItem",
          position: 3,
          name: categoryDisplayName(skill.category),
          item: `${BASE_URL}/skills/category/${skill.category}`,
        },
        { "@type": "ListItem", position: 4, name: display, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `What is the ${display} skill?`,
          acceptedAnswer: { "@type": "Answer", text: description },
        },
        {
          "@type": "Question",
          name: `How do I install the ${display} skill?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Run npx skills-ws install ${skill.name} in your project. The skill is added to your agent's skills directory (.claude/skills, .cursor/skills, .agents/skills, or the OpenClaw workspace skills/ directory) and works with Claude Code, OpenClaw, Cursor, Codex, and GitHub Copilot.`,
          },
        },
        {
          "@type": "Question",
          name: `Which AI coding assistants support the ${display} skill?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `${display} works with any agent that supports the SKILL.md standard, including ${skill.platforms.join(", ")}.`,
          },
        },
        {
          "@type": "Question",
          name: `Is the ${display} skill free?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: `Yes. ${display} is MIT-licensed open source and free to use. Source code is on GitHub at github.com/san-npm/skills-ws.`,
          },
        },
      ],
    },
  ];

  return (
    <div className="max-w-[700px] mx-auto px-6 py-16">
      <nav aria-label="Breadcrumb" className="mb-8 text-[12px] text-text-muted">
        <Link href="/" className="hover:text-accent transition-colors">Home</Link>
        <span className="mx-2">›</span>
        <Link href="/" className="hover:text-accent transition-colors">Skills</Link>
        <span className="mx-2">›</span>
        <Link href={`/skills/category/${skill.category}`} className="hover:text-accent transition-colors capitalize">
          {categoryDisplayName(skill.category)}
        </Link>
        <span className="mx-2">›</span>
        <span className="text-text-dim">{display}</span>
      </nav>

      <article className="bg-bg-card border border-border rounded-xl p-8" itemScope itemType="https://schema.org/TechArticle">
        <header className="mb-6">
          <h1 className="text-2xl font-bold font-sans text-text-main mb-2" itemProp="headline">
            {display} skill
          </h1>
          <p className="text-text-dim font-sans leading-relaxed text-[15px] mb-4" itemProp="description">
            {description}
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Link
              href={`/skills/category/${skill.category}`}
              className={`text-[11px] uppercase tracking-wide font-medium px-2.5 py-1 rounded ${colors.text} ${colors.bg} hover:opacity-80 transition-opacity`}
            >
              {skill.category}
            </Link>
            <span className="text-[11px] text-text-muted">v{skill.version}</span>
            <span className="text-[11px] text-text-muted">
              Updated{" "}
              <time dateTime="2026-08" itemProp="dateModified">
                {UPDATED_LABEL}
              </time>
            </span>
          </div>
        </header>

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
            Security scan: clean
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
            <div itemProp="articleBody">
              <SkillContent content={skill.content} skillName={skill.name} />
            </div>
          </>
        )}

        <meta itemProp="datePublished" content={PUBLISHED} />
        <meta itemProp="author" content="Commit Media" />
      </article>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-12">
          <h2 id="related-heading" className="text-sm font-semibold text-text-main font-sans mb-4">
            Related {categoryDisplayName(skill.category)} skills
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {related.map((r) => (
              <li key={r.name}>
                <Link
                  href={`/skills/${r.name}`}
                  className="block bg-bg-card border border-border rounded-lg px-4 py-3 hover:border-accent transition-colors"
                >
                  <div className="text-[13px] font-semibold text-text-main font-sans">
                    {skillDisplayName(r.name)}
                  </div>
                  <div className="text-[12px] text-text-muted mt-0.5 line-clamp-2">
                    {r.description}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="text-center mt-12">
        <Link href="/" className="text-text-muted text-sm hover:text-accent transition-colors">
          ← All {getSkills().length} skills
        </Link>
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
