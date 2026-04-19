'use client';

import { useEffect } from 'react';

// Registers skills.ws tool definitions via the WebMCP API
// (navigator.modelContext) so in-browser AI agents can search the skill
// catalog and open individual skills without scraping the UI.
// Spec: https://webmachinelearning.github.io/webmcp/

type ModelContext = {
  provideContext: (opts: { tools: WebMcpTool[] }) => void | Promise<void>;
};

type WebMcpTool = {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute: (input: Record<string, unknown>) => Promise<{ content: string }>;
};

type SkillMeta = {
  name: string;
  description: string;
  category: string;
};

let cachedSkills: SkillMeta[] | null = null;
async function loadSkills(): Promise<SkillMeta[]> {
  if (cachedSkills) return cachedSkills;
  const res = await fetch('/skills.json', { cache: 'force-cache' });
  if (!res.ok) return [];
  const data = await res.json();
  const skills: SkillMeta[] = (data.skills ?? []).map((s: SkillMeta) => ({
    name: s.name,
    description: s.description,
    category: s.category,
  }));
  cachedSkills = skills;
  return skills;
}

export default function WebMcpTools() {
  useEffect(() => {
    const nav = typeof navigator === 'undefined' ? null : navigator;
    const ctx = (nav as unknown as { modelContext?: ModelContext } | null)?.modelContext;
    if (!ctx?.provideContext) return;

    const tools: WebMcpTool[] = [
      {
        name: 'skills_ws_search',
        description:
          'Search the skills.ws catalog of agent skills by a keyword or category. Returns up to 20 matches with name, category and one-line description.',
        inputSchema: {
          type: 'object',
          required: ['query'],
          properties: {
            query: { type: 'string', description: 'Free-text query matched against name, description, and category.' },
            limit: { type: 'integer', minimum: 1, maximum: 50 },
          },
          additionalProperties: false,
        },
        execute: async ({ query, limit = 20 }) => {
          const skills = await loadSkills();
          const q = String(query).toLowerCase();
          const max = typeof limit === 'number' ? limit : 20;
          const matches = skills
            .filter(
              (s) =>
                s.name.toLowerCase().includes(q) ||
                s.description.toLowerCase().includes(q) ||
                s.category.toLowerCase().includes(q),
            )
            .slice(0, max)
            .map((s) => `- ${s.name} [${s.category}] — ${s.description}`)
            .join('\n');
          return {
            content: matches || `No skills matched "${query}".`,
          };
        },
      },
      {
        name: 'skills_ws_open',
        description:
          'Navigate to a skills.ws skill detail page by slug (e.g. "ab-testing"). The page includes the full SKILL.md body.',
        inputSchema: {
          type: 'object',
          required: ['name'],
          properties: {
            name: { type: 'string', description: 'Skill slug, as returned by skills_ws_search.' },
          },
          additionalProperties: false,
        },
        execute: async ({ name }) => {
          const slug = String(name).replace(/[^a-z0-9-]/gi, '').toLowerCase();
          window.location.href = `/skills/${slug}`;
          return { content: `Navigated to /skills/${slug}.` };
        },
      },
    ];

    void ctx.provideContext({ tools });
  }, []);

  return null;
}
