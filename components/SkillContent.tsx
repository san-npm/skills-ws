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
            <h1 className="text-xl font-bold text-text-main mt-10 mb-4 font-sans">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-semibold text-text-main mt-10 mb-3 pb-2 border-b border-border/50 font-sans">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-[15px] font-semibold text-text-main mt-6 mb-2 font-sans">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-sm font-semibold text-text-main mt-4 mb-2 font-sans">{children}</h4>
          ),
          p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="mb-4 space-y-1.5 list-none">{children}</ul>,
          ol: ({ children }) => <ol className="mb-4 space-y-1.5 list-none">{children}</ol>,
          li: ({ children, ordered, index }: { children?: React.ReactNode; ordered?: boolean; index?: number }) => (
            <li className="flex items-start gap-2">
              {ordered ? (
                <span className="text-accent text-[12px] font-mono mt-0.5 shrink-0 min-w-[1.2em]">{(index ?? 0) + 1}.</span>
              ) : (
                <span className="w-1 h-1 rounded-full bg-accent mt-2.5 shrink-0" />
              )}
              <span className="flex-1 min-w-0">{children}</span>
            </li>
          ),
          code: ({ className, children }) => {
            if (className?.includes("language-")) {
              return (
                <code className="block bg-[#060606] border border-border rounded-lg p-4 text-[12px] font-mono text-text-main overflow-x-auto whitespace-pre leading-5">
                  {children}
                </code>
              );
            }
            return (
              <code className="bg-[#060606] border border-border/60 rounded px-1.5 py-0.5 text-[12px] font-mono text-accent break-all">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-4 overflow-x-auto [&>code]:block [&>code]:bg-[#060606] [&>code]:border [&>code]:border-border [&>code]:rounded-lg [&>code]:p-4 [&>code]:text-[12px] [&>code]:font-mono [&>code]:text-text-main [&>code]:whitespace-pre [&>code]:leading-5 [&>code]:break-normal">
              {children}
            </pre>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
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
            <div className="overflow-x-auto mb-5 rounded-lg border border-border">
              <table className="w-full text-[12px] border-collapse min-w-[500px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-[#0f0f0f]">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="text-left text-text-main font-semibold px-3 py-2.5 border-b border-border whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 border-b border-border/30 text-text-dim align-top">
              {children}
            </td>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-[#0a0a0a] transition-colors">{children}</tr>
          ),
          hr: () => <hr className="border-border my-8" />,
          input: ({ checked }) => (
            <span className={`inline-block w-3.5 h-3.5 rounded border mr-2 align-middle ${checked ? 'bg-accent border-accent' : 'border-border'}`}>
              {checked && <span className="block w-full h-full text-center text-[10px] text-bg leading-[14px]">✓</span>}
            </span>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
