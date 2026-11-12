# Hệ Thống Thu Thập, Phân Tích Trực Quan & Dự Báo Giá Cổ Phiếu & Tiền Số

Hệ thống tự động thu thập dữ liệu giá từ **thị trường chứng khoán Việt Nam** (vnstock) và **thị trường tiền mã hóa** (Binance), lưu trữ hiệu năng cao bằng **TimescaleDB**, huấn luyện các mô hình dự báo chuỗi thời gian (**ARIMA, XGBoost**, so với baseline Naive), quản lý vòng đời mô hình bằng **MLflow** và hiển thị trực quan thông qua ứng dụng **Next.js & ECharts** kết hợp giải thích mô hình bằng **SHAP**.

---

## Thành Viên Nhóm

Bài tập lớn môn **Phân tích và Trực quan hóa dữ liệu**.

| STT | Họ và Tên | Mã Sinh Viên |
|:---:|-----------|:------------:|
| 1 | **Lê Hải Nam** *(Nhóm trưởng)* | 23810310377 |
| 2 | Nguyễn Thùy Linh | 23810310378 |

## Nguồn Gốc Dự Án

Dự án được phát triển tiếp từ đồ án nghiên cứu khoa học
[Ennela/NCKH-CryptographicAnalysis](https://github.com/Ennela/NCKH-CryptographicAnalysis)
(benchmark bốn mô hình ARIMA, XGBoost, Random Forest, GRU) của nhóm:

| Họ và Tên | Mã Sinh Viên | Lớp |
|-----------|:------------:|:----:|
| Đỗ Quang Hà *(Chủ nhiệm đề tài)* | 23810310132 | D18CNPM2 |
| Nguyễn Văn Kiên | 23810310138 | D18CNPM2 |
| Khiếu Đình Trung Nguyên | 24810310401 | D19CNPM4 |
| Nguyễn Trọng Đại | 23810310120 | D18CNPM2 |
| Lê Hải Nam | 23810310377 | D18CNPM5 |
| Nguyễn Trọng Hiếu | 24810340513 | D19CNPM1 |

Hạ tầng thu thập dữ liệu, pipeline làm sạch, ARIMA, XGBoost và phần lớn giao
diện kế thừa từ đồ án gốc. Phạm vi của bài này: thu gọn còn ARIMA, XGBoost và
baseline Naive; bổ sung phân tích khám phá và trực quan hóa dữ liệu. Số liệu
benchmark trong [`docs/experiment_report.md`](docs/experiment_report.md) trích
từ đồ án gốc.

---

## 🛠️ Stack Công Nghệ

| Thành phần | Công nghệ |
|------------|-----------|
| **Backend** | Python 3.11 + FastAPI (Kiến trúc đa dịch vụ) |
| **Database** | PostgreSQL 16 + TimescaleDB (Hypertable cho chuỗi thời gian) |
| **Task Queue** | Redis + Celery & Celery Beat |
| **ML** | Statsmodels (ARIMA), XGBoost, scikit-learn, Optuna, MLflow |
| **Giải thích mô hình** | SHAP (SHapley Additive exPlanations) |
| **Frontend** | React 18 + Next.js (App Router, TypeScript) + Apache ECharts |
| **DevOps & CI/CD** | Docker & Docker Compose, GitHub Actions, Sentry |
| **Code Quality** | Ruff (lint & format), Pytest, pre-commit hooks |

---

## Cấu Trúc Thư Mục

```
NCKH/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                    # CI: Lint (Ruff) + Test (Pytest)
│   │   └── deploy.yml                # CD: Build & Deploy tự động
│   ├── CODEOWNERS                    # Phân quyền review theo thư mục
│   └── pull_request_template.md      # Template cho Pull Request
│
├── docs/
│   ├── architecture.md               # Tài liệu kiến trúc hệ thống & ERD
│   ├── api.md                        # Hợp đồng API (endpoints, request/response)
│   ├── dataset.md                    # Quy ước dataset nhóm & snapshot khóa
│   ├── experiment_report.md          # Báo cáo kết quả thí nghiệm ML
│   └── sprint-logs/                  # Nhật ký Agile/Scrum theo sprint
│
├── infra/
│   ├── postgres/init.sql             # Khởi tạo DB, TimescaleDB, Hypertables
│   └── nginx/templates/              # Reverse Proxy cho Production (xem docs/deploy.md)
│
├── configs/
│   └── group_dataset.json            # Contract dataset chính thức cho XGBoost
│
├── shared/                           # Package Python dùng chung (pip install -e .)
│   ├── config/settings.py            # Đọc cấu hình từ .env (pydantic-settings)
│   ├── dataset/                      # Truy cập snapshot khóa cho XGBoost
│   │   ├── __init__.py
│   │   └── loader.py                 # Đọc & xác thực snapshot theo contract
│   ├── db/
│   │   ├── models.py                 # SQLAlchemy ORM models (market schema)
│   │   ├── session.py                # Engine & Session factory
│   │   ├── mappers.py                # Object mappers (DB ↔ Pydantic)
│   │   ├── base.py                   # Declarative Base
│   │   └── repositories/             # Repository pattern cho truy vấn DB
│   ├── schemas/
│   │   ├── ohlcv.py                  # Schema OHLCV (Open-High-Low-Close-Volume)
│   │   └── predict.py                # Schema Request/Response cho dự báo
│   └── utils/
│       ├── logging.py                # Structured logging
│       ├── metrics.py                # Chỉ số kỹ thuật (RSI, MACD, Returns, Volatility)
│       └── timezone.py               # Xử lý múi giờ UTC
│
├── services/
│   ├── ingestion/                    # Dịch vụ THU THẬP dữ liệu
│   │   ├── adapters/
│   │   │   ├── binance_adapter.py    #   ↳ Adapter CCXT/Binance (crypto)
│   │   │   └── vnstock_adapter.py    #   ↳ Adapter vnstock (cổ phiếu VN)
│   │   ├── celery_app.py             # Cấu hình Celery worker & beat
│   │   ├── tasks.py                  # Celery tasks: lập lịch thu thập
│   │   ├── main.py                   # FastAPI health-check endpoint
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   ├── training/                     # Dịch vụ HUẤN LUYỆN mô hình
│   │   ├── models/
│   │   │   ├── arima_model.py        #   ↳ ARIMA baseline (statsmodels)
│   │   │   ├── xgboost_features.py   #   ↳ Bộ 19 feature riêng cho XGBoost
│   │   │   └── xgboost_model.py      #   ↳ XGBoost + SHAP
│   │   ├── data_loader.py            # Tải & chia dữ liệu cho luồng train.py
│   │   ├── train.py                  # Entrypoint chung cũ, giữ cho luồng legacy
│   │   ├── train_xgboost.py          # Entrypoint riêng cho XGBoost
│   │   ├── train_arima.py            # Entrypoint riêng cho ARIMA
│   │   ├── evaluate.py               # Đánh giá mô hình (MAE, RMSE, MAPE)
│   │   ├── mlflow_utils.py           # Tiện ích log MLflow
│   │   ├── Dockerfile
│   │   └── requirements.txt
│   │
│   └── inference/                    # Dịch vụ DỰ BÁO (API chính)
│       ├── main.py                   # FastAPI: /predict, /models, /symbols
│       ├── model_loader.py           # Load model từ MLflow Registry
│       ├── redis_cache.py            # Redis caching cho kết quả dự báo
│       ├── Dockerfile
│       └── requirements.txt
│
├── frontend/                         # Ứng dụng WEB (Next.js + TypeScript)
│   ├── app/
│   │   ├── page.tsx                  # Trang chủ (Dashboard)
│   │   ├── layout.tsx                # Layout chung
│   │   ├── forecast/page.tsx         # Trang dự báo giá
│   │   ├── symbols/page.tsx          # Trang danh sách mã chứng khoán/crypto
│   │   └── explainability/           # Trang giải thích mô hình SHAP
│   ├── components/
│   │   ├── chart.tsx                 # Component biểu đồ ECharts
│   │   └── navbar.tsx                # Thanh điều hướng
│   ├── Dockerfile
│   └── package.json
│
├── scripts/
│   ├── backfill.py                   # Backfill dữ liệu lịch sử
│   └── seed_db.py                    # Seed dữ liệu mẫu vào DB
│
├── migrations/                       # Alembic migrations (quản lý schema DB)
│   ├── env.py
│   └── versions/
│
├── tests/                            # Unit & Integration tests
│   ├── conftest.py
│   ├── test_db_connection.py
│   ├── test_mappers.py
│   ├── test_market_repo.py
│   └── test_settings.py
│
├── docker-compose.yml                # Môi trường Development
├── docker-compose.prod.yml           # Môi trường Production (+ Nginx)
├── Makefile                          # Lệnh tắt: dev-up, test, lint, seed...
├── alembic.ini                       # Cấu hình Alembic
├── .env.example                      # Biến môi trường mẫu
├── .pre-commit-config.yaml           # Pre-commit hooks
├── .gitignore
├── AGENTS.md                         # Quy tắc phát triển cho nhóm & AI agent
└── README.md                         # ← Bạn đang ở đây
```

---

##  Hướng Dẫn Cài Đặt & Chạy

### Yêu cầu hệ thống

- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/install/) (khuyến nghị)
- Hoặc nếu chạy không qua Docker: **Python 3.11+**, **Node.js 18+**, **PostgreSQL 16** (với TimescaleDB), **Redis**

