import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CLI Reference — skills.ws",
  description: "How to install and manage agent skills from the command line.",
};

export default function CliPage() {
  return (
    <div className="max-w-[700px] mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold font-sans text-text-main mb-8">CLI Reference</h1>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-text-main font-sans mb-3">Install all skills</h2>
        <div className="bg-bg border border-border rounded-lg px-5 py-3 font-mono text-[13px] mb-3">
          <span className="text-accent select-none">$ </span>
          <span className="text-text-main">curl -fsSL https://skills-ws.vercel.app/install.sh | bash</span>
        </div>
        <p className="text-[14px] text-text-dim font-sans leading-relaxed">
          Installs all 18 skills into your project. Works with any SKILL.md-compatible agent.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-text-main font-sans mb-3">Install a single skill</h2>
        <div className="bg-bg border border-border rounded-lg px-5 py-3 font-mono text-[13px] mb-3">
          <span className="text-accent select-none">$ </span>
          <span className="text-text-main">curl -fsSL https://skills-ws.vercel.app/install.sh | bash -s -- --skill seo-geo</span>
        </div>
        <p className="text-[14px] text-text-dim font-sans leading-relaxed">
          Install only the skill you need. Replace <code className="bg-bg border border-border rounded px-1.5 py-0.5 text-[13px] font-mono text-accent">seo-geo</code> with any skill name.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-text-main font-sans mb-3">What gets installed</h2>
        <p className="text-[14px] text-text-dim font-sans leading-relaxed mb-3">
          Skills are added to your project directory. The exact location depends on your agent:
        </p>
        <div className="bg-bg border border-border rounded-lg p-5 font-mono text-[13px] text-text-dim space-y-1">
          <div><span className="text-text-muted">Claude Code:</span> <span className="text-text-main">.claude/skills/</span></div>
          <div><span className="text-text-muted">OpenClaw:</span> <span className="text-text-main">~/openclaw/skills/</span></div>
          <div><span className="text-text-muted">Cursor:</span> <span className="text-text-main">.cursor/skills/</span></div>
          <div><span className="text-text-muted">Codex:</span> <span className="text-text-main">.codex/skills/</span></div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-text-main font-sans mb-3">SKILL.md format</h2>
        <p className="text-[14px] text-text-dim font-sans leading-relaxed mb-4">
          Every skill follows the same structure. The frontmatter tells the agent when to activate,
          the body tells it what to do:
        </p>
        <div className="bg-bg border border-border rounded-lg p-5 font-mono text-[13px] text-text-main overflow-x-auto">
          <pre>{`---
name: seo-geo
description: "SEO & GEO optimization for websites.
  Use when the user wants to improve search
  visibility, audit SEO, or optimize for AI
  search engines."
---

# SEO & GEO Optimization

## Initial Assessment
Understand the site context before auditing:
- What type of site? (SaaS, e-commerce, blog)
- What keywords are priorities?
- Current organic traffic level?

## Technical SEO Audit
### Crawlability
- Check robots.txt for unintentional blocks
- Verify XML sitemap exists and is submitted
...`}</pre>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-text-main font-sans mb-3">Compatible agents</h2>
        <p className="text-[14px] text-text-dim font-sans leading-relaxed mb-3">
          These skills work with any agent that supports the SKILL.md standard:
        </p>
        <div className="grid grid-cols-2 gap-2 max-sm:grid-cols-1">
          {["OpenClaw", "Claude Code", "Cursor", "Codex", "Gemini CLI", "Any SKILL.md agent"].map((agent) => (
            <div key={agent} className="bg-bg-card border border-border rounded-lg px-4 py-2.5 text-[13px] text-text-dim font-sans">
              {agent}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
