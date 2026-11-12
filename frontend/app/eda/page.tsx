"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { describeApiError, fetchEda, type EdaResponse, type ReturnDistribution } from "@/lib/api";
import { formatNum } from "@/lib/format";
import EChart, { CHART_THEME } from "@/components/echart";
import { AssetBadge, Field, MetricRow, PageHeader, Panel, StateBox } from "@/components/ui";

// Categorical identity per market, validated for CVD on the dark panel (#1E293B).
const MARKET_COLOR: Record<string, string> = { stock: "#3B82F6", crypto: "#D97706" };
const MARKET_LABEL: Record<string, string> = { stock: "Cổ phiếu VN", crypto: "Crypto" };
const NEUTRAL = "#94A3B8";
// Diverging (correlation) and sequential (coverage) scales: one hue per side, gray midpoint.
const DIVERGING = ["#2563EB", "#334155", "#E11D48"];
const SEQUENTIAL = ["#172033", "#1E3A8A", "#60A5FA"];

const pct = (value: number | null | undefined, decimals = 2) =>
  value === null || value === undefined ? "—" : `${formatNum(value * 100, decimals)}%`;

const tooltip = { ...CHART_THEME.tooltip, confine: true };
const valueAxis = (name?: string) => ({
  type: "value" as const,
  name,
  nameTextStyle: { color: NEUTRAL, fontSize: 11, align: "left" as const },
  axisLine: CHART_THEME.axisLine,
  axisLabel: CHART_THEME.axisLabel,
  splitLine: CHART_THEME.splitLine,
});
const categoryAxis = (data: string[], extra: object = {}) => ({
  type: "category" as const,
  data,
  axisLine: CHART_THEME.axisLine,
  axisLabel: CHART_THEME.axisLabel,
  ...extra,
});

export default function EdaPage() {
  const [data, setData] = useState<EdaResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ticker, setTicker] = useState("ACB");

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await fetchEda());
    } catch (err) {
      setError(describeApiError(err));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const distribution = data?.distributions.find((d) => d.ticker === ticker) ?? data?.distributions[0];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Khám phá dữ liệu (EDA)"
        description="So sánh nhiều mã cùng lúc trên nến ngày: phân phối lợi suất, độ biến động, lợi suất tích lũy, tương quan, độ phủ dữ liệu và tính mùa vụ. Mọi số liệu tính bằng pandas ở API /api/v1/eda."
      />
      {error ? (
        <div className="panel"><StateBox kind="error" message={error} onRetry={load} /></div>
      ) : !data ? (
        <div className="panel"><StateBox kind="loading" message="Đang tính toán trên toàn bộ dữ liệu..." /></div>
      ) : (
        <>
          <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
            <Panel
              title="1. Phân phối lợi suất ngày"
              subtitle="Cột: số phiên theo khoảng lợi suất · đường đứt: phân phối chuẩn cùng trung bình và độ lệch chuẩn"
              actions={
                <Field label="Mã" className="min-w-[140px]">
                  <select className="field-select" value={distribution?.ticker} onChange={(e) => setTicker(e.target.value)}>
                    {data.tickers.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              }
            >
              {distribution && <DistributionChart dist={distribution} />}
            </Panel>
            {distribution && <MomentsPanel dist={distribution} />}
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="2. Lợi suất tích lũy theo thị trường" subtitle="Giá chuẩn hóa về 100 tại ngày chung đầu tiên, bình quân đều các mã trong mỗi thị trường">
              <CumulativeChart data={data} ticker={distribution?.ticker ?? ""} />
            </Panel>
            <Panel title="3. Độ biến động năm theo mã" subtitle="Độ lệch chuẩn lợi suất ngày × √252 (cổ phiếu) hoặc × √365 (crypto)">
              <VolatilityChart dists={data.distributions} />
            </Panel>
          </div>

          <Panel title="4. Ma trận tương quan lợi suất ngày" subtitle={`Pearson, tính trên ${data.correlation_days} ngày mà cả ${data.tickers.length} mã đều có giá`}>
            <CorrelationChart data={data} />
          </Panel>

          <div className="grid gap-6 xl:grid-cols-2">
            <Panel title="5a. Lợi suất trung bình theo thứ" subtitle="Giờ Việt Nam · lợi suất thứ 2 của cổ phiếu tính từ phiên thứ 6">
              <WeekdayChart data={data} />
            </Panel>
            <Panel title="5b. Lợi suất 1 giờ trung bình theo giờ trong ngày (crypto)" subtitle="Giờ Việt Nam, gộp 10 mã crypto khung 1 giờ">
              <HourlyChart values={data.hourly_mean_return} />
            </Panel>
          </div>

          <Panel title="6. Độ phủ dữ liệu theo tháng" subtitle="Số nến ngày mỗi tháng; ô tối = thiếu dữ liệu. Cổ phiếu ~20–23 phiên/tháng, crypto 28–31 ngày/tháng">
            <CoverageChart data={data} />
          </Panel>
        </>
      )}
    </div>
  );
}

