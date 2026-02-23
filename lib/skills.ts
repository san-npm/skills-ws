import skillsData from "../skills.json";

export interface Skill {
  name: string;
  version: string;
  description: string;
  color: string;
  category: string;
  platforms: string[];
  features?: string[];
  useCases?: string[];
  content?: string;
  installs?: number;
}

export interface SkillsConfig {
  version: string;
  name: string;
  description: string;
  repository: string;
  website: string;
  skills: Skill[];
}

export function getSkills(): Skill[] {
  return (skillsData as SkillsConfig).skills;
}

export function getSkill(name: string): Skill | undefined {
  return getSkills().find((s) => s.name === name);
}

export function getCategories(): string[] {
  return Array.from(new Set(getSkills().map((s) => s.category)));
}

export const categoryColors: Record<string, { text: string; bg: string }> = {
  marketing: { text: "text-text-main", bg: "bg-cat-purple/10" },
  web3: { text: "text-text-main", bg: "bg-cat-blue/10" },
  design: { text: "text-text-main", bg: "bg-cat-pink/10" },
  conversion: { text: "text-text-main", bg: "bg-cat-teal/10" },
  dev: { text: "text-text-main", bg: "bg-cat-orange/10" },
  growth: { text: "text-text-main", bg: "bg-border/10" },
  analytics: { text: "text-text-main", bg: "bg-border/10" },
  operations: { text: "text-text-main", bg: "bg-border/10" },
};
