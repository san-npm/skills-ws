import { getSkills, getCategories } from "@/lib/skills";
import InstallBox from "@/components/InstallBox";
import SkillsGrid from "@/components/SkillsGrid";

const ASCII = `███████╗██╗  ██╗██╗██╗     ██╗     ███████╗   ██╗    ██╗███████╗
██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝   ██║    ██║██╔════╝
███████╗█████╔╝ ██║██║     ██║     ███████╗   ██║ █╗ ██║███████╗
╚════██║██╔═██╗ ██║██║     ██║     ╚════██║   ██║███╗██║╚════██║
███████║██║  ██╗██║███████╗███████╗███████║██╗╚███╔███╔╝███████║
╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝╚═╝ ╚══╝╚══╝ ╚══════╝`;

const platforms = ["OpenClaw", "Claude Code", "Cursor", "Codex"];

export default function Home() {
  const skills = getSkills();
  const categories = getCategories();

  return (
    <div className="max-w-[900px] mx-auto px-6">
      <header className="pt-20 pb-10 text-center sm:pt-20 max-sm:pt-12">
        <pre className="text-[11px] leading-tight text-accent opacity-80 mb-6 overflow-x-auto max-sm:text-[7px]">
          {ASCII}
        </pre>
        <p className="font-sans text-lg text-text-dim mb-8">
          Curated <strong className="text-text-main font-semibold">agent skills</strong> by{" "}
          <strong className="text-text-main font-semibold">Dr Clawdberg</strong>{" "}
          <span>🌟</span>
        </p>

        <InstallBox command="npx skillsadd clawdberg-skills" />

        <div className="flex justify-center gap-5 mt-8 mb-12 flex-wrap">
          {platforms.map((p) => (
            <span key={p} className="text-[13px] text-text-dim flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent opacity-60" />
              {p}
            </span>
          ))}
        </div>
      </header>

      <SkillsGrid skills={skills} categories={categories} />

      <div className="flex justify-center gap-10 py-8 mt-12 border-t border-border max-sm:gap-6">
        <div className="text-center">
          <div className="text-[28px] font-bold text-accent font-sans max-sm:text-[22px]">
            {skills.length}
          </div>
          <div className="text-xs text-text-muted mt-1">skills</div>
        </div>
        <div className="text-center">
          <div className="text-[28px] font-bold text-accent font-sans max-sm:text-[22px]">
            {categories.length}
          </div>
          <div className="text-xs text-text-muted mt-1">categories</div>
        </div>
        <div className="text-center">
          <div className="text-[28px] font-bold text-accent font-sans max-sm:text-[22px]">
            {platforms.length}
          </div>
          <div className="text-xs text-text-muted mt-1">platforms</div>
        </div>
      </div>

      <footer className="text-center py-12 border-t border-border mt-6">
        <p className="text-text-muted text-[13px] leading-8">
          Built by{" "}
          <a
            href="https://www.8004scan.io/agents/celo/34"
            target="_blank"
            className="text-text-dim hover:text-accent transition-colors"
          >
            Dr Clawdberg
          </a>{" "}
          🌟
        </p>
        <p className="text-text-muted text-[13px]">Agent Skills for humans & agents alike</p>
        <div className="flex justify-center gap-6 mt-4">
          {[
            ["GitHub", "https://github.com/clementfrmd/clawdberg-skills"],
            ["API", "/skills.json"],
            ["OpenClaw", "https://docs.openclaw.ai"],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              className="text-text-dim text-[13px] hover:text-accent transition-colors"
            >
              {label}
            </a>
          ))}
        </div>
      </footer>
    </div>
  );
}