function DistributionChart({ dist }: { dist: ReturnDistribution }) {
  const labels = dist.bin_centers.map((c) => pct(c, 1));
  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", ...tooltip },
    legend: { data: ["Thực tế", "Phân phối chuẩn"], textStyle: { color: "#CBD5E1", fontSize: 11 }, top: 0 },
    grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
    xAxis: categoryAxis(labels, { name: "Lợi suất ngày", nameLocation: "middle", nameGap: 28, nameTextStyle: { color: NEUTRAL } }),
    yAxis: valueAxis("Số phiên"),
    series: [
      { name: "Thực tế", type: "bar", data: dist.counts, barCategoryGap: "8%", itemStyle: { color: MARKET_COLOR[dist.asset_class], borderRadius: [4, 4, 0, 0] } },
      { name: "Phân phối chuẩn", type: "line", data: dist.normal_counts.map((v) => Number(v.toFixed(2))), smooth: true, symbol: "none", lineStyle: { color: NEUTRAL, width: 2, type: "dashed" } },
    ],
  };
  return <EChart option={option} style={{ height: 320 }} notMerge />;
}

function MomentsPanel({ dist }: { dist: ReturnDistribution }) {
  const kurt = dist.excess_kurtosis ?? 0;
  const skew = dist.skew ?? 0;
  return (
    <Panel title={dist.ticker} actions={<AssetBadge assetClass={dist.asset_class} />} bodyClassName="flex flex-col gap-2.5 p-4">
      <MetricRow label="Số phiên" value={dist.n.toLocaleString("vi-VN")} />
      <MetricRow label="Lợi suất TB/ngày" value={pct(dist.mean, 3)} />
      <MetricRow label="Độ lệch chuẩn/ngày" value={pct(dist.std)} />
      <MetricRow label="Độ biến động năm" value={pct(dist.annualized_volatility, 1)} />
      <MetricRow label="Độ lệch (skew)" value={formatNum(dist.skew, 2)} />
      <MetricRow label="Độ nhọn vượt chuẩn" value={formatNum(dist.excess_kurtosis, 2)} />
      <p className="mt-2 text-xs leading-relaxed text-slate-300">
        {kurt > 1
          ? `Độ nhọn ${formatNum(kurt, 1)} > 0: đuôi dày hơn phân phối chuẩn — các phiên tăng/giảm cực mạnh xảy ra thường xuyên hơn mô hình chuẩn dự đoán.`
          : "Độ nhọn gần 0: phân phối gần với phân phối chuẩn."}{" "}
        {Math.abs(skew) > 0.5 ? (skew > 0 ? "Lệch phải: có vài phiên tăng rất mạnh." : "Lệch trái: có vài phiên giảm rất mạnh.") : "Gần đối xứng."}
      </p>
    </Panel>
  );
}

