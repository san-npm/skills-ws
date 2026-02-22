"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Skill } from "@/lib/skills";
import { categoryColors } from "@/lib/skills";

export default function SkillsGrid({
  skills,
  categories,
}: {
  skills: Skill[];
  categories: string[];
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        document.getElementById("search-input")?.focus();
      }
      if (e.key === "Escape" && e.target instanceof HTMLInputElement && e.target.id === "search-input") {
        setSearch("");
        e.target.blur();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const filtered = skills.filter((s) => {
    const matchFilter = filter === "all" || s.category === filter;
    const matchSearch =
      !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <>
      <div className="mb-8">
        <input
          id="search-input"
          type="text"
          placeholder="Search skills...  /"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-bg-card border border-border rounded-lg px-5 py-3.5 text-text-main font-mono text-sm outline-none transition-colors focus:border-accent placeholder:text-text-muted"
          autoComplete="off"
        />
      </div>

      <div className="flex gap-2 mb-8 flex-wrap">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-md font-mono text-sm border transition-all cursor-pointer ${
            filter === "all"
              ? "border-accent text-accent bg-accent/5"
              : "border-border text-text-dim hover:border-border-hover hover:text-text-main bg-bg-card"
          }`}
        >
          All ({skills.length})
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-4 py-2 rounded-md font-mono text-sm border transition-all cursor-pointer capitalize ${
              filter === cat
                ? "border-accent text-accent bg-accent/5"
                : "border-border text-text-dim hover:border-border-hover hover:text-text-main bg-bg-card"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            No skills found
          </div>
        ) : (
          filtered.map((skill, i) => (
            <Link
              key={skill.name}
              href={`/skills/${skill.name}`}
              className="bg-bg-card border border-border rounded-xl px-6 py-5 grid grid-cols-[1fr_auto] items-start gap-4 transition-all hover:border-border-hover hover:bg-bg-hover hover:-translate-y-px no-underline text-inherit animate-fade-in"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="text-base font-semibold text-text-main font-sans">
                    {skill.name}
                  </span>
                  <span className="text-[11px] text-text-muted font-mono">
                    v{skill.version}
                  </span>
                </div>
                <div className="text-[13px] text-text-dim leading-relaxed font-sans">
                  {skill.description}
                </div>
                <div className="flex items-center gap-4 mt-2.5">
                  <span className="text-[11px] text-text-muted font-mono">
                    {(skill.installs ?? 0).toLocaleString()} installs
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-text-muted font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500/70" />
                    VT clean
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 sm:min-w-fit">
                <span
                  className={`text-[11px] uppercase tracking-wide font-medium px-2.5 py-1 rounded ${
                    categoryColors[skill.category]?.text ?? "text-text-dim"
                  } ${categoryColors[skill.category]?.bg ?? "bg-border/10"}`}
                >
                  {skill.category}
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </>
  );
}
