"use client";

import dynamic from "next/dynamic";
import palette from "@/lib/palette";

/**
 * ECharts renders into a canvas that only exists in the browser, so the
 * component is loaded client-side only (avoids hydration mismatches).
 */
const EChart = dynamic(() => import("echarts-for-react"), {
  ssr: false,
  loading: () => <div className="h-full w-full animate-pulse rounded bg-inset" />,
});

export default EChart;

/** Shared axis/tooltip styling matching the slate palette. */
export const CHART_THEME = {
  axisLine: { lineStyle: { color: palette.line } },
  axisLabel: { color: palette.inkMuted, fontSize: 11 },
  splitLine: { lineStyle: { color: palette.grid, type: "dashed" as const } },
  tooltip: {
    backgroundColor: palette.page,
    borderColor: palette.line,
    textStyle: { color: palette.ink, fontSize: 12 },
  },
};
