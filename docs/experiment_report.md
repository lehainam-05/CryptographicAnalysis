# Báo cáo thí nghiệm: so sánh ARIMA và XGBoost trên ACB 1d

## 1. Phạm vi và mục tiêu

Báo cáo này ghi nhận kết quả so sánh ARIMA và XGBoost cho bài toán dự báo giá
đóng cửa kế tiếp của cổ phiếu ACB, đối chiếu với baseline Naive. Mục tiêu là
so sánh hai run trên cùng một holdout đã khóa, không phải chứng minh ưu thế
thống kê tổng quát của một mô hình.

> **Nguồn số liệu.** Toàn bộ số liệu được trích nguyên văn từ benchmark chính
> thức của đồ án NCKH gốc (evaluator chạy ngày 23/07/2026). Benchmark đó so
> sánh bốn mô hình; phạm vi hiện tại chỉ giữ ARIMA và XGBoost nên chỉ trích hai
> dòng này. Các file bằng chứng gốc trong `docs/evidence/ACB_1d/` được giữ
> nguyên, không chỉnh sửa, để giữ chuỗi bằng chứng.

Completion gate dựa trên test tự động, manifest, artifact reload, metric được
tính lại độc lập và output xác định.

## 2. Benchmark contract

| Thuộc tính | Giá trị |
|---|---|
| Dataset version | `group_dataset_v1` |
| Snapshot | `ohlcv_full_current` |
| Symbol / timeframe | `ACB` / `1d` |
| Target / horizon | `next_close` / `1` |
| Split / seed | `test` / `42` |
| Số prediction | `78` |
| Canonical test manifest SHA-256 | `62d82e13b48f337623235e20c2412d435395fef46fea5a24776ea895d1c8b828` |
| Thời điểm evaluator | `2026-07-23T14:30:15Z` |
| Môi trường | Python 3.11.15, MLflow 2.11.3, NumPy 1.26.4, Pandas 2.3.3 |

Evaluator tải lại locked dataset bằng shared loader, tự tạo manifest và so sánh
đủ 78 dòng theo `input_ts`, `target_ts`, `current_close` và `actual_close`.
Không run nào được chọn theo “latest”, filesystem order hoặc registry stage.

## 3. Official runs và eligibility

| Model | MLflow run ID | Artifact reload | Eligibility |
|---|---|---|---|
| XGBoost | `55ea7a8c7e3a49ed813ac6294fb26a80` | PASS | `valid` |
| ARIMA | `f1ef301caa064c858da753982f1564dc` | PASS | `valid` |

## 4. Validation liên mô hình

| Gate | Kết quả |
|---|---|
| Các run có trạng thái `FINISHED` | PASS |
| Required params và metrics | PASS |
| Prediction/summary exact schema | PASS |
| 78 prediction mỗi model | PASS |
| Canonical manifest hash | PASS |
| Cross-model row identity | PASS |
| Model-specific artifact reload | PASS |
| Metric recomputation với tolerance `1e-12` | PASS |
| Naive baseline identity | PASS |
| NaN / `+Inf` / `-Inf` | Không phát hiện |

XGBoost được reload cùng StandardScaler và feature order. ARIMA được reload từ
pre-test state có `nobs == 444`, endogenous history dài 444 và không chứa test
history.

## 5. Quy tắc xếp hạng

Thứ tự chính thức là:

1. RMSE tăng dần.
2. Nếu RMSE bằng nhau, MAE tăng dần.
3. Nếu RMSE và MAE bằng nhau, Directional Accuracy giảm dần.
4. Tên model tăng dần chỉ là fallback để output xác định khi mọi metric bằng
   nhau; đây không phải lợi thế thống kê.

Metric không được làm tròn trước validation hoặc ranking.

## 6. Kết quả

| Rank | Model | MAE | RMSE | MAPE % | Directional accuracy | Improvement vs Naive RMSE % |
|---:|---|---:|---:|---:|---:|---:|
| 1 | ARIMA | 0.27234869637307557 | 0.3882019113976774 | 1.3135850175231933 | 0.5128205128205128 | 0.5163771224311596 |
| 2 | XGBoost | 0.48262003678541876 | 0.6483500635961559 | 2.282851875973909 | 0.48717948717948717 | -66.15119948075981 |

Canonical Naive baseline dùng `predicted_close = current_close`:

| Naive MAE | Naive RMSE | Naive MAPE % | Naive directional accuracy |
|---:|---:|---:|---:|
| 0.2669230769230771 | 0.3902169022085419 | 1.2888783803605892 | 0.10256410256410256 |

