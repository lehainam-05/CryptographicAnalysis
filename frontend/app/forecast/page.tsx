"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Play } from "lucide-react";
import {
  ApiError,
  describeApiError,
  fetchIndicators,
  fetchModels,
  fetchPrediction,
  registryName,
  type IndicatorPoint,
  type ModelInfo,
  type ModelName,
  type PredictResponse,
  type Timeframe,
} from "@/lib/api";
import { formatAxisTime, formatDate, formatNum, formatPct, formatPrice, timeframeLabel } from "@/lib/format";
import { readIndicators, TONE_CLASS } from "@/lib/insights";
import { useSymbols } from "@/lib/use-symbols";
import ForecastChart, { ForecastLegend } from "@/components/forecast-chart";
import { Badge, ChartReading, Field, FilterBar, MetricRow, Num, PageHeader, Panel, StateBox } from "@/components/ui";

const HISTORY_BARS = 120;
const STEP_OPTIONS = [1, 3, 5, 7, 14, 30];
const MODELS: ModelName[] = ["arima", "xgboost"];

const MODEL_INFO: Record<ModelName, { name: string; family: string; summary: string; caveat?: string }> = {
  arima: {
    name: "ARIMA",
    family: "Thống kê chuỗi thời gian",
    summary: "Mô hình tự hồi quy tích hợp trung bình trượt ARIMA(1, 1, 1) một biến trên giá đóng cửa; lấy sai phân bậc 1 để khử xu hướng, cập nhật trạng thái cuốn chiếu từng bước.",
  },
  xgboost: {
    name: "XGBoost",
    family: "Học máy — gradient boosting",
    summary: "Tập hợp cây quyết định tăng cường trên 19 đặc trưng kỹ thuật (lag, SMA, độ lệch, RSI, MACD, Bollinger, ATR); siêu tham số tối ưu bằng Optuna.",
    caveat: "Mô hình cây không ngoại suy được ra ngoài vùng giá đã thấy khi huấn luyện.",
  },
};

