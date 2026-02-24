import type { Metadata } from "next";
import FaqAccordion from "@/components/FaqAccordion";

export const metadata: Metadata = {
  title: "FAQ — Agent Skills for AI",
  description:
    "Frequently asked questions about skills.ws — installation, security, compatibility, supported AI assistants, and how agent skills work with OpenClaw, Claude Code, Cursor, and Codex.",
  alternates: { canonical: "https://skills.ws/faq" },
};

const Code = ({ children }: { children: React.ReactNode }) => (
  <code className="bg-[#0a0a0a] border border-[#222] rounded px-1.5 py-0.5 text-[13px] font-mono text-[#00ff88]">{children}</code>
);

const faqs: { q: string; a: string | React.ReactElement; schemaA: string }[] = [
  {
    q: "What are agent skills?",
    a: "Agent skills are modular packages that give AI coding assistants specialized knowledge. Each skill is a SKILL.md file that teaches an agent how to handle a specific domain — marketing strategy, SEO auditing, conversion optimization, and more. Think of them as expertise plugins.",
    schemaA: "Agent skills are modular packages that give AI coding assistants specialized knowledge. Each skill is a SKILL.md file that teaches an agent how to handle a specific domain — marketing strategy, SEO auditing, conversion optimization, and more. Think of them as expertise plugins.",
  },
  {
    q: "Are these skills free?",
    a: "Yes. All skills are free and open source. Install them with a single command and use them in any compatible agent.",
    schemaA: "Yes. All skills are free and open source. Install them with a single command and use them in any compatible agent.",
  },
  {
    q: "Who built these skills?",
    a: <>All skills are built in-house by <a href="https://openletz.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Commit Media</a>. No third-party code, no community contributions mixed in. Every skill is written, tested, and maintained by us.</>,
    schemaA: "All skills are built in-house by Commit Media. No third-party code, no community contributions mixed in. Every skill is written, tested, and maintained by us.",
  },
  {
    q: "Are the skills secure?",
    a: "Yes. Every skill is scanned with VirusTotal (each skill page links to its scan report). There are no external runtime dependencies. Scripts read credentials from environment variables only — no hardcoded secrets. No eval(), exec(), or child_process patterns anywhere.",
    schemaA: "Yes. Every skill is scanned with VirusTotal (each skill page links to its scan report). There are no external runtime dependencies. Scripts read credentials from environment variables only — no hardcoded secrets. No eval(), exec(), or child_process patterns anywhere.",
  },
  {
    q: "Which AI assistants are supported?",
    a: "OpenClaw, Claude Code, Cursor, Codex, Gemini CLI, and any agent that supports the open SKILL.md standard. The skills are agent-agnostic — they work anywhere SKILL.md files are recognized.",
    schemaA: "OpenClaw, Claude Code, Cursor, Codex, Gemini CLI, and any agent that supports the open SKILL.md standard. The skills are agent-agnostic — they work anywhere SKILL.md files are recognized.",
  },
  {
    q: "How do I install skills?",
    a: <>Run <Code>npx skills-ws</Code> to install all skills, or add <Code>--skill name</Code> to install a specific one.</>,
    schemaA: "Run npx skills-ws to install all skills, or add --skill name to install a specific one.",
  },
  {
    q: "Can I install individual skills?",
    a: <>Yes. Use the --skill flag: <Code>npx skills-ws --skill seo-geo</Code></>,
    schemaA: "Yes. Use the --skill flag: npx skills-ws --skill seo-geo",
  },
  {
    q: "How often are skills updated?",
    a: "Skills are updated as frameworks evolve and based on real-world usage feedback. Each skill has a version number — check the skill page for the latest version.",
    schemaA: "Skills are updated as frameworks evolve and based on real-world usage feedback. Each skill has a version number — check the skill page for the latest version.",
  },
  {
    q: "Can I request a new skill?",
    a: <>Yes. Open an issue on <a href="https://github.com/san-npm/skills-ws/issues" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">GitHub</a> describing the skill you need and the use case.</>,
    schemaA: "Yes. Open an issue on GitHub (https://github.com/san-npm/skills-ws/issues) describing the skill you need and the use case.",
  },
  {
    q: "What categories are available?",
    a: "Currently: analytics, conversion, design, dev, growth, marketing, operations, and web3. We cover marketing, SEO, growth engineering, CRO, DevOps, security, and more.",
    schemaA: "Currently: analytics, conversion, design, dev, growth, marketing, operations, and web3. We cover marketing, SEO, growth engineering, CRO, DevOps, security, and more.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.schemaA,
    },
  })),
};

export default function FaqPage() {
  return (
    <div className="max-w-[700px] mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold font-sans text-text-main mb-8">Frequently Asked Questions</h1>
      <FaqAccordion faqs={faqs} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema).replace(/</g, "\\u003c") }}
      />
    </div>
  );
}
