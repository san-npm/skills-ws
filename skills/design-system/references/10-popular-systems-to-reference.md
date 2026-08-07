## Contents

- 10. Popular Systems to Reference
- shadcn/ui Pattern (Recommended Starting Point)

## 10. Popular Systems to Reference

| System | Approach | Best for |
|--------|----------|----------|
| **shadcn/ui** | Copy-paste components (Radix + Tailwind) via a CLI registry; you own the code | Full control, custom design systems on Tailwind |
| **Radix Primitives** | Unstyled, accessible behavior primitives | Hand-styled custom systems |
| **React Aria Components** (Adobe) | Unstyled, behavior + a11y; the deepest keyboard/i18n/screen-reader coverage | A11y-critical or i18n-heavy products |
| **Base UI** | Unstyled primitives from the Radix/MUI/Floating-UI teams | Newer alternative to Radix; framework-styled systems |
| **Headless UI** | Unstyled components from the Tailwind team | Small Tailwind-first projects |
| **Ark UI** | Headless, framework-agnostic (Zag.js state machines) | React + Vue + Solid from one source |
| **Mantine** | Full-featured styled components + hooks | Feature-rich apps, fast delivery |
| **Chakra UI** | Styled components + theme system | Rapid development, themeable apps |

### shadcn/ui Pattern (Recommended Starting Point)

```bash
# Initializes components.json, the cn() util, and a Tailwind-aware setup.
npx shadcn@latest init
npx shadcn@latest add button card dialog input
```

shadcn/ui generates components directly into your project — you own the code, there is no runtime dependency to upgrade. It works with Tailwind v4 (init scaffolds the CSS-first setup) and React 19. The CLI is also a **registry**: you can publish your own `registry.json` and `add` components from a private URL, which is how teams distribute an internal design system without an npm publish step. The path to a custom system:
1. Start with shadcn/ui components.
2. Customize tokens (`@theme`) and CVA variants to match your brand.
3. Add custom components following the same `cn()` + CVA + Radix patterns.
4. Extract into a shared package (§9) — or your own shadcn registry — when reused across apps.
