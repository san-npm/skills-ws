## UI (shadcn/ui)

```bash
pnpm dlx shadcn@latest add button dialog form input sonner data-table dropdown-menu
```

**Dark mode (Tailwind v4 — CSS-first, no `tailwind.config.ts`):** v4 is configured in CSS, not JS. Define the class-based `dark` variant in your global stylesheet, then drive the `.dark` class with `next-themes`. The old v3 `darkMode: 'class'` config key is gone.

```css
/* src/app/globals.css */
@import "tailwindcss";

/* class-based dark mode (matches shadcn/next-themes) */
@custom-variant dark (&:where(.dark, .dark *));

/* shadcn tokens live as CSS variables under :root and .dark */
```

```tsx
// src/app/layout.tsx — suppressHydrationWarning is required (theme set pre-hydration)
import { ThemeProvider } from 'next-themes';
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```
