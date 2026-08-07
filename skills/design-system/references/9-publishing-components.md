## Contents

- 9. Publishing Components
- Package.json for Publishing
- Build with tsup

## 9. Publishing Components

### Package.json for Publishing

```json
{
  "name": "@myorg/ui",
  "version": "1.2.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    },
    "./styles.css": "./dist/styles.css"
  },
  "files": ["dist"],
  "sideEffects": ["**/*.css"],
  "peerDependencies": {
    "react": ">=18 <20",
    "react-dom": ">=18 <20"
  },
  "peerDependenciesMeta": {
    "react-dom": { "optional": false }
  },
  "scripts": {
    "build": "tsup",
    "prepublishOnly": "npm run build"
  }
}
```

> **React 19 support (stable since Dec 2024):** widen the peer range to `>=18 <20` so the package installs cleanly in React 19 apps. React 19 removed `propTypes`/`defaultProps` on function components, ships its own JSX runtime, and made `ref` a regular prop (so `forwardRef` is optional but still works — keep it for v18 compatibility). Verify your Radix/CVA deps have React 19 in *their* peer ranges before widening yours.

> **React Server Components:** a component library is consumed inside RSC trees. Any file using hooks, event handlers, or browser APIs (e.g. `ThemeToggle`, `Dialog`) must start with the `"use client"` directive, and your bundler must **preserve** that banner in the output — otherwise Next.js throws "You're importing a component that needs `useState`…". Purely presentational components (Button without `loading` state, Badge) can stay server-compatible.

### Build with tsup

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  // Externalize React AND the JSX runtimes so consumers dedupe a single copy.
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  treeshake: true,
  // Keep "use client" / "use server" directives in the emitted chunks (RSC-safe).
  banner: { js: '"use client";' }, // OR set esbuildOptions to preserve per-file directives
});
```

> If only *some* components are client components, don't blanket-banner the whole bundle. Instead split entries (e.g. `src/client.ts` + `src/server.ts`) or use a per-file directive-preserving plugin (`esbuild-plugin-preserve-directives`) so server-safe components stay in the RSC graph.

---
