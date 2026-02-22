import type { Metadata } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "skills.ws — Agent Skills for AI Coding Assistants",
  description:
    "Agent skills for AI coding assistants. Marketing, growth, web3, design, and conversion optimization. Built for OpenClaw, Claude Code, Cursor, and Codex.",
  openGraph: {
    title: "skills.ws — Agent Skills for AI Coding Assistants",
    description: "Agent skills built for marketing, growth, and conversion. Install with a single command.",
    url: "https://skills-ws.vercel.app",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>/</text></svg>",
  },
};

const navLinks = [
  { label: "Skills", href: "/" },
  { label: "Docs", href: "/docs" },
  { label: "CLI", href: "/cli" },
  { label: "FAQ", href: "/faq" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-mono min-h-screen overflow-x-hidden relative">
        <nav className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border">
          <div className="max-w-[900px] mx-auto px-6 flex items-center justify-between h-12">
            <Link href="/" className="text-sm font-semibold text-text-main hover:text-accent transition-colors font-sans">
              skills.ws
            </Link>
            <div className="flex gap-5">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-[13px] text-text-dim hover:text-accent transition-colors font-sans"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
        <div className="relative z-10">{children}</div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "skills.ws",
              description: "Agent skills for AI coding assistants. Marketing, growth, conversion, and web3.",
              url: "https://skills-ws.vercel.app",
            }),
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}