### 1. Clone repository

```bash
git clone https://github.com/lehainam-05/CryptographicAnalysis.git
cd CryptographicAnalysis
```

### 2. Thiết lập biến môi trường

```bash
cp .env.example .env
```

Mở file `.env` và cập nhật các thông số:
- Thông tin kết nối **PostgreSQL** (`POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, ...)
- **API Keys** (Binance, vnstock nếu cần)
- Cấu hình **Redis**, **MLflow**, **Sentry**

### 3. Khởi động Development (Docker Compose)

```bash
make dev-up
```

Tất cả dịch vụ sẽ được build và khởi tạo tự động:

| Dịch vụ | URL | Mô tả |
|---------|-----|-------|
| **Frontend** (Next.js) | [http://localhost:3001](http://localhost:3001) | Giao diện web chính |
| **Inference API** (FastAPI) | [http://localhost:8000](http://localhost:8000) | API dự báo & quản lý mô hình |
| **Ingestion API** | [http://localhost:8001](http://localhost:8001) | Health check dịch vụ thu thập |
| **MLflow Tracking** | [http://localhost:5000](http://localhost:5000) | UI quản lý thí nghiệm ML |

### 4. Dừng hệ thống

```bash
# Dừng và xóa volumes (development)
make dev-down

# Hoặc chỉ dừng containers
docker-compose down
```

### 5. Khởi động Production (có Nginx Reverse Proxy)

```bash
make prod-up
```

---

## Phát Triển & Kiểm Thử

### Các lệnh Make thường dùng

```bash
make help               # Xem tất cả lệnh có sẵn

# Code Quality
make lint               # Kiểm tra lỗi lint (Ruff)
make format             # Tự động format code (Ruff)

# Testing
make test               # Chạy toàn bộ unit & integration tests

# Database
make migrate-generate   # Tạo migration mới (Alembic autogenerate)
make migrate-run        # Chạy migrations lên DB

# Dữ liệu
make seed               # Tạo dữ liệu mẫu (mã CK/crypto + nến giá)
make backfill           # Thu thập dữ liệu lịch sử thực tế
```

### Chạy Frontend riêng (không qua Docker)

```bash
cd frontend
npm install
npm run dev
```

Frontend sẽ chạy tại [http://localhost:3100](http://localhost:3100).

### Chạy Backend riêng (không qua Docker)

```bash
# Cài shared package ở chế độ editable
pip install -e shared/

# Chạy Inference API
cd services/inference
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Chạy Ingestion API
cd services/ingestion
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

### Chạy huấn luyện XGBoost

Mỗi model có entrypoint huấn luyện riêng `train_<model>.py`; `train_xgboost.py` là bản tham khảo đầy đủ nhất với quy trình: seed cố định → đọc snapshot khóa qua `shared/dataset/loader.py` → feature engineering riêng → Optuna → evaluate so với Naive → log MLflow → ghi CSV kết quả.

Nếu chưa có snapshot khóa, phải chạy `scripts/export_dataset_snapshot.py` để tạo snapshot trước (xem `docs/dataset.md`).

```bash
python -m services.training.train_xgboost --ticker <ticker> --timeframe <tf> --n-trials 50
```

---

## Quy Trình Machine Learning

```
Thu thập dữ liệu          Feature Engineering         Huấn luyện & Đánh giá
┌──────────────┐          ┌──────────────────┐        ┌───────────────────────┐
│  Binance API │──┐       │  Bộ feature riêng│        │  ARIMA (baseline)     │
│  vnstock     │──┼──────▶│  theo từng model │───────▶│  XGBoost              │
│  Celery Beat │──┘       │  XGBoost: 19     │        │  so với Naive         │
└──────────────┘          └──────────────────┘        └───────────┬───────────┘
                                                                  │
                          ┌──────────────────┐                    │
                          │  MLflow Tracking │◀───────────────────┘
                          │  & Registry      │
                          └────────┬─────────┘
                                   │
                          ┌────────▼─────────┐        ┌───────────────────────┐
                          │  Model Loader    │───────▶│  FastAPI /predict     │
                          │  + Redis Cache   │        │  Next.js Dashboard    │
                          └──────────────────┘        └───────────────────────┘
```

Feature Engineering sử dụng bộ feature riêng theo từng model; XGBoost hiện dùng 19 feature tại `services/training/models/xgboost_features.py`.

**Nguyên tắc quan trọng:**
- Chia dữ liệu **theo thời gian** (không xáo trộn) để tránh rò rỉ dữ liệu
- Scaler/Encoder chỉ **fit trên tập train**, transform cho valid/test
- Cố định **random seed** để đảm bảo tái lập kết quả
- Mọi thí nghiệm đều **log vào MLflow** (params, metrics, artifacts)
- So sánh với **baseline Naive** — kết quả không có baseline là vô nghĩa

---

## Tài Liệu Tham Khảo

- [`docs/architecture.md`](docs/architecture.md) — Kiến trúc hệ thống, luồng dữ liệu & ERD
- [`docs/api.md`](docs/api.md) — Hợp đồng API chi tiết (endpoints, request/response)
- [`docs/experiment_report.md`](docs/experiment_report.md) — Báo cáo kết quả thí nghiệm ML
- [`AGENTS.md`](AGENTS.md) — Quy tắc phát triển cho nhóm & AI agent

---

## Quy Tắc Git & Bảo Mật

- Mỗi đầu việc nhỏ là một commit, push lên `main` ngay khi xong và CI xanh
- **Conventional Commits** (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`), nội dung viết tiếng Việt
- **Không commit** `.env`, API key, secret, hoặc dataset lớn vào repo

