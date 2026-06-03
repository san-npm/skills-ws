import type { Metadata } from "next";
import { getSkills } from "@/lib/skills";
import JsonLd from "@/components/JsonLd";

const skillCount = getSkills().length;

export const metadata: Metadata = {
  title: "npx skills — CLI Reference for skills-ws",
  description: `npx skills (skills-ws) installs ${skillCount} agent skills for AI coding assistants from the command line. Run npx skills-ws to install all skills, or npx skills-ws --skill name for a single one. Works with Claude Code, OpenClaw, Cursor, Codex, and Gemini CLI.`,
  keywords: [
    "npx skills",
    "npx skills-ws",
    "npx skills list",
    "npx skills add",
    "npx skill",
    "skills-ws CLI",
    "install agent skills",
    "SKILL.md installer",
    "AI skills command line",
  ],
  openGraph: {
    title: "npx skills — CLI Reference",
    description: `Install and manage ${skillCount} agent skills from the command line with npx skills-ws.`,
    url: "https://www.skills.ws/cli",
    type: "article",
    siteName: "skills.ws",
    images: [{ url: "https://www.skills.ws/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "npx skills — CLI Reference",
    description: `Install ${skillCount} agent skills with npx skills-ws.`,
    images: ["https://www.skills.ws/og.png"],
  },
  alternates: { canonical: "https://www.skills.ws/cli" },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.skills.ws" },
    { "@type": "ListItem", position: 2, name: "CLI Reference", item: "https://www.skills.ws/cli" },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is npx skills?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "npx skills (officially npx skills-ws) is a command that installs agent skills for AI coding assistants — Claude Code, OpenClaw, Cursor, Codex, and Gemini CLI. Skills are SKILL.md files that teach an AI agent a specific domain (SEO, design, conversion, security, EU compliance, etc.).",
      },
    },
    {
      "@type": "Question",
      name: "How do I install all skills with npx skills?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Run npx skills-ws inside your project directory. The CLI auto-detects your agent and installs every skill to the correct directory (.claude/skills/, ~/openclaw/skills/, .cursor/skills/, or .codex/skills/).",
      },
    },
    {
      "@type": "Question",
      name: "How do I install one specific skill with npx skills?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Run npx skills-ws --skill seo-geo (replace seo-geo with any skill name from the catalog at skills.ws/skills.json) to install just that skill.",
      },
    },
    {
      "@type": "Question",
      name: "How do I list installed skills?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Skills install as SKILL.md files in your agent's skills directory. Check .claude/skills/ for Claude Code, ~/openclaw/skills/ for OpenClaw, .cursor/skills/ for Cursor, or .codex/skills/ for Codex. Use ls or your file explorer to list them.",
      },
    },
    {
      "@type": "Question",
      name: "Is the correct command npx skills or npx skills-ws?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "The package name is skills-ws, so the canonical command is npx skills-ws. People often shorten it to npx skills in conversation — either way, npx skills-ws is the form that resolves on npm.",
      },
    },
  ],
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to use the skills-ws CLI",
  description:
    "Use npx skills-ws to install one or all agent skills for AI coding assistants directly from your terminal.",
  totalTime: "PT1M",
  tool: [{ "@type": "HowToTool", name: "Node.js 18 or later with npx" }],
  step: [
    {
      "@type": "HowToStep",
      position: 1,
      name: "Install all skills",
      text: "Run npx skills-ws inside your project directory. This installs every skill in the catalog into your agent's skills directory.",
    },
    {
      "@type": "HowToStep",
      position: 2,
      name: "Install a single skill",
      text: "Run npx skills-ws --skill seo-geo (replace seo-geo with any skill name from skills.ws/skills.json) to add just one skill.",
    },
    {
      "@type": "HowToStep",
      position: 3,
      name: "Verify the install location",
      text: "Claude Code installs to .claude/skills/, OpenClaw to ~/openclaw/skills/, Cursor to .cursor/skills/, Codex to .codex/skills/.",
    },
  ],
};

