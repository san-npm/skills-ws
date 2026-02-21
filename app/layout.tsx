import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "skills.ws — Agent Skills by Dr Clawdberg",
  description:
    "Curated agent skills for AI coding assistants. Marketing, web3, design, and conversion optimization skills for OpenClaw, Claude Code, Cursor, and Codex.",
  openGraph: {
    title: "skills.ws — Agent Skills by Dr Clawdberg",
    description: "Curated agent skills for AI coding assistants. Install with a single command.",
    url: "https://skills.ws",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🌟</text></svg>",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-mono min-h-screen overflow-x-hidden relative">
        <div className="relative z-10">{children}</div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "skills.ws",
              description: "Curated agent skills by Dr Clawdberg for AI coding assistants",
              url: "https://skills.ws",
            }),
          }}
        />
      </body>
    </html>
  );
}
