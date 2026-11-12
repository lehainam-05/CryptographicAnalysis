"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { describeApiError, fetchEda, type EdaResponse, type ReturnDistribution } from "@/lib/api";
import { formatDate, formatNum } from "@/lib/format";
import EChart, { CHART_THEME } from "@/components/echart";
import { AssetBadge, ChartReading, Field, MetricRow, Num, PageHeader, Panel, StateBox } from "@/components/ui";
import palette from "@/lib/palette";

// Categorical identity per market, validated for CVD on the dark panel.
const MARKET_COLOR: Record<string, string> = { stock: palette.stock, crypto: palette.crypto };
const MARKET_LABEL: Record<string, string> = { stock: "Cổ phiếu VN", crypto: "Crypto" };
const NEUTRAL = palette.inkMuted;
// DESIGN.md: correlation is diverging blue → slate → rose; coverage is a dark-to-light blue ramp.
// Stock Blue, not Signal Blue, because this is data, not a control.
const DIVERGING = [palette.stock, palette.grid, palette.down];
const SEQUENTIAL = [palette.inset, "#1E3A8A", "#60A5FA"];
const LEGEND_TEXT = { color: palette.inkSecondary, fontSize: 11 };

const pct = (value: number | null | undefined, decimals = 2) =>
  value === null || value === undefined ? "—" : `${formatNum(value * 100, decimals)}%`;

const median = (values: number[]): number | null => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const mean = (values: number[]): number | null => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null);
const lastValue = (values: (number | null)[]): number | null => [...values].reverse().find((v): v is number => v !== null) ?? null;
const notNull = (values: (number | null)[]): number[] => values.filter((v): v is number => v !== null);

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
        description="So sánh cả 25 mã trên nến ngày: phân phối lợi suất, lợi suất tích lũy, độ biến động, tương quan, tính mùa vụ và độ phủ dữ liệu. Số liệu tính ở backend (pandas) từ dữ liệu đã làm sạch; dưới mỗi biểu đồ là một dòng đọc kết quả."
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
    legend: { data: ["Thực tế", "Phân phối chuẩn"], textStyle: LEGEND_TEXT, type: "scroll", top: 0 },
    grid: { left: 8, right: 16, top: 52, bottom: 8, containLabel: true },
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
      lineStyle: { width: 1.5, color: palette.inkSecondary }, itemStyle: { color: palette.inkSecondary },
    });
  }
  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", ...tooltip },
    legend: { textStyle: LEGEND_TEXT, type: "scroll", top: 0 },
    grid: { left: 8, right: 16, top: 52, bottom: 8, containLabel: true },
    xAxis: categoryAxis(data.cumulative_dates, { boundaryGap: false }),
    yAxis: { ...valueAxis("Chỉ số (gốc 100)"), scale: true },
    series,
  };
  const stockEnd = lastValue(series[0].data);
  const cryptoEnd = lastValue(series[1].data);
  const tickerEnd = index >= 0 ? lastValue(series[2].data) : null;
  const dates = data.cumulative_dates;
  return (
    <>
      <EChart option={option} style={{ height: 420 }} notMerge />
      <ChartReading>
        Bỏ 100 vào ngày {formatDate(dates[0])}, đến {formatDate(dates[dates.length - 1])} danh mục cổ phiếu VN bình quân còn{" "}
        <Num>{formatNum(stockEnd, 1)}</Num>, crypto bình quân <Num>{formatNum(cryptoEnd, 1)}</Num>
        {tickerEnd !== null && (
          <>
            , riêng {ticker} <Num>{formatNum(tickerEnd, 1)}</Num>
          </>
        )}
        . Đường crypto dao động mạnh hơn hẳn.
      </ChartReading>
    </>
  );
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
  const marketMedian = (m: string) => median(notNull(dists.filter((d) => d.asset_class === m).map((d) => d.annualized_volatility)));
  const stockMedian = marketMedian("stock");
  const cryptoMedian = marketMedian("crypto");
  const lowest = sorted[0];
  const highest = sorted[sorted.length - 1];
  return (
    <>
      <MarketLegend />
      <EChart option={option} style={{ height: 420 }} notMerge />
      <ChartReading>
        Trung vị độ biến động năm: cổ phiếu VN <Num>{pct(stockMedian, 1)}</Num>, crypto <Num>{pct(cryptoMedian, 1)}</Num>
        {stockMedian && cryptoMedian ? (
          <>
            {" "}(gấp <Num>{formatNum(cryptoMedian / stockMedian, 1)}</Num> lần)
          </>
        ) : null}
        . Thấp nhất {lowest?.ticker} <Num>{pct(lowest?.annualized_volatility, 1)}</Num>, cao nhất {highest?.ticker}{" "}
        <Num>{pct(highest?.annualized_volatility, 1)}</Num>.
      </ChartReading>
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
    series: [{ type: "heatmap", data: cells, itemStyle: { borderColor: palette.panel, borderWidth: 1 }, emphasis: { itemStyle: { borderColor: palette.ink, borderWidth: 1 } } }],
  };
  // Mean pairwise correlation (upper triangle, no diagonal) within and across markets.
  const pairs = (keep: (a: string, b: string) => boolean) =>
    mean(
      data.correlation.flatMap((row, i) =>
        row.flatMap((v, j) => (j > i && v !== null && keep(data.asset_classes[i], data.asset_classes[j]) ? [v] : [])),
      ),
    );
  const withinCrypto = pairs((a, b) => a === "crypto" && b === "crypto");
  const withinStock = pairs((a, b) => a === "stock" && b === "stock");
  const across = pairs((a, b) => a !== b);
  return (
    <>
      <EChart option={option} style={{ height: 620 }} notMerge />
      <ChartReading>
        Hồng: hai mã thường tăng/giảm cùng nhau · xanh: ngược chiều · xám: gần như không liên quan. Tương quan trung bình giữa các cặp crypto là{" "}
        <Num>{formatNum(withinCrypto, 2)}</Num>, giữa các cặp cổ phiếu VN <Num>{formatNum(withinStock, 2)}</Num>, còn giữa hai thị trường chỉ{" "}
        <Num>{formatNum(across, 2)}</Num>: crypto đi cùng nhau, hai thị trường gần như độc lập.
      </ChartReading>
    </>
  );
}