export default function CliPage() {
  const skillCount = getSkills().length;

  return (
    <div className="max-w-[700px] mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold font-sans text-text-main mb-3">npx skills — CLI Reference</h1>
      <p className="text-[15px] text-text-dim font-sans leading-relaxed mb-10">
        <strong className="text-text-main">npx skills</strong> (officially <code className="bg-bg border border-border rounded px-1.5 py-0.5 text-[13px] font-mono text-accent">npx skills-ws</code>) installs agent skills for AI coding assistants —
        Claude Code, OpenClaw, Cursor, Codex, and Gemini CLI. Run it inside any project to install all {skillCount} skills, or pass <code className="bg-bg border border-border rounded px-1.5 py-0.5 text-[13px] font-mono text-accent">--skill name</code> for one.
      </p>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-text-main font-sans mb-3">Install all skills</h2>
        <div className="bg-bg border border-border rounded-lg px-5 py-3 font-mono text-[13px] mb-3">
          <span className="text-accent select-none">$ </span>
          <span className="text-text-main">npx skills-ws</span>
        </div>
        <p className="text-[14px] text-text-dim font-sans leading-relaxed">
          Installs all {skillCount} skills into your project. Works with any SKILL.md-compatible agent.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-text-main font-sans mb-3">Install a single skill</h2>
        <div className="bg-bg border border-border rounded-lg px-5 py-3 font-mono text-[13px] mb-3">
          <span className="text-accent select-none">$ </span>
          <span className="text-text-main">npx skills-ws --skill seo-geo</span>
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
        <h2 className="text-lg font-semibold text-text-main font-sans mb-3">Common command variations</h2>
        <p className="text-[14px] text-text-dim font-sans leading-relaxed mb-4">
          People type the install command many ways. They all resolve to the same thing — <code className="bg-bg border border-border rounded px-1.5 py-0.5 text-[13px] font-mono text-accent">skills-ws</code> on npm.
        </p>
        <div className="space-y-2 text-[13px] font-mono">
          {[
            ["npx skills-ws", "Canonical form. Installs the full catalog."],
            ["npx skills", "Common shorthand — resolves to skills-ws on npm."],
            ["npx skills-ws --skill seo-geo", "Install one specific skill."],
            ["npx skills-ws@latest", "Force the latest version on npm."],
            ["npx skill", "Singular typo — same package."],
          ].map(([cmd, note]) => (
            <div key={cmd} className="bg-bg border border-border rounded-lg px-4 py-2.5">
              <div><span className="text-accent select-none">$ </span><span className="text-text-main">{cmd}</span></div>
              <div className="text-[12px] text-text-muted font-sans mt-1">{note}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-text-main font-sans mb-3">How do I list installed skills?</h2>
        <p className="text-[14px] text-text-dim font-sans leading-relaxed mb-3">
          Skills install as SKILL.md files in your agent&apos;s skills directory. List them with your file explorer or:
        </p>
        <div className="bg-bg border border-border rounded-lg px-5 py-3 font-mono text-[13px]">
          <div><span className="text-accent select-none">$ </span><span className="text-text-main">ls .claude/skills</span><span className="text-text-muted">      # Claude Code</span></div>
          <div><span className="text-accent select-none">$ </span><span className="text-text-main">ls ~/openclaw/skills</span><span className="text-text-muted">   # OpenClaw</span></div>
          <div><span className="text-accent select-none">$ </span><span className="text-text-main">ls .cursor/skills</span><span className="text-text-muted">      # Cursor</span></div>
          <div><span className="text-accent select-none">$ </span><span className="text-text-main">ls .codex/skills</span><span className="text-text-muted">       # Codex</span></div>
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
      <JsonLd schema={breadcrumbSchema} />
      <JsonLd schema={howToSchema} />
      <JsonLd schema={faqSchema} />
    </div>
  );
}