/** Equal-weight mean of the rebased series of one market (nulls skipped). */
function marketAverage(data: EdaResponse, market: string): (number | null)[] {
  const rows = data.cumulative.filter((_, i) => data.asset_classes[i] === market);
  return data.cumulative_dates.map((_, col) => {
    const values = rows.map((r) => r[col]).filter((v): v is number => v !== null);
    return values.length ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)) : null;
  });
}

function CumulativeChart({ data, ticker }: { data: EdaResponse; ticker: string }) {
  const index = data.tickers.indexOf(ticker);
  const series = ["stock", "crypto"].map((m) => ({
    name: `${MARKET_LABEL[m]} (bình quân)`, type: "line", data: marketAverage(data, m), connectNulls: true, symbol: "none",
    lineStyle: { width: 2, color: MARKET_COLOR[m] }, itemStyle: { color: MARKET_COLOR[m] },
  }));
  if (index >= 0) {
    series.push({
      name: ticker, type: "line", data: data.cumulative[index].map((v) => (v === null ? null : Number(v.toFixed(2)))), connectNulls: true, symbol: "none",
      lineStyle: { width: 1.5, color: "#CBD5E1" }, itemStyle: { color: "#CBD5E1" },
    });
  }
  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", ...tooltip },
    legend: { textStyle: { color: "#CBD5E1", fontSize: 11 }, top: 0 },
    grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
    xAxis: categoryAxis(data.cumulative_dates, { boundaryGap: false }),
    yAxis: { ...valueAxis("Chỉ số (gốc 100)"), scale: true },
    series,
  };
  return <EChart option={option} style={{ height: 450 }} notMerge />;
}

function VolatilityChart({ dists }: { dists: ReturnDistribution[] }) {
  const sorted = [...dists].sort((a, b) => (a.annualized_volatility ?? 0) - (b.annualized_volatility ?? 0));
  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "item", ...tooltip, formatter: (p: { name: string; value: number }) => `${p.name}: ${formatNum(p.value, 1)}%/năm` },
    grid: { left: 8, right: 24, top: 8, bottom: 8, containLabel: true },
    xAxis: valueAxis("%/năm"),
    yAxis: categoryAxis(sorted.map((d) => d.ticker), { axisLabel: { ...CHART_THEME.axisLabel, interval: 0, fontSize: 10 } }),
    series: [{
      type: "bar", barCategoryGap: "25%",
      data: sorted.map((d) => ({ value: Number(((d.annualized_volatility ?? 0) * 100).toFixed(1)), itemStyle: { color: MARKET_COLOR[d.asset_class], borderRadius: [0, 4, 4, 0] } })),
    }],
  };
  return (
    <>
      <MarketLegend />
      <EChart option={option} style={{ height: 420 }} notMerge />
    </>
  );
}

function MarketLegend() {
  return (
    <div className="mb-2 flex gap-4 text-xs text-slate-300">
      {["stock", "crypto"].map((m) => (
        <span key={m} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: MARKET_COLOR[m] }} /> {MARKET_LABEL[m]}
        </span>
      ))}
    </div>
  );
}

