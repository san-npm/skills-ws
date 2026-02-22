import { MetadataRoute } from "next";
import { getSkills } from "@/lib/skills";

const BASE = "https://skills-ws.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const skills = getSkills();
  const now = new Date().toISOString();

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/docs`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/cli`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  const skillPages: MetadataRoute.Sitemap = skills.map((s) => ({
    url: `${BASE}/skills/${s.name}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  return [...staticPages, ...skillPages];
}
