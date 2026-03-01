import dynamic from "next/dynamic";
import Link from "next/link";
import { getSkills, getCategories } from "@/lib/skills";
import InstallBox from "@/components/InstallBox";
import SkillsGrid from "@/components/SkillsGrid";
import NpmDownloads from "@/components/NpmDownloads";

const AsciiBackground = dynamic(() => import("@/components/AsciiBackground"), { ssr: false });

const ASCII = `███████╗██╗  ██╗██╗██╗     ██╗     ███████╗   ██╗    ██╗███████╗
██╔════╝██║ ██╔╝██║██║     ██║     ██╔════╝   ██║    ██║██╔════╝
███████╗█████╔╝ ██║██║     ██║     ███████╗   ██║ █╗ ██║███████╗
╚════██║██╔═██╗ ██║██║     ██║     ╚════██║   ██║███╗██║╚════██║
███████║██║  ██╗██║███████╗███████╗███████║██╗╚███╔███╔╝███████║
╚══════╝╚═╝  ╚═╝╚═╝╚══════╝╚══════╝╚══════╝╚═╝ ╚══╝╚══╝ ╚══════╝`;

const platforms = ["OpenClaw", "Claude Code", "Cursor", "Codex", "Gemini CLI"];

const howItWorks = [
  {
    step: "1",
    title: "Install",
    description: "One command to add skills to your project",
    code: "npx skills-ws",
  },
  {
    step: "2",
    title: "Choose",
    description: "Pick from 77 skills across 8 categories",
    code: "--skill seo-geo",
  },
  {
    step: "3",
    title: "Use",
    description: "Your AI agent gains instant expertise",
    code: "\"audit my SEO\"",
  },
];

const mcpTools = [
  { name: "Screenshot", description: "Capture full-page screenshots of any URL", icon: "📸" },
  { name: "WHOIS", description: "Domain registration and ownership lookup", icon: "🔍" },
  { name: "DNS", description: "DNS record queries — A, MX, TXT, NS", icon: "🌐" },
  { name: "SSL", description: "SSL/TLS certificate inspection", icon: "🔒" },
  { name: "OCR", description: "Extract text from images and documents", icon: "📄" },
  { name: "Blockchain", description: "On-chain data for EVM networks", icon: "⛓" },
];

const mcpConfig = `{
  "mcpServers": {
    "skills-ws": {
      "url": "https://mcp.skills.ws/sse"
    }
  }
}`;

export default function Home() {
  const skills = getSkills();
  const categories = getCategories();

  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6">
      {/* Hero */}
      <header className="pt-20 pb-6 text-center sm:pt-20 max-sm:pt-12 relative overflow-visible">
        <div className="absolute inset-0 -mx-4 sm:-mx-6 overflow-hidden pointer-events-none" style={{ height: "500px", top: "-40px" }}>
          <AsciiBackground />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0a0a0a]" />
        </div>
        <pre aria-hidden="true" className="relative z-10 text-[9px] leading-tight text-accent opacity-40 mb-6 overflow-x-auto max-sm:text-[6px]">
          {ASCII}
        </pre>
        <h1 className="relative z-10 font-sans text-2xl sm:text-3xl font-bold text-text-main mb-3">
          Agent Skills for AI Coding Assistants
        </h1>
        <p className="relative z-10 font-sans text-[15px] text-text-dim max-w-lg mx-auto leading-relaxed mb-6">
          Modular skill packs that teach your AI agent marketing, growth, SEO,
          web3, design, and dev workflows. Install with one command — no config needed.
        </p>
        <div className="relative z-10">
          <InstallBox command="npx skills-ws" />
        </div>

        {/* Supported Platforms */}
        <div className="relative z-10 flex justify-center gap-5 mt-8 flex-wrap">
          {platforms.map((p) => (
            <span key={p} className="text-[13px] text-text-dim flex items-center gap-1.5">
              <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-accent opacity-60" />
              {p}
            </span>
          ))}
        </div>
      </header>

      {/* Stats Bar */}
      <div className="relative z-10 flex justify-center gap-10 py-6 mb-8 border-y border-border max-sm:gap-6">
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
        <div className="text-center">
          <div className="text-[28px] font-bold font-sans max-sm:text-[22px]">
            <NpmDownloads />
          </div>
          <div className="text-xs text-text-muted mt-1">npm downloads</div>
        </div>
      </div>

      {/* How It Works */}
      <section className="relative z-10 mb-12">
        <h2 className="text-lg font-semibold font-sans text-text-main text-center mb-6">
          How It Works
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {howItWorks.map((item) => (
            <div
              key={item.step}
              className="bg-bg-card border border-border rounded-xl px-5 py-5 text-center"
            >
              <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/30 text-accent text-sm font-bold font-sans flex items-center justify-center mx-auto mb-3">
                {item.step}
              </div>
              <h3 className="text-[14px] font-semibold font-sans text-text-main mb-1">
                {item.title}
              </h3>
              <p className="text-[12px] text-text-dim font-sans mb-3">
                {item.description}
              </p>
              <code className="text-[11px] text-accent bg-bg border border-border rounded px-2 py-1">
                {item.code}
              </code>
            </div>
          ))}
        </div>
      </section>

      {/* Skills Grid */}
      <div className="relative z-10">
        <SkillsGrid skills={skills} categories={categories} />
      </div>

      {/* Security */}
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

      {/* MCP Tools Section */}
      <section className="mt-16 mb-12">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold font-sans text-text-main mb-2">
            MCP Tools
          </h2>
          <p className="text-[14px] text-text-dim font-sans max-w-md mx-auto leading-relaxed">
            Hosted tool servers your AI agent can call via MCP.
            Screenshot, DNS, WHOIS, SSL, OCR, and Blockchain lookups — ready to use.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {mcpTools.map((tool) => (
            <div
              key={tool.name}
              className="bg-bg-card border border-border rounded-xl px-5 py-4 hover:border-border-hover transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-lg">{tool.icon}</span>
                <h3 className="text-[14px] font-semibold font-sans text-text-main">
                  {tool.name}
                </h3>
              </div>
              <p className="text-[12px] text-text-dim font-sans leading-relaxed">
                {tool.description}
              </p>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-center gap-4">
          <Link
            href="/pricing"
            className="inline-block text-[13px] font-semibold font-sans bg-accent text-bg px-6 py-2.5 rounded-lg hover:bg-accent-dim transition-colors"
          >
            View Pricing
          </Link>
          <div className="bg-bg border border-border rounded-xl p-4 font-mono text-[12px] text-text-main overflow-x-auto max-w-md w-full">
            <div className="text-text-muted text-[11px] mb-2">MCP config:</div>
            <pre>{mcpConfig}</pre>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-12 border-t border-border mt-6">
        <p className="text-text-muted text-[13px] leading-8">
          Built by{" "}
          <a
            href="https://openletz.com"
            target="_blank"
            rel="noopener noreferrer"
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
            ["MCP Tools", "https://mcp.skills.ws"],
            ["Pricing", "/pricing"],
          ].map(([label, href]) => (
            <a
              key={label}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
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
