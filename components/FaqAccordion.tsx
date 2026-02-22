"use client";

import { useState, type ReactNode } from "react";

interface Faq {
  q: string;
  a: ReactNode;
}

export default function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      {faqs.map((faq, i) => (
        <div key={i} className="bg-bg-card border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full text-left px-6 py-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-bg-hover transition-colors"
          >
            <span className="text-[14px] font-sans font-medium text-text-main">{faq.q}</span>
            <span className="text-text-muted text-lg shrink-0 transition-transform duration-200" style={{ transform: open === i ? "rotate(45deg)" : "rotate(0deg)" }}>
              +
            </span>
          </button>
          <div
            className="overflow-hidden transition-all duration-200"
            style={{ maxHeight: open === i ? "500px" : "0px" }}
          >
            <div className="px-6 pb-4 text-[14px] text-text-dim font-sans leading-relaxed">
              {faq.a}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
