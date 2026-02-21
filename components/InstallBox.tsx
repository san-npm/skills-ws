"use client";

import { useState } from "react";

export default function InstallBox({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="inline-flex flex-col items-center">
      <button
        onClick={copy}
        className="inline-flex items-center gap-3 bg-bg-card border border-border rounded-lg px-5 py-3 cursor-pointer transition-all hover:border-accent hover:bg-accent/5"
      >
        <span className="text-accent select-none">$</span>
        <code className="text-text-main text-sm">{command}</code>
        <span className="text-text-muted text-xs select-none">
          {copied ? "✓" : "⌘C"}
        </span>
      </button>
      <span
        className={`text-accent text-sm mt-2 transition-opacity ${
          copied ? "opacity-100" : "opacity-0"
        }`}
      >
        copied ✓
      </span>
    </div>
  );
}
