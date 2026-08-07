## Contents

- 7. Figma-to-Code Workflow
- Handoff Checklist
- Token Transform Pipeline (DTCG → CSS/TS)

## 7. Figma-to-Code Workflow

### Handoff Checklist

| Step | Tool (2026) | Action |
|------|-------------|--------|
| Token source of truth | **Native Figma variables** (Dev Mode → Variables) or **Tokens Studio** plugin | Author colors/spacing/typography as variables with light/dark modes |
| Token export | Tokens Studio (→ GitHub/JSON sync) or Figma Variables REST API / Dev Mode "Export variables" | Emit **DTCG** JSON (`$value`/`$type`) |
| Component specs | Figma **Dev Mode** | Inspect spacing, colors, typography; copy values as CSS vars |
| Code linkage | Figma **Code Connect** | Map a Figma component to its real `<Button />` so Dev Mode shows your code |
| Asset export | Dev Mode → SVG/PNG, or SVGR for React icons | Export icons/images |
| Responsive behavior | Figma auto-layout | Map to flex/grid CSS |
| Interaction specs | Figma prototyping | Document hover, active, focus states |

> The old standalone **"Figma Tokens"** plugin was renamed **Tokens Studio** years ago. For simple systems, **native Figma variables** (with the Variables REST API or Dev Mode export) are now enough and need no plugin; reach for Tokens Studio when you want themes, math/aliasing, and Git two-way sync.

### Token Transform Pipeline (DTCG → CSS/TS)

Tokens Studio and Figma variables export the **Design Tokens Community Group (DTCG)** format (a community group draft, not a W3C standard). Style Dictionary v4+ consumes it natively and outputs platform files. For a **Tailwind v4** target, emit a `@theme {}` block instead of `:root` so tokens become utilities automatically (see §1).

```bash
npm i -D style-dictionary
npx style-dictionary build --config style-dictionary.config.mjs
```

```js
// style-dictionary.config.mjs  (Style Dictionary v4+, ESM)
import StyleDictionary from 'style-dictionary';

// Custom format: wrap CSS variables in @theme {} for Tailwind v4.
StyleDictionary.registerFormat({
  name: 'css/tailwind-theme',
  format: ({ dictionary }) =>
    `@import "tailwindcss";\n\n@theme {\n` +
    dictionary.allTokens.map((t) => `  --${t.name}: ${t.value};`).join('\n') +
    `\n}\n`,
});

export default {
  source: ['tokens/**/*.json'],
  // Style Dictionary v4+ parses DTCG $value/$type natively; no preprocessor needed for plain DTCG.
  platforms: {
    tailwind: {
      transformGroup: 'css',
      buildPath: 'src/tokens/',
      files: [{ destination: 'theme.css', format: 'css/tailwind-theme' }],
    },
    // Legacy/v3 or non-Tailwind: plain :root variables
    css: {
      transformGroup: 'css',
      buildPath: 'src/tokens/',
      files: [{ destination: 'variables.css', format: 'css/variables' }],
    },
    js: {
      transformGroup: 'js',
      buildPath: 'src/tokens/',
      files: [{ destination: 'tokens.ts', format: 'javascript/es6' }],
    },
  },
};
```

> Style Dictionary v4 ships with `@tokens-studio/sd-transforms` support; install it (`npm i -D @tokens-studio/sd-transforms`) and register its transforms/preprocessor if your tokens use Tokens Studio math, references, or typography composites.

---
