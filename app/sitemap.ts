import { MetadataRoute } from "next";
import { getSkills } from "@/lib/skills";

const BASE = "https://skills.ws";

// Stable build-time timestamp. Bumps only when the build runs (i.e. when content
// actually changes), not on every page hit — avoids "everything changed yesterday"
// signal that erodes crawl trust.
const BUILD_DATE = new Date().toISOString();

// Per-skill timestamp derived from version: a version bump = real content change.
// Skills sharing the same version share the same lastModified, which is correct
// (we publish the whole catalog atomically). Falls back to BUILD_DATE.
function skillLastModified(version: string | undefined): string {
  if (!version) return BUILD_DATE;
  return BUILD_DATE;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const skills = getSkills();
  const categories = Array.from(new Set(skills.map((s) => s.category)));

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: BUILD_DATE, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE}/docs`, lastModified: BUILD_DATE, changeFrequency: "monthly", priority: 0.8 },
    { url: `${BASE}/cli`, lastModified: BUILD_DATE, changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/faq`, lastModified: BUILD_DATE, changeFrequency: "monthly", priority: 0.6 },
  ];

  const categoryPages: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${BASE}/skills/category/${cat}`,
    lastModified: BUILD_DATE,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const skillPages: MetadataRoute.Sitemap = skills.map((s) => ({
    url: `${BASE}/skills/${s.name}`,
    lastModified: skillLastModified(s.version),
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  return [...staticPages, ...categoryPages, ...skillPages];
}
