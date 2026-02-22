import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Documentation — skills.ws",
  description: "Learn how agent skills work, how to install them, and the security model behind them.",
};

export default function DocsPage() {
  return (
    <div className="max-w-[700px] mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold font-sans text-text-main mb-8">Documentation</h1>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-text-main font-sans mb-3">What are agent skills?</h2>
        <p className="text-[14px] text-text-dim font-sans leading-relaxed mb-3">
          Agent skills are modular packages that extend AI coding assistants with specialized knowledge,
          workflows, and tools. Each skill follows the open <code className="bg-bg border border-border rounded px-1.5 py-0.5 text-[13px] font-mono text-accent">SKILL.md</code> standard
          — a markdown file that teaches an AI agent how to handle a specific domain.
        </p>
        <p className="text-[14px] text-text-dim font-sans leading-relaxed">
          When you install a skill, your agent gains deep expertise in that area — marketing strategy,
          conversion optimization, SEO auditing, or whatever the skill covers. No API keys, no
          configuration, just install and use.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-text-main font-sans mb-3">How skills work</h2>
        <p className="text-[14px] text-text-dim font-sans leading-relaxed mb-3">
          Your AI assistant reads the skill&apos;s description (in the YAML frontmatter) to decide when to
          activate it. When a task matches, the agent loads the full SKILL.md body as its instruction
          set — frameworks, checklists, decision trees, and step-by-step workflows.
        </p>
        <p className="text-[14px] text-text-dim font-sans leading-relaxed">
          Skills work with any agent that supports the SKILL.md standard: OpenClaw, Claude Code,
          Cursor, Codex, and others.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-text-main font-sans mb-3">Skill anatomy</h2>
        <div className="bg-bg border border-border rounded-lg p-5 font-mono text-[13px] text-text-main mb-4">
          <div className="text-text-muted mb-1">skill-name/</div>
          <div className="pl-4 text-accent">SKILL.md</div>
          <div className="pl-4 text-text-dim">references/</div>
          <div className="pl-8 text-text-dim">deep-guide.md</div>
          <div className="pl-8 text-text-dim">templates.md</div>
          <div className="pl-4 text-text-dim">scripts/</div>
          <div className="pl-8 text-text-dim">audit.py</div>
        </div>
        <ul className="space-y-2 text-[14px] text-text-dim font-sans">
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-accent mt-2.5 shrink-0" />
            <span><strong className="text-text-main">SKILL.md</strong> — the core instruction file. Frontmatter defines triggers, body defines behavior.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-accent mt-2.5 shrink-0" />
            <span><strong className="text-text-main">references/</strong> — deep documentation loaded on-demand. Keeps the main file lean.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-accent mt-2.5 shrink-0" />
            <span><strong className="text-text-main">scripts/</strong> — deterministic executable code. Reads credentials from env vars only.</span>
          </li>
        </ul>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-text-main font-sans mb-3">Installation</h2>
        <p className="text-[14px] text-text-dim font-sans leading-relaxed mb-4">
          Install all skills at once or pick individual ones:
        </p>
        <div className="space-y-3">
          <div className="bg-bg border border-border rounded-lg px-5 py-3 font-mono text-[13px]">
            <span className="text-accent select-none">$ </span>
            <span className="text-text-main">npx skillsadd commit-skills</span>
          </div>
          <div className="bg-bg border border-border rounded-lg px-5 py-3 font-mono text-[13px]">
            <span className="text-accent select-none">$ </span>
            <span className="text-text-main">npx skillsadd commit-skills --skill seo-geo</span>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-text-main font-sans mb-3">Security model</h2>
        <ul className="space-y-2 text-[14px] text-text-dim font-sans">
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-green-500 mt-2.5 shrink-0" />
            <span>Every skill is built in-house by Commit Media — no third-party code</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-green-500 mt-2.5 shrink-0" />
            <span>All skills scanned with VirusTotal — each skill page links to its scan report</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-green-500 mt-2.5 shrink-0" />
            <span>No external runtime dependencies</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-green-500 mt-2.5 shrink-0" />
            <span>Scripts read credentials from environment variables only — no hardcoded secrets</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-green-500 mt-2.5 shrink-0" />
            <span>No eval(), exec(), or child_process patterns in any script</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-1 h-1 rounded-full bg-green-500 mt-2.5 shrink-0" />
            <span>Source code available on <a href="https://github.com/san-npm/skills-ws" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">GitHub</a></span>
          </li>
        </ul>
      </section>
    </div>
  );
}
