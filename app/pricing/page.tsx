import type { Metadata } from "next";
import Link from "next/link";
import FaqAccordion from "@/components/FaqAccordion";

const BASE_URL = "https://skills.ws";

export const metadata: Metadata = {
  title: "Pricing — MCP Tools for AI Agents",
  description:
    "MCP tools for AI agents: Screenshot, WHOIS, DNS, SSL, OCR, and Blockchain lookups. Free tier with 10 calls/day, Pro at $9/mo unlimited, or pay-per-call with crypto micropayments.",
  alternates: { canonical: `${BASE_URL}/pricing` },
  openGraph: {
    title: "Pricing — MCP Tools for AI Agents",
    description:
      "MCP tools for AI agents. Free tier, Pro unlimited, or pay-per-call with crypto micropayments via x402.",
    url: `${BASE_URL}/pricing`,
    siteName: "skills.ws",
    images: [{ url: `${BASE_URL}/og.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pricing — MCP Tools | skills.ws",
    description:
      "Screenshot, WHOIS, DNS, SSL, OCR & Blockchain tools for AI agents. Free, Pro, or pay-per-call.",
  },
};

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Get started with no commitment",
    cta: "Start Free",
    ctaHref: "https://mcp.skills.ws",
    highlight: false,
    features: [
      { label: "10 calls per day", included: true },
      { label: "All 6 MCP tools", included: true },
      { label: "IP-based rate limiting", included: true },
      { label: "Community support", included: true },
      { label: "API key", included: false },
      { label: "Unlimited calls", included: false },
    ],
  },
  {
    name: "Pro",
    price: "$9",
    period: "/month",
    description: "For teams and power users",
    cta: "Get Pro",
    ctaHref: "https://mcp.skills.ws/pro",
    highlight: true,
    features: [
      { label: "Unlimited calls", included: true },
      { label: "All 6 MCP tools", included: true },
      { label: "Dedicated API key", included: true },
      { label: "Email support", included: true },
      { label: "Priority rate limits", included: true },
      { label: "Usage dashboard", included: true },
    ],
  },
  {
    name: "Pay-Per-Call",
    price: "$0.005",
    period: "/call",
    description: "Crypto micropayments via x402",
    cta: "Learn More",
    ctaHref: "https://mcp.skills.ws/x402",
    highlight: false,
    features: [
      { label: "No subscription needed", included: true },
      { label: "All 6 MCP tools", included: true },
      { label: "USDC / USDT payments", included: true },
      { label: "Base & Celo chains", included: true },
      { label: "x402 protocol", included: true },
      { label: "Pay only for what you use", included: true },
    ],
  },
];

const tools = [
  {
    name: "Screenshot",
    description: "Capture full-page screenshots of any URL",
    icon: "📸",
  },
  {
    name: "WHOIS",
    description: "Domain registration and ownership lookup",
    icon: "🔍",
  },
  {
    name: "DNS",
    description: "DNS record queries — A, AAAA, MX, TXT, NS, CNAME",
    icon: "🌐",
  },
  {
    name: "SSL",
    description: "SSL/TLS certificate inspection and validation",
    icon: "🔒",
  },
  {
    name: "OCR",
    description: "Extract text from images and documents",
    icon: "📄",
  },
  {
    name: "Blockchain",
    description: "On-chain data lookups for EVM-compatible networks",
    icon: "⛓",
  },
];

const faqs: { q: string; a: string }[] = [
  {
    q: "When should I use Free vs Pro vs Pay-Per-Call?",
    a: "Free is great for trying out the tools or light personal use (up to 10 calls/day). Pro is best for teams or workflows that need unlimited access with a predictable monthly cost. Pay-Per-Call is ideal if you have unpredictable usage patterns or prefer not to commit to a subscription — you only pay for what you use, with crypto micropayments.",
  },
  {
    q: "Which blockchain networks are supported for Pay-Per-Call?",
    a: "Pay-Per-Call uses the x402 protocol and supports USDC and USDT stablecoins on Base and Celo networks. Both are low-cost L2/L1 chains with fast finality, so transaction fees are minimal.",
  },
  {
    q: "Can I switch between plans?",
    a: "Yes. You can upgrade from Free to Pro at any time. If you're on Pro and want to switch to Pay-Per-Call (or vice versa), just stop your subscription and start using x402 payments. There's no lock-in.",
  },
  {
    q: "What is x402?",
    a: "x402 is an open protocol for HTTP-native micropayments. When you make an API call, the server responds with a 402 Payment Required status and payment details. Your client automatically sends a small crypto payment and retries the request. No accounts, no API keys — just pay and use.",
  },
  {
    q: "Is there a refund policy?",
    a: "Pro subscriptions can be cancelled at any time and you'll retain access until the end of your billing period. Pay-Per-Call transactions are final since they're on-chain micropayments, but at $0.005 per call the risk is minimal.",
  },
  {
    q: "Are these the same tools as the agent skills?",
    a: "No. Agent skills (installed via npx skills-ws) are free SKILL.md files that teach your AI agent new capabilities. MCP tools (at mcp.skills.ws) are hosted API services — Screenshot, WHOIS, DNS, SSL, OCR, and Blockchain — that your agent can call as MCP tool servers. Skills are free forever. MCP tools have the pricing tiers shown above.",
  },
];

const mcpConfig = `{
  "mcpServers": {
    "skills-ws": {
      "url": "https://mcp.skills.ws/sse"
    }
  }
}`;

const pricingSchema = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "MCP Tools Pricing",
  description:
    "Pricing for MCP tools: Screenshot, WHOIS, DNS, SSL, OCR, and Blockchain. Free, Pro, and Pay-Per-Call tiers.",
  url: `${BASE_URL}/pricing`,
  mainEntity: {
    "@type": "Product",
    name: "MCP Tools",
    description: "MCP tool servers for AI agents",
    brand: { "@type": "Organization", name: "Commit Media" },
    offers: tiers.map((t) => ({
      "@type": "Offer",
      name: t.name,
      price: t.name === "Free" ? "0" : t.name === "Pro" ? "9" : "0.005",
      priceCurrency: "USD",
      description: t.description,
    })),
  },
};

export default function PricingPage() {
  return (
    <div className="max-w-[900px] mx-auto px-4 sm:px-6 py-16">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold font-sans text-text-main mb-3">
          MCP Tools Pricing
        </h1>
        <p className="text-[15px] text-text-dim font-sans max-w-lg mx-auto leading-relaxed">
          Hosted tool servers for AI agents. Screenshot, WHOIS, DNS, SSL, OCR,
          and Blockchain — connect via MCP and start calling.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`relative bg-bg-card rounded-xl p-6 flex flex-col ${
              tier.highlight
                ? "border-2 border-accent"
                : "border border-border"
            }`}
          >
            {tier.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-bg text-[11px] font-bold font-sans px-3 py-1 rounded-full">
                RECOMMENDED
              </span>
            )}
            <div className="mb-4">
              <h2 className="text-lg font-semibold font-sans text-text-main">
                {tier.name}
              </h2>
              <p className="text-[13px] text-text-dim font-sans mt-1">
                {tier.description}
              </p>
            </div>
            <div className="mb-6">
              <span className="text-3xl font-bold font-sans text-text-main">
                {tier.price}
              </span>
              <span className="text-text-dim text-sm font-sans ml-1">
                {tier.period}
              </span>
            </div>
            <ul className="space-y-2.5 mb-6 flex-1">
              {tier.features.map((f) => (
                <li
                  key={f.label}
                  className="flex items-center gap-2.5 text-[13px] font-sans"
                >
                  <span
                    className={`shrink-0 text-sm ${
                      f.included ? "text-accent" : "text-text-muted"
                    }`}
                  >
                    {f.included ? "✓" : "—"}
                  </span>
                  <span
                    className={
                      f.included ? "text-text-dim" : "text-text-muted"
                    }
                  >
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>
            <a
              href={tier.ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`block text-center text-[13px] font-semibold font-sans py-2.5 rounded-lg transition-colors ${
                tier.highlight
                  ? "bg-accent text-bg hover:bg-accent-dim"
                  : "bg-bg border border-border text-text-main hover:border-accent hover:text-accent"
              }`}
            >
              {tier.cta}
            </a>
          </div>
        ))}
      </div>

      {/* Tools Table */}
      <section className="mb-16">
        <h2 className="text-xl font-bold font-sans text-text-main mb-2 text-center">
          All Tools Included in Every Plan
        </h2>
        <p className="text-[13px] text-text-dim font-sans text-center mb-6">
          Every tier gives you access to all 6 MCP tools.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {tools.map((tool) => (
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
      </section>

      {/* MCP Config Snippet */}
      <section className="mb-16">
        <h2 className="text-xl font-bold font-sans text-text-main mb-2 text-center">
          Quick Setup
        </h2>
        <p className="text-[13px] text-text-dim font-sans text-center mb-4">
          Add this to your MCP client config to connect:
        </p>
        <div className="bg-bg border border-border rounded-xl p-5 font-mono text-[13px] text-text-main overflow-x-auto max-w-lg mx-auto">
          <pre>{mcpConfig}</pre>
        </div>
        <p className="text-[12px] text-text-muted font-sans text-center mt-3">
          Works with Claude Code, Cursor, Codex, and any MCP-compatible client.
        </p>
      </section>

      {/* FAQ */}
      <section className="mb-16">
        <h2 className="text-xl font-bold font-sans text-text-main mb-6 text-center">
          Pricing FAQ
        </h2>
        <div className="max-w-[700px] mx-auto">
          <FaqAccordion faqs={faqs} />
        </div>
      </section>

      {/* Back to home */}
      <div className="text-center">
        <Link
          href="/"
          className="text-[13px] text-text-dim hover:text-accent transition-colors font-sans"
        >
          ← Back to skills.ws
        </Link>
      </div>

      {/* Schema.org */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(pricingSchema).replace(/</g, "\\u003c"),
        }}
      />
    </div>
  );
}
