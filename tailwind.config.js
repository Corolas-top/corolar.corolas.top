/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        coro: {
          bg: "#050505",
          card: "#0a0a0a",
          elevated: "#111111",
          gold: "#c9a96e",
          "gold-10": "rgba(201,169,110,0.1)",
          "gold-30": "rgba(201,169,110,0.3)",
          "text-primary": "#f5f5f0",
          "text-secondary": "rgba(245,245,240,0.6)",
          "text-muted": "rgba(245,245,240,0.35)",
          border: "rgba(255,255,255,0.06)",
          "border-medium": "rgba(255,255,255,0.1)",
          success: "#4ade80",
          warning: "#fbbf24",
          error: "#f87171",
          info: "#60a5fa",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
