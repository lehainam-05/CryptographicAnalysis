"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Brain, Database, DownloadCloud, Eraser, LineChart, ScanSearch, Sparkles } from "lucide-react";
import {
  describeApiError,
  fetchJobs,
  fetchModels,
  fetchStats,
  type JobLogEntry,
  type ModelInfo,
  type SymbolStats,
} from "@/lib/api";
import { formatDate, formatNum, formatPct, formatPrice } from "@/lib/format";
import { AssetBadge, PageHeader, Panel, StatCard, StateBox } from "@/components/ui";

// The numbering is the real pipeline order, so it stays (DESIGN.md: numbered titles).
const FLOW = [
  { href: "/pipeline", icon: DownloadCloud, title: "1. Thu thập", text: "Celery lấy giá cổ phiếu VN từ Vietcap và crypto từ Binance theo lịch, lưu bản thô." },
  { href: "/pipeline", icon: Eraser, title: "2. Làm sạch", text: "Chuẩn hóa giờ UTC, loại trùng, điền phiên thiếu, gắn cờ ngoại lai theo IQR." },
  { href: "/analysis", icon: LineChart, title: "3. Phân tích", text: "Thống kê mô tả và chỉ báo (SMA, RSI, MACD) cho từng mã." },
  { href: "/eda", icon: ScanSearch, title: "4. Khám phá", text: "Phân phối lợi suất, tương quan, biến động, mùa vụ trên cả 25 mã." },
  { href: "/forecast", icon: Sparkles, title: "5. Dự báo", text: "ARIMA và XGBoost, luôn so với baseline Naive." },
];
const MODELS_IN_SCOPE = ["arima", "xgboost"];
const BENCHMARK_SERIES = "ACB_1d";

