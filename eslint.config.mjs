// Next.js 16 dropped `next lint`; ESLint runs directly with flat config.
// See https://nextjs.org/docs/app/api-reference/config/eslint
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    // Build artifacts + framework files
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Content directories — skills are markdown payload, not source
    "skills/**",
    "skills-data/**",
    "public/**",
    // Generated catalogs + audit notes + tooling scripts
    "skills.json",
    "scripts/**",
    ".audit/**",
  ]),
]);
