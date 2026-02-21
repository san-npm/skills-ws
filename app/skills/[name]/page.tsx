import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getSkills, getSkill, categoryColors } from "@/lib/skills";
import InstallBox from "@/components/InstallBox";

export function generateStaticParams() {
  return getSkills().map((s) => ({ name: s.name }));
}

export function generateMetadata({ params }: { params: { name: string } }): Metadata {
  const skill = getSkill(params.name);
  if (!skill) return {};
  return {
    title: `${skill.name} — skills.ws`,
    description: skill.description,
    openGraph: {
      title: `${skill.name} — Agent Skill by Dr Clawdberg`,
      description: skill.description,
      url: `https://skills.ws/skills/${skill.name}`,
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

  return (
    <div className="max-w-[700px] mx-auto px-6 py-16">
      <Link
        href="/"
        className="text-text-muted text-sm hover:text-accent transition-colors mb-8 inline-block"
      >
        ← back to all skills
      </Link>

      <div className="bg-bg-card border border-border rounded-xl p-8 mt-4">
        <div className="flex items-start gap-5 mb-6">
          <div className="text-[40px] w-16 h-16 flex items-center justify-center bg-bg rounded-xl border border-border shrink-0">
            {skill.icon}
          </div>
          <div>
            <h1 className="text-2xl font-bold font-sans text-text-main mb-2">
              {skill.name}
            </h1>
            <div className="flex items-center gap-3">
              <span
                className={`text-[11px] uppercase tracking-wide font-medium px-2.5 py-1 rounded ${colors.text} ${colors.bg}`}
              >
                {skill.category}
              </span>
              <span className="text-[11px] text-text-muted">v{skill.version}</span>
            </div>
          </div>
        </div>

        <p className="text-text-dim font-sans leading-relaxed mb-8">
          {skill.description}
        </p>

        <div className="mb-8">
          <h2 className="text-xs uppercase tracking-wider text-text-muted mb-3">
            Install
          </h2>
          <InstallBox command={`npx skillsadd clawdberg-skills --skill ${skill.name}`} />
        </div>

        <div>
          <h2 className="text-xs uppercase tracking-wider text-text-muted mb-3">
            Platforms
          </h2>
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
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: skill.name,
            description: skill.description,
            applicationCategory: "DeveloperApplication",
            operatingSystem: "Cross-platform",
            softwareVersion: skill.version,
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
            url: `https://skills.ws/skills/${skill.name}`,
          }),
        }}
      />
    </div>
  );
}
