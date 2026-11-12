/** @type {import('tailwindcss').Config} */
// Colour tokens live in lib/palette.js (documented in DESIGN.md) so Tailwind
// classes and ECharts options can never drift apart.
const palette = require("./lib/palette");

module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        page: palette.page,
        panel: palette.panel,
        inset: palette.inset,
        line: palette.line,
        muted: palette.inkSecondary,
        accent: palette.accent,
        accentHover: palette.accentHover,
        accentSoft: palette.accentSoft,
        stock: palette.stock,
        crypto: palette.crypto,
        forecast: palette.forecast,
        up: palette.up,
        down: palette.down,
      },
      fontFamily: {
        sans: ["Inter", "Arial", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
    },
  },
  plugins: [],
};
