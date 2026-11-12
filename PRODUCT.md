# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: the lecturer grading the demo.** A first-time viewer with a few minutes, who must
  see the whole data story at a glance: data is collected → cleaned → explored → forecast, and
  understand what each chart says without the students narrating every panel.
- **Secondary: the two team members** (Lê Hải Nam, Nguyễn Thùy Linh) running the demo, taking
  screenshots for the report, and answering questions about the numbers.

## Product Purpose

Exam project for the course *Phân tích và Trực quan hóa dữ liệu*: a web dashboard that collects
daily/hourly prices of 15 Vietnamese stocks (Vietcap) and 10 crypto pairs (Binance), cleans them,
supports exploratory data analysis, and compares two forecasting models (ARIMA, XGBoost) against
a Naive baseline. Success = the lecturer can follow the analysis end to end and verify that every
number shown is computed from the collected data.

## Positioning

Built on the group's earlier research project (NCKH, repo Ennela/NCKH-CryptographicAnalysis), so
the data pipeline, cleaning audit trail and a locked, reproducible benchmark are real and running,
not mock-ups. Retraining reproduces the reported metrics digit for digit.

## Operating Context

- Live demo on a laptop (Docker stack, `localhost:3001`).
- The lecturer may also scan a QR code to open a deployed copy on a phone; the deployment target
  and domain are **not decided yet**.
- Screenshots of the pages go into the written report.

## Capabilities and Constraints

- Pages: Tổng quan, Dữ liệu & Phân tích, Khám phá dữ liệu (EDA), Thu thập & Làm sạch, Dự báo AI,
  Giải thích mô hình.
- Models in scope: ARIMA(1,1,1) and XGBoost, always shown against the Naive baseline
  (`predicted_close = current_close`). GRU and Random Forest were removed from scope.
- Stack fixed by AGENTS.md: Next.js (TypeScript) + ECharts frontend, FastAPI backend.
- Interface language: Vietnamese only.

## Evidence on Hand

- Real collected data in TimescaleDB: 25 tickers, daily since 05–06/2024, hourly crypto.
- Locked benchmark results in `docs/experiment_report.md` (ACB 1d, 78 test sessions): ARIMA RMSE
  0.3882, XGBoost 0.6484, Naive 0.3902.
- No user testimonials, usage metrics or trading results exist; never fabricate them.

## Product Principles

1. **Every number is traceable.** Show where a figure comes from (endpoint, formula, sample size)
   rather than asserting it.
2. **The baseline is always in view.** A model result is only meaningful next to Naive.
3. **Explain, don't decorate.** Each chart carries a one-line reading of what it shows.
4. **Honest about limits.** Forecasts are academic output, not investment advice; small samples
   and data gaps are stated, not hidden.

## Accessibility & Inclusion

- Readable on a laptop screen and on a phone opened via QR code (mobile layout is required).
- Charts must not rely on color alone; legends or labels identify series.