> **Lưu ý về Naive directional accuracy.** Naive dự báo
> `predicted_close = current_close`, nên `sign(predicted − current) = 0` theo
> định nghĩa; chỉ số này chỉ được tính "đúng" ở các phiên giá đóng cửa không
> đổi (8/78 phiên của holdout này). Giá trị `0.1026` vì vậy là hằng số tham
> chiếu sinh ra từ công thức đã khóa trong protocol, không mang cùng cách diễn
> giải "khả năng đoán hướng" như directional accuracy của model, và không nên
> được so sánh trực tiếp với DA của hai model.

Theo primary metric RMSE, ARIMA đứng đầu và chỉ cải thiện
`0.5163771224311596%` so với Naive. XGBoost không vượt Naive trên manifest
này; improvement RMSE âm. ARIMA cũng không tốt hơn Naive theo MAE hoặc MAPE,
vì vậy kết quả không nên được diễn giải rộng hơn tiêu chí ranking và holdout
đã định trước.

## 7. Bằng chứng

Bằng chứng gốc (benchmark bốn mô hình của đồ án NCKH) được commit tại
`docs/evidence/ACB_1d/`: overview CSV, report Markdown và audit JSON kèm
checksum SHA-256. MLflow evaluator run là `f082a0252d7042f2a599b9554b2e68e0`.

Evaluator hiện không chạy lại được trên repo này: bước kiểm tra provenance yêu
cầu source commit nằm trong lịch sử Git của repo gốc, mà lịch sử đó không còn ở
đây. Vì vậy báo cáo dùng lại số liệu đã được kiểm chứng, không chạy lại.

## 8. Threats to validity

Các giới hạn ảnh hưởng trực tiếp đến cách diễn giải bảng kết quả ở mục 6:

1. **XGBoost chỉ dùng một Optuna trial cố định theo seed.** Giá trị mặc định
   `--n-trials` là `1` (`services/training/train_xgboost.py`), nên bộ
   hyperparameters chính thức là một cấu hình được TPE sampler (seed 42) lấy
   mẫu duy nhất từ search space — không phải giá trị mặc định của thư viện,
   cũng không phải kết quả tuning đã hội tụ. Kết quả của XGBoost phản ánh
   "một cấu hình XGBoost cụ thể", không phản ánh năng lực tối đa của thuật
   toán.
2. **ARIMA dùng order cố định `(1, 1, 1)`,** không chọn order bằng AIC/BIC
   hoặc validation. Validation chỉ được dùng để lăn trạng thái (rolling
   state) tới biên test. ARIMA(1,1,1) trên chuỗi giá có hành vi gần
   random walk, nên kết quả bám sát Naive baseline là điều dự kiến được.
3. **Hai model không dùng cùng feature representation.** XGBoost dùng 19
   feature kỹ thuật, ARIMA là univariate trên `close`. Benchmark so sánh các
   **pipeline hoàn chỉnh**, không so sánh các thuật toán trên cùng một input.
4. **ARIMA cập nhật trạng thái tuần tự trong test, khác cơ chế với XGBoost
   nhưng vẫn tuân thủ cùng giới hạn thông tin theo thời gian.** Sau mỗi bước
   dự báo, ARIMA append quan sát thực tế với `refit=False` (tham số giữ
   nguyên, chỉ trạng thái tiến lên). XGBoost đóng băng tham số sau
   train/validation, nhưng feature tại mỗi thời điểm `t` cũng được tính từ
   giá thực tế `≤ t`. Mọi dự báo tại `t` của cả hai model đều chỉ dùng thông
   tin có tại `t`; không model nào nhìn thấy tương lai.
5. **Kết quả chỉ dựa trên 78 mẫu test của một mã (ACB 1d) trong một giai
   đoạn thị trường.** Không có repeated sampling, không có kiểm định ý nghĩa
   thống kê.

## 9. Hạn chế và kết luận

- Đây là một holdout duy nhất cho ACB 1d, không bao phủ asset, timeframe hoặc
  giai đoạn thị trường khác.
- Không có repeated sampling hay kiểm định ý nghĩa thống kê.
- Kết quả không chứng minh mô hình đứng đầu sẽ tốt nhất trong production.
- Kết luận: trên holdout này, mô hình thống kê đơn giản (ARIMA) tốt hơn mô hình
  học máy (XGBoost) và chỉ nhỉnh hơn Naive rất ít — phù hợp với tính chất gần
  random walk của chuỗi giá cổ phiếu.
