"use client";

import EChart, { CHART_THEME } from "@/components/echart";
import palette from "@/lib/palette";

export interface PricePoint {
  label: string;
  value: number;
}

/** Market colour of the actual-price line (DESIGN.md: one market, one colour). */
export function marketColor(assetClass: string): string {
  return assetClass === "crypto" ? palette.crypto : palette.stock;
}

/**
 * Actual close as a solid line in the market's colour and the model forecast
 * as a dashed Forecast Amber line that starts at the last close.
 */
export default function ForecastChart({ history, forecast, assetClass }: { history: PricePoint[]; forecast: PricePoint[]; assetClass: string }) {
  const color = marketColor(assetClass);
  const labels = [...history.map((p) => p.label), ...forecast.map((p) => p.label)];
  const actual = [...history.map((p) => p.value), ...forecast.map(() => null)];
  const predicted: (number | null)[] = history.map(() => null);
  if (history.length > 0 && forecast.length > 0) {
    predicted[history.length - 1] = history[history.length - 1].value;
  }
  predicted.push(...forecast.map((p) => p.value));

  const option = {
    backgroundColor: "transparent",
    animationDuration: 400,
    tooltip: { trigger: "axis", ...CHART_THEME.tooltip },
    grid: { left: 60, right: 24, top: 20, bottom: 70 },
    xAxis: {
      type: "category",
      data: labels,
      boundaryGap: false,
      axisLine: CHART_THEME.axisLine,
      axisLabel: CHART_THEME.axisLabel,
    },
    yAxis: {
      type: "value",
      scale: true,
      axisLine: CHART_THEME.axisLine,
      axisLabel: CHART_THEME.axisLabel,
      splitLine: CHART_THEME.splitLine,
    },
    dataZoom: [
      { type: "inside", start: 55, end: 100 },
      { type: "slider", start: 55, end: 100, bottom: 16, height: 22, textStyle: { color: palette.inkMuted }, borderColor: palette.line },
    ],
    series: [
      {
        name: "Giá thực tế",
        type: "line",
        data: actual,
        showSymbol: false,
        lineStyle: { color, width: 2 },
        itemStyle: { color },
        areaStyle: { color: `${color}14` },
      },
      {
        name: "Giá dự báo",
        type: "line",
        data: predicted,
        showSymbol: true,
        symbolSize: 6,
        connectNulls: false,
        lineStyle: { color: palette.forecast, width: 2.5, type: "dashed" },
        itemStyle: { color: palette.forecast },
      },
    ],
  };

  return <EChart option={option} notMerge style={{ height: "100%", width: "100%" }} />;
}

/** HTML legend: actual line in the market colour, forecast dashed amber. */
export function ForecastLegend({ assetClass }: { assetClass: string }) {
  return (
    <div className="flex w-fit flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-inset px-4 py-2.5 text-sm text-slate-300">
      <span className="flex items-center gap-2">
        <span className="inline-block h-[3px] w-7 rounded" style={{ background: marketColor(assetClass) }} aria-hidden /> Giá thực tế
      </span>
      <span className="flex items-center gap-2">
        <span className="inline-block w-7 border-t-[3px] border-dashed border-forecast" aria-hidden /> Giá dự báo
      </span>
    </div>
  );
}
