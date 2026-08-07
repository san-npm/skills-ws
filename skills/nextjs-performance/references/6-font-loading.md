## 6. Font Loading

```tsx
// app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google';
import localFont from 'next/font/local';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });
const mono = JetBrains_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-mono' });

const brand = localFont({
  src: [
    { path: './fonts/Brand-Regular.woff2', weight: '400' },
    { path: './fonts/Brand-Bold.woff2', weight: '700' },
  ],
  display: 'swap',
  variable: '--font-brand',
  adjustFontFallback: 'Arial',
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} ${brand.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

```css
/* globals.css */
:root {
  --font-sans: var(--font-inter), system-ui, sans-serif;
  --font-mono: var(--font-mono), 'Courier New', monospace;
}
body { font-family: var(--font-sans); }
code { font-family: var(--font-mono); }
```

---