function CorrelationChart({ data }: { data: EdaResponse }) {
  const cells = data.correlation.flatMap((row, i) => row.map((v, j) => [j, i, v === null ? "-" : Number(v.toFixed(2))]));
  const option = {
    backgroundColor: "transparent",
    tooltip: { ...tooltip, formatter: (p: { value: [number, number, number] }) => `${data.tickers[p.value[1]]} × ${data.tickers[p.value[0]]}: ${p.value[2]}` },
    grid: { left: 8, right: 16, top: 8, bottom: 56, containLabel: true },
    xAxis: categoryAxis(data.tickers, { axisLabel: { ...CHART_THEME.axisLabel, rotate: 60, fontSize: 10 }, splitArea: { show: false } }),
    yAxis: categoryAxis(data.tickers, { inverse: true, axisLabel: { ...CHART_THEME.axisLabel, fontSize: 10 } }),
    visualMap: { min: -1, max: 1, calculable: true, orient: "horizontal", left: "center", bottom: 0, itemHeight: 240, inRange: { color: DIVERGING }, textStyle: { color: NEUTRAL } },
    series: [{ type: "heatmap", data: cells, itemStyle: { borderColor: "#1E293B", borderWidth: 1 }, emphasis: { itemStyle: { borderColor: "#E2E8F0", borderWidth: 1 } } }],
  };
  return (
    <>
      <EChart option={option} style={{ height: 620 }} notMerge />
      <p className="mt-2 text-xs text-slate-400">Màu đỏ: hai mã thường tăng/giảm cùng nhau · xanh: ngược chiều · xám: gần như không liên quan. Các mã crypto tương quan mạnh với nhau; cổ phiếu VN tương quan vừa phải theo ngành; giữa hai thị trường gần như không có tương quan.</p>
    </>
  );
}

function WeekdayChart({ data }: { data: EdaResponse }) {
  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", ...tooltip, valueFormatter: (v: number | null) => (v === null ? "—" : `${v}%`) },
    legend: { textStyle: { color: "#CBD5E1", fontSize: 11 }, top: 0 },
    grid: { left: 8, right: 16, top: 32, bottom: 8, containLabel: true },
    xAxis: categoryAxis(data.weekday_labels),
    yAxis: valueAxis("%"),
    series: (["stock", "crypto"] as const).map((m) => ({
      name: MARKET_LABEL[m], type: "bar", barGap: "10%",
      data: data.weekday_mean_return[m].map((v) => (v === null ? null : Number((v * 100).toFixed(3)))),
      itemStyle: { color: MARKET_COLOR[m], borderRadius: 4 },
    })),
  };
  return <EChart option={option} style={{ height: 280 }} notMerge />;
}

function HourlyChart({ values }: { values: (number | null)[] }) {
  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", ...tooltip, valueFormatter: (v: number | null) => (v === null ? "—" : `${v}%`) },
    grid: { left: 8, right: 16, top: 16, bottom: 8, containLabel: true },
    xAxis: categoryAxis(values.map((_, h) => `${h}h`)),
    yAxis: valueAxis("%"),
    series: [{ name: "Crypto", type: "bar", data: values.map((v) => (v === null ? null : Number((v * 100).toFixed(4)))), itemStyle: { color: MARKET_COLOR.crypto, borderRadius: 4 } }],
  };
  return <EChart option={option} style={{ height: 280 }} notMerge />;
}

function CoverageChart({ data }: { data: EdaResponse }) {
  const cells = useMemo(() => data.coverage.flatMap((row, i) => row.map((v, j) => [j, i, v])), [data]);
  const option = {
    backgroundColor: "transparent",
    tooltip: { ...tooltip, formatter: (p: { value: [number, number, number] }) => `${data.tickers[p.value[1]]} · ${data.coverage_months[p.value[0]]}: ${p.value[2]} nến` },
    grid: { left: 8, right: 16, top: 8, bottom: 56, containLabel: true },
    xAxis: categoryAxis(data.coverage_months, { axisLabel: { ...CHART_THEME.axisLabel, rotate: 60, fontSize: 10 } }),
    yAxis: categoryAxis(data.tickers, { inverse: true, axisLabel: { ...CHART_THEME.axisLabel, fontSize: 10 } }),
    visualMap: { min: 0, max: 31, calculable: true, orient: "horizontal", left: "center", bottom: 0, itemHeight: 240, inRange: { color: SEQUENTIAL }, textStyle: { color: NEUTRAL } },
    series: [{ type: "heatmap", data: cells, itemStyle: { borderColor: "#1E293B", borderWidth: 1 } }],
  };
  return <EChart option={option} style={{ height: 620 }} notMerge />;
}
