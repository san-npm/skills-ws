import { getSkills, getCategories } from "@/lib/skills";
import InstallBox from "@/components/InstallBox";
import SkillsGrid from "@/components/SkillsGrid";
import AsciiBackground from "@/components/AsciiBackground";

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
      <header className="pt-20 pb-10 text-center sm:pt-20 max-sm:pt-12 relative">
        <div className="absolute inset-0 -mx-6 overflow-hidden" style={{ height: "500px", top: "-40px" }}>
          <AsciiBackground />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0a]" />
        </div>
        <pre className="relative z-10 text-[11px] leading-tight text-accent opacity-80 mb-6 overflow-x-auto max-sm:text-[7px]">
          {ASCII}
        </pre>
        <p className="relative z-10 font-sans text-lg text-text-dim mb-3">
          Agent skills built for{" "}
          <strong className="text-text-main font-semibold">marketing, growth, analytics & conversion</strong>
        </p>
        <p className="relative z-10 font-sans text-sm text-text-muted mb-8">
          by <a href="https://openletz.com" target="_blank" className="text-text-dim hover:text-accent transition-colors">Commit Media</a>
        </p>

        <div className="relative z-10">
          <InstallBox command="npx skillsadd commit-skills" />
        </div>

        <div className="relative z-10 flex justify-center gap-5 mt-8 mb-12 flex-wrap">
          {platforms.map((p) => (
            <span key={p} className="text-[13px] text-text-dim flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-accent opacity-60" />
              {p}
            </span>
          ))}
        </div>
      </header>

      <SkillsGrid skills={skills} categories={categories} />

      <div className="bg-bg-card border border-border rounded-xl px-6 py-6 mt-12">
        <h2 className="text-sm font-semibold text-text-main font-sans mb-3">Security</h2>
        <p className="text-[13px] text-text-dim font-sans leading-relaxed mb-3">
          Every skill is built in-house — no third-party code, no external dependencies at runtime.
          All scripts read credentials from environment variables only. No eval(), no exec(), no child_process.
        </p>
        <div className="flex flex-wrap gap-4 text-[12px] text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            VirusTotal scanned
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            No external dependencies
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            Env-only credentials
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
            No code execution patterns
          </span>
        </div>
      </div>

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
            href="https://openletz.com"
            target="_blank"
            className="text-text-dim hover:text-accent transition-colors"
          >
            Commit Media
          </a>
        </p>
        <p className="text-text-muted text-[13px]">Agent skills for humans & agents alike</p>
        <div className="flex justify-center gap-6 mt-4">
          {[
            ["GitHub", "https://github.com/san-npm/skills-ws"],
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
