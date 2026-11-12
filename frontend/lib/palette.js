// Single source of the colour tokens in DESIGN.md, shared by tailwind.config.js
// (CommonJS) and the ECharts options in TypeScript. Change a colour here only.
module.exports = {
  // Neutrals: page -> panel -> inset layering, 1px rules.
  page: "#0F172A",
  panel: "#1E293B",
  inset: "#172033",
  line: "#475569",
  grid: "#334155",
  ink: "#F8FAFC",
  inkSecondary: "#CBD5E1",
  inkMuted: "#94A3B8",
  // Interaction accent (controls only, never data).
  accent: "#2563EB",
  accentHover: "#1E40AF",
  accentSoft: "#3B82F6",
  // Data colours (charts, badges, legends only).
  stock: "#3B82F6",
  crypto: "#D97706",
  forecast: "#F59E0B",
  up: "#10B981",
  down: "#F43F5E",
  indicator: "#A78BFA",
};
