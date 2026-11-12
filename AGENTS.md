# AGENTS.md — Hướng dẫn sử dụng AI Agent cho dự án

> Mọi thành viên VÀ mọi AI agent (Cursor/Claude/Copilot...) PHẢI đọc và tuân thủ file này
> trước khi viết bất kỳ dòng code nào. Nếu một yêu cầu mâu thuẫn với file này, DỪNG LẠI và hỏi.

---

## 0. Bối cảnh dự án (đọc để có ngữ cảnh)
- Hệ thống thu thập, phân tích & DỰ BÁO giá cổ phiếu VN (vnstock) và crypto (Binance).
- Bài tập lớn môn **Phân tích và Trực quan hóa dữ liệu**, nhóm 2 người, phát triển tiếp từ đồ án
  NCKH [Ennela/NCKH-CryptographicAnalysis](https://github.com/Ennela/NCKH-CryptographicAnalysis)
  (xem README mục "Nguồn Gốc Dự Án").
- Trọng tâm: thu thập, làm sạch, phân tích khám phá (EDA) và trực quan hóa dữ liệu; phần dự báo
  chỉ giữ ARIMA + XGBoost, so với baseline Naive.
- Đây là dự án HỌC THUẬT: ưu tiên code DỄ HIỂU, GIẢI THÍCH ĐƯỢC, TÁI LẬP ĐƯỢC hơn là "code cho nhanh".

---

## 1. Quy tắc VÀNG khi dùng AI Agent
1. **Đọc trước, viết sau.** Trước khi sinh code, agent phải đọc: file này, `docs/api.md`,
   `docs/architecture.md`, và các file liên quan trong thư mục đang sửa. KHÔNG đoán cấu trúc.
2. **Lên kế hoạch trước khi code.** Với task lớn, agent phải trình bày kế hoạch (các file sẽ sửa,
   cách tiếp cận) và CHỜ người xác nhận, rồi mới code.
3. **Phạm vi nhỏ.** Mỗi lần chỉ làm 1 task ứng với 1 issue trên board. KHÔNG tự ý sửa file ngoài phạm vi.
4. **Người luôn review.** KHÔNG merge code do AI sinh mà chưa đọc hiểu. "Tôi không hiểu đoạn này"
   = chưa được merge. Người chịu trách nhiệm là người ký PR, không phải AI.
5. **Không tự ý đổi kiến trúc / stack / schema DB.** Mọi thay đổi lớn phải mở thảo luận với cả nhóm.
6. **Không tự cài thêm thư viện nặng** chỉ để giải quyết việc nhỏ. Hỏi trước khi thêm dependency.
7. **Không tạo "magic".** Code phải tường minh; tránh viết tắt khó hiểu, tránh trừu tượng hóa quá sớm.

## 2. Điều TUYỆT ĐỐI KHÔNG làm với agent
- ❌ Dán nguyên khối code rồi merge mà không test.
- ❌ Yêu cầu agent "sửa cho hết lỗi" một cách mù quáng đến khi chạy được mà không hiểu vì sao.
- ❌ Để agent xóa/sửa file của thành viên khác ngoài phạm vi task.
- ❌ Commit secret, API key, file `.env` thật, dữ liệu lớn vào repo.
- ❌ Copy code trực tiếp từ repo tham khảo (ML for Trading) — xem mục 7.

---

## 3. Stack công nghệ (CHỐT — không tự đổi)
- Backend: Python 3.11 + FastAPI (đa service: ingestion / training / inference).
- Mô hình chỉ gồm ARIMA + XGBoost; không dùng deep learning (GRU, Random Forest, PyTorch đã loại).
- ML cổ điển: scikit-learn, statsmodels (ARIMA), XGBoost (baseline mạnh + SHAP).
- Tuning: Optuna. Theo dõi thí nghiệm: MLflow.
- DB: PostgreSQL + TimescaleDB (OHLCV là hypertable). ORM: SQLAlchemy 2.x + Alembic.
- Queue: Celery + Redis. Frontend: Next.js (TypeScript) + ECharts.
- Config: pydantic-settings đọc từ `.env`. DevOps: Docker + Docker Compose + GitHub Actions + Sentry.

---

## 4. Ai sở hữu phần nào (sửa đúng đất của mình)

- **Lê Hải Nam** (23810310377, nhóm trưởng) — dữ liệu & trực quan hóa: services/ingestion/,
  shared/, frontend/ (trang Phân tích, Pipeline và biểu đồ EDA mới), infra/, .github/workflows/.
- **Nguyễn Thùy Linh** (23810310378) — mô hình & báo cáo: services/training/ (ARIMA, XGBoost),
  services/inference/, trang Dự báo/Giải thích của frontend, docs/ và báo cáo, slide.

Sửa code ngoài phần mình sở hữu → báo người sở hữu để cùng xem lại.

---

## 5. Quy tắc code (style & chất lượng)
- Format & lint: `ruff` (Python), `eslint + prettier` (frontend). PR không pass lint = không merge.
- Bắt buộc **type hint** cho mọi hàm Python; dùng `pydantic` cho dữ liệu vào/ra.
- Đặt tên rõ nghĩa, tiếng Anh; hàm < ~50 dòng; tách hàm khi quá dài.
- Mọi I/O ra ngoài (API, DB, file) phải có xử lý lỗi + log có cấu trúc.
- KHÔNG hardcode: symbol, đường dẫn, secret, hyperparameter → đưa vào config/`.env`.
- Mỗi hàm phức tạp có docstring ngắn nói RÕ: làm gì, input, output.

## 6. Quy tắc dành riêng cho phần ML (rất quan trọng cho điểm)
- **Không rò rỉ dữ liệu (no look-ahead):** chia dữ liệu theo THỜI GIAN, không xáo trộn.
- **Scaler/encoder chỉ fit trên tập train**, sau đó transform valid/test.
- **Cố định random seed** (numpy, random) ở đầu mọi script train để tái lập.
- **Mọi thí nghiệm phải log vào MLflow**: params, metrics (MAE/RMSE/MAPE), artifact model.
- Mọi mô hình mới phải so với **baseline Naive** — không có baseline thì kết quả vô nghĩa.
- Lưu kết quả ra bảng/CSV để đưa vào báo cáo; không để kết quả "bay" trong notebook.

## 7. Chống đạo văn (học thuật)
- ĐƯỢC tham khảo Ý TƯỞNG & PHƯƠNG PHÁP từ repo ML for Trading và nguồn ngoài.
- KHÔNG copy code nguyên khối. Phải đọc hiểu → tự viết lại bằng dữ liệu của nhóm.
- Mọi ý tưởng/đoạn tham khảo phải GHI NGUỒN trong `docs/` và trong báo cáo (Chương 2 + Tham khảo).
- Code do AI sinh cũng phải được người hiểu và chịu trách nhiệm — không "đổ cho AI".

---

## 8. Quy tắc Git
- Repo: github.com/lehainam-05/CryptographicAnalysis, nhánh `main`.
- Chia việc thành đầu việc nhỏ; mỗi đầu việc xong → test + lint → 1 commit → push lên `main`.
- Commit theo Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`),
  nội dung viết tiếng Việt: làm gì, vì sao, đã test thế nào.
- CI (Lint & Format Check dùng `ruff==0.15.16`) phải xanh; đỏ thì sửa ngay ở commit kế tiếp.

## 9. Definition of Done (1 task chỉ "xong" khi đủ 4)
- [ ] Code chạy được, đã push lên `main` và CI xanh.
- [ ] Có test cơ bản (hoặc đã kiểm thử thủ công có ghi lại).
- [ ] Đã cập nhật tài liệu / `docs` nếu thay đổi hành vi hệ thống.
- [ ] Demo được trên máy local.

## 10. Bảo mật
- API key/secret chỉ đặt trong `.env` (đã có trong `.gitignore`). `.env.example` chỉ chứa tên biến.
- API nội bộ phải có: API key, rate limit, validate input (whitelist symbol, kiểm kiểu dữ liệu).
- Không log secret. Không đẩy dữ liệu nhạy cảm / dataset lớn lên Git (dùng `scripts/` để tải lại).

---

## 11. Mẫu prompt CHUẨN khi nhờ agent (copy & điền vào)
  Ngữ cảnh: [task này thuộc service nào, liên quan file nào]
  Yêu cầu: [mô tả 1 việc cụ thể, nhỏ]
  Ràng buộc: tuân thủ AGENTS.md (không look-ahead, có type hint, log MLflow...)
  Trước khi code: đọc [các file liên quan] và trình bày kế hoạch ngắn, chờ tôi duyệt.
  Sau khi code: liệt kê file đã sửa + cách test.

> Nguyên tắc cuối: AI là TRỢ LÝ, không phải người chịu trách nhiệm. Người mở PR chịu trách nhiệm
> cho từng dòng code trong đó — kể cả dòng do AI viết.

---

## 12. Ngoại lệ tạm thời (có thời hạn)

### 12.1 Sync engine trong shared/db/session.py
- **Trạng thái:** Tạm chấp nhận — cần gỡ bỏ khi mọi consumer sync chuyển sang async.
- **Lý do (cập nhật 2026-07-26):** Các client legacy `api/*` (lý do ban đầu của
  ngoại lệ này) đã bị xóa theo §12.2. Sync engine vẫn phải giữ vì các nơi sau còn
  import `get_db` / `SessionLocal` / `SyncSessionLocal` / `sync_engine` từ
  `shared/db/session.py`:
  - `services/inference/main.py` — các endpoint FastAPI dùng `Depends(get_db)` (sync).
  - `services/ingestion/tasks.py` — Celery tasks mở session qua `SessionLocal()`.
  - `services/training/data_loader.py` — đọc dữ liệu train qua `SessionLocal()`.
  - `scripts/seed_db.py`, `scripts/backfill_vnstock.py`,
    `scripts/import_dataset_snapshot.py`, `scripts/check_group_dataset.py`.
  - Fixtures test: `tests/conftest.py`, `tests/test_db_connection.py`,
    `services/ingestion/tests/conftest.py`.
  - (`migrations/env.py` không import từ `shared/db/session.py` — Alembic tự tạo
    sync engine qua `engine_from_config` — nhưng vẫn cần driver sync `psycopg2`.)
- **Phạm vi ngoại lệ:** `shared/db/session.py` cung cấp **cả** `create_async_engine`
  (CHÍNH) **và** `create_engine` (COMPAT). Code mới **BẮT BUỘC** dùng async.
  Chỉ các consumer liệt kê ở trên được dùng sync.
- **Điều kiện gỡ bỏ:**
  1. Chuyển `services/inference/main.py` sang `Depends(get_async_session)`.
  2. Chuyển `services/ingestion/tasks.py`, `services/training/data_loader.py`
     và các script trong `scripts/` sang `AsyncSessionLocal` (hoặc engine sync
     cục bộ riêng cho script chạy một lần, không đi qua `shared/db/session.py`).
  3. Cập nhật các fixture test sync tương ứng.
  4. Xoá `sync_engine`, `SyncSessionLocal`, `get_db()`, alias `engine`/`SessionLocal`
     khỏi `shared/db/session.py`.
  5. Xoá `psycopg2-binary` khỏi `shared/pyproject.toml` (Alembic có thể chuyển sang
     `psycopg[binary]` v3 async nếu cần).
- **Người chịu trách nhiệm:** TV1 (Data/Lead).
- **Deadline dự kiến:** Sprint sau khi hoàn tất task "trỏ ingestion vào market.ohlcv".

### 12.2 Gộp api/* (collector cũ) vào services/ingestion
- **Trạng thái:** Đã hoàn tất (2026-07-26) — `api/*` đã xóa, `services/ingestion`
  là collector duy nhất.
- **Lý do (lịch sử):** Code thu thập dữ liệu (collector) từng nằm rải rác tại các thư mục `api/binance_fastapi` và `api/vnstock_fastapi`. Toàn bộ logic thu thập đã được gom vào `services/ingestion` làm dịch vụ cào dữ liệu tập trung duy nhất để đơn giản hóa vận hành và cấu trúc repo.
- **Người chịu trách nhiệm:** TV1 (Data/Lead) + TV3 (Feature/Inference).