function WeekdayChart({ data }: { data: EdaResponse }) {
  const option = {
    backgroundColor: "transparent",
    tooltip: { trigger: "axis", ...tooltip, valueFormatter: (v: number | null) => (v === null ? "—" : `${v}%`) },
    legend: { textStyle: LEGEND_TEXT, type: "scroll", top: 0 },
    grid: { left: 8, right: 16, top: 52, bottom: 8, containLabel: true },
    xAxis: categoryAxis(data.weekday_labels),
    yAxis: valueAxis("%"),
    series: (["stock", "crypto"] as const).map((m) => ({
      name: MARKET_LABEL[m], type: "bar", barGap: "10%",
      data: data.weekday_mean_return[m].map((v) => (v === null ? null : Number((v * 100).toFixed(3)))),
      itemStyle: { color: MARKET_COLOR[m], borderRadius: 4 },
    })),
  };
  // Compare the weekday effect with the typical daily move of the same market.
  const largest = (m: "stock" | "crypto") => Math.max(0, ...notNull(data.weekday_mean_return[m]).map(Math.abs));
  const dailyStd = (m: string) => median(notNull(data.distributions.filter((d) => d.asset_class === m).map((d) => d.std)));
  return (
    <>
      <EChart option={option} style={{ height: 280 }} notMerge />
      <ChartReading>
        Lợi suất trung bình theo thứ chỉ nằm trong khoảng ±<Num>{pct(largest("stock"))}</Num> (cổ phiếu VN) và ±
        <Num>{pct(largest("crypto"))}</Num> (crypto), nhỏ hơn nhiều so với độ lệch chuẩn một ngày (<Num>{pct(dailyStd("stock"))}</Num> và{" "}
        <Num>{pct(dailyStd("crypto"))}</Num>), nên chưa đủ để kết luận có hiệu ứng thứ trong tuần.
      </ChartReading>
    </>
  );
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
  const hours = values.map((v, hour) => ({ v, hour })).filter((x): x is { v: number; hour: number } => x.v !== null);
  const best = hours.reduce<{ v: number; hour: number } | null>((acc, x) => (acc === null || x.v > acc.v ? x : acc), null);
  const worst = hours.reduce<{ v: number; hour: number } | null>((acc, x) => (acc === null || x.v < acc.v ? x : acc), null);
  return (
    <>
      <EChart option={option} style={{ height: 280 }} notMerge />
      {best && worst && (
        <ChartReading>
          Giờ có lợi suất trung bình cao nhất là <Num>{best.hour}h</Num> (<Num>{pct(best.v, 3)}</Num>), thấp nhất là <Num>{worst.hour}h</Num> (
          <Num>{pct(worst.v, 3)}</Num>). Chênh lệch rất nhỏ, chỉ mang tính mô tả, không phải quy luật giao dịch.
        </ChartReading>
      )}
    </>
  );
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
    series: [{ type: "heatmap", data: cells, itemStyle: { borderColor: palette.panel, borderWidth: 1 } }],
  };
  // Full months only: the first and last month of the range are partial by construction.
  const inner = (row: number[]) => row.slice(1, -1);
  const monthly = (m: string) => median(data.coverage.filter((_, i) => data.asset_classes[i] === m).flatMap(inner));
  const emptyInner = data.coverage.flatMap(inner).filter((v) => v === 0).length;
  return (
    <>
      <EChart option={option} style={{ height: 620 }} notMerge />
      <ChartReading>
        Bỏ tháng đầu và tháng cuối (chưa trọn tháng), trung vị mỗi tháng là <Num>{formatNum(monthly("stock"), 0)}</Num> phiên với cổ phiếu VN và{" "}
        <Num>{formatNum(monthly("crypto"), 0)}</Num> ngày với crypto;{" "}
        {emptyInner === 0 ? "không có tháng nào bị trống ở giữa giai đoạn." : <><Num>{emptyInner}</Num> ô (mã × tháng) bị trống ở giữa giai đoạn.</>}
      </ChartReading>
    </>
  );
}