const median = (values: number[]): number | null => {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export default function OverviewPage() {
  const [daily, setDaily] = useState<SymbolStats[]>([]);
  const [hourly, setHourly] = useState<SymbolStats[]>([]);
  const [models, setModels] = useState<ModelInfo[] | null>(null);
  const [jobs, setJobs] = useState<JobLogEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Registry and job log are best-effort: an MLflow outage must not hide market data.
      const [d, h, m, j] = await Promise.all([
        fetchStats("1d"),
        fetchStats("1h"),
        fetchModels().catch(() => null),
        fetchJobs(20).catch(() => null),
      ]);
      setDaily(d);
      setHourly(h);
      setModels(m);
      setJobs(j);
    } catch (err) {
      setError(describeApiError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tickers = new Set([...daily, ...hourly].map((s) => s.ticker));
  const stockCount = new Set([...daily, ...hourly].filter((s) => s.asset_class === "stock").map((s) => s.ticker)).size;
  const totalBars = [...daily, ...hourly].reduce((sum, s) => sum + s.bars, 0);
  const scopedModels = (models ?? []).filter((m) => MODELS_IN_SCOPE.some((name) => m.model_name.endsWith(`_${name}`)));
  const finishedJobs = (jobs ?? []).filter((j) => j.status === "success" || j.status === "failed");
  const jobSuccess = finishedJobs.length
    ? (100 * finishedJobs.filter((j) => j.status === "success").length) / finishedJobs.length
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng quan hệ thống"
        description="Hệ thống thu thập, làm sạch, phân tích và dự báo giá cổ phiếu Việt Nam và tiền mã hóa — mọi số liệu dưới đây đọc trực tiếp từ cơ sở dữ liệu qua Inference API."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {FLOW.map(({ href, icon: Icon, title, text }) => (
          <Link key={title} href={href} className="panel group flex flex-col gap-2 p-4 transition-colors hover:border-accentSoft">
            <div className="flex items-center justify-between text-white">
              <span className="flex items-center gap-2 font-semibold">
                <Icon className="h-5 w-5 text-accentSoft" /> {title}
              </span>
              <ArrowRight className="h-4 w-4 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-accentSoft" />
            </div>
            {/* Phones show the step names only, so the numbers stay within the first screens. */}
            <p className="hidden text-sm leading-relaxed text-slate-300 sm:block">{text}</p>
          </Link>
        ))}
      </div>

      {error ? (
        <Panel>
          <StateBox kind="error" message="Không tải được dữ liệu tổng quan" hint={error} onRetry={load} />
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Mã theo dõi"
              value={loading ? "…" : String(tickers.size)}
              hint={loading ? "Đang tải…" : `${stockCount} cổ phiếu VN · ${tickers.size - stockCount} crypto`}
              icon={<Database className="h-5 w-5 text-slate-400" aria-hidden />}
            />
            <StatCard
              label="Nến đã lưu (đã làm sạch)"
              value={loading ? "…" : formatNum(totalBars, 0)}
              hint={loading ? "Đang tải…" : `${formatNum(daily.reduce((s, x) => s + x.bars, 0), 0)} nến 1 ngày · ${formatNum(hourly.reduce((s, x) => s + x.bars, 0), 0)} nến 1 giờ`}
              icon={<Activity className="h-5 w-5 text-slate-400" aria-hidden />}
            />
            <StatCard
              label="Mô hình đã đăng ký"
              value={loading ? "…" : models ? String(scopedModels.length) : "—"}
              hint={loading ? "Đang tải…" : models ? "ARIMA và XGBoost trong MLflow Registry" : "Không kết nối được MLflow"}
              icon={<Brain className="h-5 w-5 text-slate-400" aria-hidden />}
            />
            <StatCard
              label="Job thành công (20 gần nhất)"
              value={loading ? "…" : jobSuccess === null ? "—" : `${formatNum(jobSuccess, 0)}%`}
              hint={loading ? "Đang tải…" : jobs === null ? "Không đọc được ops.job_log" : `${finishedJobs.length} job đã kết thúc`}
              icon={<DownloadCloud className="h-5 w-5 text-slate-400" aria-hidden />}
            />
          </div>

          {!loading && <FindingsPanel daily={daily} models={scopedModels} />}

          <Panel
            title="Bảng giá các mã (khung 1 ngày)"
            subtitle="Giá đóng cửa gần nhất, đáy/đỉnh và thay đổi trên toàn bộ lịch sử đã thu thập · cổ phiếu VN tính bằng nghìn đồng, crypto bằng USDT"
            bodyClassName="overflow-x-auto"
            actions={
              <Link href="/analysis" className="btn-secondary">
                Phân tích chi tiết <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          >
            {loading ? (
              <StateBox kind="loading" message="Đang tải thống kê…" />
            ) : daily.length === 0 ? (
              <StateBox kind="empty" message="Chưa có dữ liệu khung 1 ngày" hint="Chạy import snapshot hoặc ingestion để nạp dữ liệu." />
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Mã</th>
                    <th>Loại</th>
                    <th className="text-right">Giá cuối</th>
                    <th>Cập nhật</th>
                    <th className="text-right">Thấp nhất</th>
                    <th className="text-right">Cao nhất</th>
                    <th className="text-right">Thay đổi toàn kỳ</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {daily.map((s) => (
                    <tr key={s.ticker}>
                      <td className="font-bold text-white">{s.ticker}</td>
                      <td><AssetBadge assetClass={s.asset_class} /></td>
                      <td className="text-right font-mono">{formatPrice(s.last_close, s.asset_class)}</td>
                      <td className="text-slate-400">{formatDate(s.last_ts)}</td>
                      <td className="text-right font-mono">{formatPrice(s.lowest_low, s.asset_class)}</td>
                      <td className="text-right font-mono">{formatPrice(s.highest_high, s.asset_class)}</td>
                      <td className={`text-right font-mono ${(s.change_pct ?? 0) >= 0 ? "text-up" : "text-down"}`}>{formatPct(s.change_pct)}</td>
                      <td className="text-right">
                        <Link href={`/analysis?ticker=${s.ticker}&timeframe=1d`} className="text-xs text-accentSoft hover:underline">
                          Xem biểu đồ
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

/** Three conclusions a first-time viewer should leave with, each computed live and linked to its source page. */
function FindingsPanel({ daily, models }: { daily: SymbolStats[]; models: ModelInfo[] }) {
  const volatility = (market: string) =>
    median(daily.filter((s) => s.asset_class === market && s.return_std_pct !== null).map((s) => s.return_std_pct as number));
  const stockVol = volatility("stock");
  const cryptoVol = volatility("crypto");
  const metricsOf = (name: string) => models.find((m) => m.model_name === `${BENCHMARK_SERIES}_${name}`)?.metrics ?? null;
  const arima = metricsOf("arima");
  const xgboost = metricsOf("xgboost");
  const firstTs = daily.map((s) => s.first_ts).sort()[0];
  const lastTs = daily.map((s) => s.last_ts).sort().reverse()[0];

  return (
    <Panel title="Kết quả chính" subtitle="Tính trực tiếp từ dữ liệu đang có · bấm từng ô để xem chi tiết" bodyClassName="grid gap-3 p-4 lg:grid-cols-3">
      <Finding
        href="/pipeline"
        label="Dữ liệu ngày đã làm sạch"
        value={firstTs && lastTs ? `${formatDate(firstTs)} – ${formatDate(lastTs)}` : "—"}
        note={`${daily.length} mã khung 1 ngày, đã qua bước làm sạch.`}
      />
      <Finding
        href="/eda"
        label="Độ lệch chuẩn lợi suất ngày (trung vị)"
        value={stockVol !== null && cryptoVol !== null ? `${formatNum(stockVol, 2)}% · ${formatNum(cryptoVol, 2)}%` : "—"}
        note={
          stockVol && cryptoVol
            ? `Cổ phiếu VN · crypto: crypto biến động gấp ${formatNum(cryptoVol / stockVol, 1)} lần.`
            : "Cổ phiếu VN · crypto."
        }
      />
      <Finding
        href="/forecast"
        label="RMSE dự báo ACB, khung 1 ngày"
        value={arima && xgboost ? `${formatNum(arima.rmse, 3)} · ${formatNum(xgboost.rmse, 3)} · ${formatNum(arima.naive_rmse, 3)}` : "Chưa train"}
        note={
          arima && xgboost
            ? "ARIMA · XGBoost · Naive (nghìn đồng, 78 phiên test). Thấp hơn là tốt hơn."
            : "Train ARIMA và XGBoost cho ACB 1d để so với Naive."
        }
      />
    </Panel>
  );
}

function Finding({ href, label, value, note }: { href: string; label: string; value: string; note: string }) {
  return (
    <Link href={href} className="metric-box group flex flex-col gap-1">
      <span className="flex items-center justify-between gap-2 text-sm text-slate-300">
        {label}
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-500 transition-transform group-hover:translate-x-1 group-hover:text-accentSoft" aria-hidden />
      </span>
      <span className="font-mono text-lg font-semibold tabular-nums text-white">{value}</span>
      <span className="text-xs leading-relaxed text-slate-400">{note}</span>
    </Link>
  );
}
