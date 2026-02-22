"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function SkillContent({ content }: { content: string }) {
  return (
    <div className="skill-content font-sans text-[14px] leading-relaxed text-text-dim">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold text-text-main mt-8 mb-4 font-sans">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-text-main mt-8 mb-3 font-sans">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-semibold text-text-main mt-6 mb-2 font-sans">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-text-main mt-4 mb-2 font-sans">{children}</h4>
          ),
          p: ({ children }) => <p className="mb-3">{children}</p>,
          ul: ({ children }) => <ul className="mb-4 space-y-1.5 list-none">{children}</ul>,
          ol: ({ children }) => <ol className="mb-4 space-y-1.5 list-decimal pl-5">{children}</ol>,
          li: ({ children }) => (
            <li className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-accent mt-2.5 shrink-0" />
              <span>{children}</span>
            </li>
          ),
          code: ({ className, children }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <code className="block bg-bg border border-border rounded-lg p-4 text-[13px] font-mono text-text-main overflow-x-auto mb-4">
                  {children}
                </code>
              );
            }
            return (
              <code className="bg-bg border border-border rounded px-1.5 py-0.5 text-[13px] font-mono text-accent">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="mb-4">{children}</pre>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" className="text-accent hover:underline">
              {children}
            </a>
          ),
          strong: ({ children }) => <strong className="text-text-main font-semibold">{children}</strong>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-accent/30 pl-4 my-4 text-text-muted italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-[13px] border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="text-left text-text-main font-semibold px-3 py-2 border-b border-border">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-border/50">{children}</td>
          ),
          hr: () => <hr className="border-border my-6" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