export default function ForecastPage() {
  const { symbols, ticker, setTicker, selected, error: symbolsError, reload: reloadSymbols } = useSymbols();
  const [modelName, setModelName] = useState<ModelName>("arima");
  const [timeframe, setTimeframe] = useState<Timeframe>("1d");
  const [steps, setSteps] = useState(5);

  const [history, setHistory] = useState<IndicatorPoint[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [forecast, setForecast] = useState<PredictResponse | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  const [models, setModels] = useState<ModelInfo[]>([]);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const assetClass = selected?.asset_class ?? "stock";
  // Only crypto has hourly data; switching to a stock resets the timeframe.
  useEffect(() => {
    if (assetClass !== "crypto") setTimeframe("1d");
  }, [assetClass]);

  const loadHistory = useCallback(async () => {
    if (!ticker) return;
    setHistoryLoading(true);
    setHistoryError(null);
    setForecast(null);
    setForecastError(null);
    try {
      setHistory((await fetchIndicators(ticker, timeframe, HISTORY_BARS)).points);
    } catch (err) {
      setHistory([]);
      setHistoryError(describeApiError(err));
    } finally {
      setHistoryLoading(false);
    }
  }, [ticker, timeframe]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const loadModels = useCallback(async () => {
    setModelsError(null);
    try {
      setModels(await fetchModels());
    } catch (err) {
      setModelsError(describeApiError(err));
    }
  }, []);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const runForecast = async () => {
    setForecastLoading(true);
    setForecastError(null);
    try {
      setForecast(await fetchPrediction(ticker, modelName, steps, timeframe));
    } catch (err) {
      setForecast(null);
      setForecastError(
        err instanceof ApiError && err.status === 503
          ? `Chưa có mô hình ${registryName(ticker, timeframe, modelName)} trong MLflow Registry. Huấn luyện bằng: docker compose run --rm training python -m services.training.train_${modelName} --ticker ${ticker} --timeframe ${timeframe}`
          : describeApiError(err)
      );
    } finally {
      setForecastLoading(false);
    }
  };

  const registry = models.find((m) => m.model_name === registryName(ticker, timeframe, modelName));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dự báo giá"
        description="Chạy mô hình ARIMA hoặc XGBoost đã huấn luyện (lưu trong MLflow Registry) trên dữ liệu thật, và luôn so sai số với baseline Naive “giá kỳ tới = giá kỳ này” trên cùng tập kiểm thử."
      />

      <FilterBar>
        <Field label="Tài sản mục tiêu">
          {symbolsError ? (
            <button onClick={reloadSymbols} className="btn-secondary h-[42px]">Lỗi tải danh sách — thử lại</button>
          ) : (
            <select className="field-select" value={ticker} onChange={(e) => setTicker(e.target.value)} disabled={symbols.length === 0}>
              {symbols.map((s) => (
                <option key={s.ticker} value={s.ticker}>{s.ticker} ({s.asset_class === "crypto" ? "Crypto" : "Cổ phiếu VN"})</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Mô hình huấn luyện">
          <select className="field-select" value={modelName} onChange={(e) => setModelName(e.target.value as ModelName)}>
            {MODELS.map((m) => (
              <option key={m} value={m}>{MODEL_INFO[m].name}</option>
            ))}
          </select>
        </Field>
        <Field label="Khung thời gian">
          <select className="field-select" value={timeframe} onChange={(e) => setTimeframe(e.target.value as Timeframe)}>
            <option value="1d">1 ngày</option>
            <option value="1h" disabled={assetClass !== "crypto"}>1 giờ (chỉ crypto)</option>
          </select>
        </Field>
        <Field label="Số bước dự báo">
          <select className="field-select" value={steps} onChange={(e) => setSteps(Number(e.target.value))}>
            {STEP_OPTIONS.map((n) => (
              <option key={n} value={n}>{n} {timeframe === "1h" ? "giờ" : "phiên"} tới</option>
            ))}
          </select>
        </Field>
        <button className="btn-primary" onClick={runForecast} disabled={forecastLoading || historyLoading || !ticker || history.length === 0}>
          {forecastLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Tiến hành dự báo
        </button>
      </FilterBar>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_400px] xl:grid-rows-[auto_auto]">
        <ChartPanel
          ticker={ticker}
          assetClass={assetClass}
          model={modelName}
          registry={registry}
          timeframe={timeframe}
          history={history}
          forecast={forecast}
          loading={historyLoading}
          error={historyError}
          forecastError={forecastError}
          onRetry={loadHistory}
        />
        <EvaluationPanel registry={registry} modelsError={modelsError} name={registryName(ticker, timeframe, modelName)} />
        <SummaryPanel model={modelName} history={history} />
      </div>

      {forecast && <ForecastTable forecast={forecast} lastClose={history[history.length - 1]?.close} assetClass={assetClass} timeframe={timeframe} />}
      <ComparisonTable models={models} ticker={ticker} timeframe={timeframe} />
    </div>
  );
}

function ChartPanel(props: {
  ticker: string;
  assetClass: string;
  model: ModelName;
  registry?: ModelInfo;
  timeframe: Timeframe;
  history: IndicatorPoint[];
  forecast: PredictResponse | null;
  loading: boolean;
  error: string | null;
  forecastError: string | null;
  onRetry: () => void;
}) {
  const { ticker, assetClass, model, registry, timeframe, history, forecast, loading, error, forecastError, onRetry } = props;
  const historyPoints = history.map((p) => ({ label: formatAxisTime(p.ts, timeframe), value: p.close }));
  const forecastPoints = (forecast?.predictions ?? []).map((p) => ({ label: formatAxisTime(p.target_time, timeframe), value: p.predicted_value }));

  return (
    <Panel
      className="xl:row-span-2"
      title={`1. Biểu đồ dự báo — ${ticker || "…"} (${timeframeLabel(timeframe)})`}
      subtitle={`Giá đóng cửa ${history.length} nến gần nhất · nét đứt: giá dự báo của ${MODEL_INFO[model].name}`}
      actions={<ForecastLegend assetClass={assetClass} />}
      bodyClassName="flex flex-col gap-3 p-4"
    >
      {forecastError && <div className="rounded border border-down/40 bg-down/10 px-3 py-2 text-sm text-rose-200">{forecastError}</div>}
      <div className="h-[460px] md:h-[560px] xl:h-[620px]">
        {loading ? (
          <StateBox kind="loading" message={`Đang tải dữ liệu ${ticker}…`} height="h-full" />
        ) : error ? (
          <StateBox kind="error" message="Không tải được dữ liệu lịch sử" hint={error} onRetry={onRetry} height="h-full" />
        ) : history.length === 0 ? (
          <StateBox kind="empty" message={`Chưa có dữ liệu khung ${timeframeLabel(timeframe)} cho ${ticker || "mã này"}`} height="h-full" />
        ) : (
          <ForecastChart history={historyPoints} forecast={forecastPoints} assetClass={assetClass} />
        )}
      </div>
      {!loading && !error && history.length > 0 && (
        <ForecastReading model={model} ticker={ticker} history={history} forecast={forecast} registry={registry} assetClass={assetClass} timeframe={timeframe} />
      )}
    </Panel>
  );
}

/** One-line reading under the forecast chart: the forecast move, then the test error against Naive. */
function ForecastReading(props: {
  model: ModelName;
  ticker: string;
  history: IndicatorPoint[];
  forecast: PredictResponse | null;
  registry?: ModelInfo;
  assetClass: string;
  timeframe: Timeframe;
}) {
  const { model, ticker, history, forecast, registry, assetClass, timeframe } = props;
  const name = MODEL_INFO[model].name;
  const lastClose = history[history.length - 1].close;
  const final = forecast?.predictions[forecast.predictions.length - 1]?.predicted_value;
  const m = registry?.metrics;
  const unit = timeframe === "1h" ? "giờ" : "phiên";
  return (
    <ChartReading>
      {forecast && final !== undefined ? (
        <>
          {name} dự báo {ticker} đi từ <Num>{formatPrice(lastClose, assetClass)}</Num> đến <Num>{formatPrice(final, assetClass)}</Num> (
          <Num>{formatPct((final / lastClose - 1) * 100)}</Num>) sau {forecast.predictions.length} {unit}.{" "}
        </>
      ) : (
        <>Bấm “Tiến hành dự báo” để vẽ đường dự báo của {name}. </>
      )}
      {m && m.naive_rmse ? (
        <>
          Trên tập test, RMSE của {name} là <Num>{formatNum(m.rmse, 4)}</Num> so với Naive <Num>{formatNum(m.naive_rmse, 4)}</Num>:{" "}
          {m.rmse < m.naive_rmse ? "tốt hơn" : "kém hơn"} <Num>{formatNum(Math.abs(1 - m.rmse / m.naive_rmse) * 100, 1)}%</Num>.
          {m.rmse >= m.naive_rmse && " Mô hình chưa thắng được cách đoán “giá kỳ tới = giá kỳ này”, nên đường dự báo chỉ mang tính minh họa."}
        </>
      ) : (
        <>Chưa có số liệu test của mô hình này để so với Naive.</>
      )}
    </ChartReading>
  );
}

/** "% tốt hơn Naive" note for an error metric (lower is better). */
function vsNaive(model: number, naive: number | null, decimals: number = 4): string {
  if (naive === null || naive === 0) return "Chưa có số liệu Naive cho run này";
  const gain = (1 - model / naive) * 100;
  return `Naive: ${formatNum(naive, decimals)} · ${gain >= 0 ? "tốt hơn" : "kém hơn"} ${formatNum(Math.abs(gain), 1)}%`;
}

function EvaluationPanel({ registry, modelsError, name }: { registry?: ModelInfo; modelsError: string | null; name: string }) {
  const m = registry?.metrics;
  return (
    <Panel title="2. Sai số trên tập test" subtitle="15% dữ liệu cuối, mô hình chưa từng thấy · thấp hơn là tốt hơn" bodyClassName="flex flex-col gap-2.5 p-4">
      {modelsError ? (
        <p className="text-sm text-down">Không đọc được MLflow Registry: {modelsError}</p>
      ) : !registry ? (
        <p className="text-sm text-slate-400">Chưa có <span className="font-mono">{name}</span> trong Registry.</p>
      ) : !m ? (
        <p className="text-sm text-slate-400">Run huấn luyện không ghi MAE/RMSE/MAPE.</p>
      ) : (
        <>
          <MetricRow label="RMSE" value={formatNum(m.rmse, 4)} note={vsNaive(m.rmse, m.naive_rmse)} />
          <MetricRow label="MAE" value={formatNum(m.mae, 4)} note={vsNaive(m.mae, m.naive_mae)} />
          <MetricRow label="MAPE" value={`${formatNum(m.mape, 3)}%`} note={vsNaive(m.mape, m.naive_mape, 3)} />
          <MetricRow
            label="Đúng chiều tăng/giảm"
            value={m.directional_accuracy === null ? "—" : `${formatNum(m.directional_accuracy * 100, 1)}%`}
            note="Tỷ lệ phiên đoán đúng hướng giá"
          />
          <p className="text-xs text-slate-400">
            <span className="font-mono">{registry.model_name}</span> · v{registry.version} · cập nhật {formatDate(registry.last_updated)}
          </p>
        </>
      )}
    </Panel>
  );
}

function SummaryPanel({ model, history }: { model: ModelName; history: IndicatorPoint[] }) {
  const info = MODEL_INFO[model];
  const insights = readIndicators(history);

  return (
    <Panel title="3. Mô hình & bối cảnh kỹ thuật" bodyClassName="flex flex-col gap-3 p-4">
      <div className="metric-box space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white">{info.name}</span>
          <Badge tone="slate">{info.family}</Badge>
        </div>
        <p className="text-sm leading-relaxed text-slate-300">{info.summary}</p>
        {info.caveat && (
          <p className="text-xs text-slate-300">
            <span className="font-semibold text-white">Lưu ý:</span> {info.caveat}
          </p>
        )}
      </div>
      <div className="metric-box space-y-2">
        <h3 className="font-semibold text-white">Chỉ báo tại nến gần nhất</h3>
        {insights.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa đủ dữ liệu để diễn giải.</p>
        ) : (
          <ul className="list-disc space-y-1.5 pl-4 text-sm leading-relaxed">
            {insights.map((item) => (
              <li key={item.text} className={TONE_CLASS[item.tone]}>{item.text}</li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}

function ForecastTable({ forecast, lastClose, assetClass, timeframe }: { forecast: PredictResponse; lastClose?: number; assetClass: string; timeframe: string }) {
  return (
    <Panel title="4. Kết quả dự báo từng bước" subtitle={`Tạo lúc ${formatDate(forecast.prediction_time, true)} · mô hình ${forecast.model_name}`} bodyClassName="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr>
            <th>Bước</th>
            <th>Thời điểm dự báo</th>
            <th className="text-right">Giá dự báo</th>
            <th className="text-right">So với giá đóng cửa cuối</th>
          </tr>
        </thead>
        <tbody>
          {forecast.predictions.map((p, i) => (
            <tr key={p.target_time}>
              <td>{i + 1}</td>
              <td className="font-mono text-xs">{formatDate(p.target_time, timeframe === "1h")}</td>
              <td className="text-right font-mono text-forecast">{formatPrice(p.predicted_value, assetClass)}</td>
              <td className="text-right font-mono">{lastClose ? formatPct((p.predicted_value / lastClose - 1) * 100) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  );
}

function ComparisonTable({ models, ticker, timeframe }: { models: ModelInfo[]; ticker: string; timeframe: Timeframe }) {
  const rows = MODELS.map((m) => ({ key: m, info: models.find((x) => x.model_name === registryName(ticker, timeframe, m)) }));
  const ratios = rows.map((r) => (r.info?.metrics?.naive_rmse ? r.info.metrics.rmse / r.info.metrics.naive_rmse : null));
  const best = Math.min(...ratios.filter((x): x is number => x !== null));
  // Naive errors are logged with every run on the same test split; take them from the first trained model.
  const naive = rows.map((r) => r.info?.metrics).find((m) => m && m.naive_rmse !== null) ?? null;

  return (
    <Panel
      title={`5. So sánh ARIMA, XGBoost và Naive — ${ticker} khung ${timeframeLabel(timeframe)}`}
      subtitle="Cùng tập test · RMSE / Naive < 1 nghĩa là mô hình tốt hơn cách đoán “giá kỳ tới = giá kỳ này”"
      bodyClassName="overflow-x-auto"
    >
      <table className="data-table whitespace-nowrap">
        <thead>
          <tr>
            <th>Mô hình</th>
            <th>Phiên bản</th>
            <th className="text-right">RMSE</th>
            <th className="text-right">RMSE Naive</th>
            <th className="text-right">RMSE / Naive</th>
            <th className="text-right">MAE</th>
            <th className="text-right">MAPE</th>
            <th className="text-right">Đúng chiều</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, info }, i) => {
            const m = info?.metrics;
            const ratio = ratios[i];
            return (
              <tr key={key}>
                <td className="font-semibold text-white">
                  {MODEL_INFO[key].name} {ratio !== null && ratio === best && ratio < 1 && <Badge tone="green">Tốt nhất</Badge>}
                </td>
                <td className="text-slate-400">{info ? `v${info.version}` : "chưa huấn luyện"}</td>
                <td className="text-right font-mono">{formatNum(m?.rmse, 4)}</td>
                <td className="text-right font-mono text-slate-400">{formatNum(m?.naive_rmse, 4)}</td>
                <td className={`text-right font-mono ${ratio !== null && ratio < 1 ? "font-semibold text-white" : ""}`}>{formatNum(ratio, 3)}</td>
                <td className="text-right font-mono">{formatNum(m?.mae, 4)}</td>
                <td className="text-right font-mono">{m ? `${formatNum(m.mape, 3)}%` : "—"}</td>
                <td className="text-right font-mono">{m?.directional_accuracy == null ? "—" : `${formatNum(m.directional_accuracy * 100, 1)}%`}</td>
              </tr>
            );
          })}
          {naive && (
            <tr>
              <td className="text-slate-300">Naive (baseline)</td>
              <td className="text-slate-400">giá kỳ trước</td>
              <td className="text-right font-mono">{formatNum(naive.naive_rmse, 4)}</td>
              <td className="text-right font-mono text-slate-400">{formatNum(naive.naive_rmse, 4)}</td>
              <td className="text-right font-mono">{formatNum(1, 3)}</td>
              <td className="text-right font-mono">{formatNum(naive.naive_mae, 4)}</td>
              <td className="text-right font-mono">{naive.naive_mape === null ? "—" : `${formatNum(naive.naive_mape, 3)}%`}</td>
              <td className="text-right font-mono">—</td>
            </tr>
          )}
        </tbody>
      </table>
    </Panel>
  );
}
