import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#0a0a0a",
        "bg-card": "#111111",
        "bg-hover": "#1a1a1a",
        border: "#222222",
        "border-hover": "#333333",
        accent: "#00ff88",
        "accent-dim": "#00cc6a",
        "text-main": "#e0e0e0",
        "text-dim": "#666666",
        "text-muted": "#444444",
        "cat-purple": "#a78bfa",
        "cat-blue": "#60a5fa",
        "cat-pink": "#f472b6",
        "cat-teal": "#2dd4bf",
        "cat-orange": "#fb923c",
      },
      fontFamily: {
        mono: ["SF Mono", "Fira Code", "JetBrains Mono", "Cascadia Code", "monospace"],
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "system-ui", "sans-serif"],
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease forwards",
      },
    },
  },
  plugins: [],
};

export default config;
