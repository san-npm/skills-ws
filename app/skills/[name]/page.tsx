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
      title: `${skill.name} — Agent Skill`,
      description: skill.description,
      url: `https://skills-ws.vercel.app/skills/${skill.name}`,
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
        back to all skills
      </Link>

      <div className="bg-bg-card border border-border rounded-xl p-8 mt-4">
        <div className="mb-6">
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

        <p className="text-text-dim font-sans leading-relaxed mb-8">
          {skill.description}
        </p>

        {skill.features && skill.features.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs uppercase tracking-wider text-text-muted mb-4">
              What it does
            </h2>
            <ul className="space-y-2.5">
              {skill.features.map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-[13px] text-text-dim font-sans leading-relaxed">
                  <span className="w-1 h-1 rounded-full bg-accent mt-2 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}

        {skill.useCases && skill.useCases.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs uppercase tracking-wider text-text-muted mb-4">
              Use cases
            </h2>
            <div className="grid gap-2">
              {skill.useCases.map((useCase, i) => (
                <div key={i} className="bg-bg border border-border rounded-lg px-4 py-3 text-[13px] text-text-dim font-sans">
                  {useCase}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-xs uppercase tracking-wider text-text-muted mb-3">
            Install
          </h2>
          <InstallBox command={`npx skillsadd commit-skills --skill ${skill.name}`} />
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
            url: `https://skills-ws.vercel.app/skills/${skill.name}`,
          }),
        }}
      />
    </div>
  );
}
