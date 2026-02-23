import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const BASE_URL = "https://skills.ws";

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "skills.ws — Agent Skills for AI Coding Assistants",
    template: "%s | skills.ws",
  },
  description:
    "58 agent skills for AI coding assistants. Marketing, SEO, growth, analytics, CRO, and operations. Install with npx skills-ws. Built for OpenClaw, Claude Code, Cursor, and Codex.",
  keywords: [
    "AI skills",
    "agent skills",
    "SKILL.md",
    "Claude Code skills",
    "OpenClaw skills",
    "Cursor skills",
    "Codex skills",
    "AI coding assistant",
    "marketing automation",
    "SEO optimization",
    "growth hacking",
    "conversion rate optimization",
    "GEO optimization",
    "generative engine optimization",
    "AI tools",
    "npx skills-ws",
  ],
  authors: [{ name: "Commit Media", url: "https://openletz.com" }],
  creator: "Commit Media",
  publisher: "Commit Media",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: BASE_URL,
    siteName: "skills.ws",
    title: "skills.ws — Agent Skills for AI Coding Assistants",
    description:
      "58 agent skills for AI coding assistants. Marketing, SEO, growth, analytics, and CRO. Install with a single command.",
    images: [
      {
        url: `${BASE_URL}/og.png`,
        width: 1200,
        height: 630,
        alt: "skills.ws — Agent Skills for AI Coding Assistants",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "skills.ws — Agent Skills for AI",
    description:
      "58 agent skills for marketing, SEO, growth, and CRO. Install with npx skills-ws.",
    creator: "@3615crypto",
    images: [`${BASE_URL}/og.png`],
  },
  alternates: {
    canonical: BASE_URL,
  },
  category: "technology",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
  other: {
    "google-site-verification": "",
    "msvalidate.01": "",
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
      <head>
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-SJXHDFFKMD" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-SJXHDFFKMD');`,
          }}
        />
      </head>
      <body className="font-mono min-h-screen overflow-x-hidden relative">
        <nav className="sticky top-0 z-50 bg-bg/80 backdrop-blur-md border-b border-border">
          <div className="max-w-[900px] mx-auto px-6 flex items-center justify-between h-12">
            <Link
              href="/"
              className="text-sm font-semibold text-text-main hover:text-accent transition-colors font-sans"
            >
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

        {/* Organization Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Commit Media",
              url: "https://openletz.com",
              sameAs: ["https://github.com/san-npm"],
            }),
          }}
        />

        {/* WebSite Schema with SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "skills.ws",
              url: BASE_URL,
              description:
                "Agent skills for AI coding assistants. Marketing, SEO, growth, analytics, and conversion optimization.",
              publisher: {
                "@type": "Organization",
                name: "Commit Media",
                url: "https://openletz.com",
              },
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: `${BASE_URL}/?q={search_term_string}`,
                },
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />

        {/* SoftwareApplication Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "skills-ws",
              applicationCategory: "DeveloperApplication",
              operatingSystem: "Any",
              url: BASE_URL,
              downloadUrl: "https://www.npmjs.com/package/skills-ws",
              softwareVersion: "1.0.4",
              description:
                "CLI tool to install agent skills for AI coding assistants. 58 skills for marketing, SEO, growth, analytics, and CRO.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              author: {
                "@type": "Organization",
                name: "Commit Media",
                url: "https://openletz.com",
              },
            }),
          }}
        />

        {/* BreadcrumbList Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Home",
                  item: BASE_URL,
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: "Skills",
                  item: `${BASE_URL}/#skills`,
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: "Docs",
                  item: `${BASE_URL}/docs`,
                },
                {
                  "@type": "ListItem",
                  position: 4,
                  name: "CLI",
                  item: `${BASE_URL}/cli`,
                },
              ],
            }),
          }}
        />

        <Analytics />
      </body>
    </html>
  );
}
