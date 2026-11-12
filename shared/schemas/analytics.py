"""Schemas for the data-analytics endpoints of the inference service.

These back the "Phân tích dữ liệu" and "Thu thập & Làm sạch" screens:
descriptive statistics per symbol, technical indicators over time, a data
quality profile per symbol, and the ingestion job log.
"""

from datetime import datetime
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class SymbolStats(BaseModel):
    """Descriptive statistics of one symbol's cleaned OHLCV history."""

    ticker: str
    asset_class: str
    timeframe: str
    bars: int = Field(..., description="Số nến (phiên) trong market.ohlcv")
    first_ts: datetime
    last_ts: datetime
    lowest_low: float = Field(..., description="Giá thấp nhất toàn kỳ")
    highest_high: float = Field(..., description="Giá cao nhất toàn kỳ")
    mean_close: float
    std_close: Optional[float] = None
    first_close: float
    last_close: float
    change_pct: Optional[float] = Field(
        None, description="% thay đổi giá đóng cửa từ nến đầu tới nến cuối"
    )
    mean_volume: float
    max_volume: float
    return_std_pct: Optional[float] = Field(
        None, description="Độ lệch chuẩn lợi suất theo nến (%), đo độ biến động"
    )
    rsi_14: Optional[float] = Field(None, description="RSI 14 tại nến gần nhất")
    macd: Optional[float] = Field(None, description="MACD (12, 26) tại nến gần nhất")
    macd_signal: Optional[float] = Field(
        None, description="Đường tín hiệu MACD (9) tại nến gần nhất"
    )


class IndicatorPoint(BaseModel):
    """One bar with its technical indicators (None during warm-up)."""

    ts: datetime
    open: float
    high: float
    low: float
    close: float
    volume: float
    sma_20: Optional[float] = None
    sma_50: Optional[float] = None
    rsi_14: Optional[float] = None
    macd: Optional[float] = None
    macd_signal: Optional[float] = None
    macd_hist: Optional[float] = None


class IndicatorResponse(BaseModel):
    """Chronological bars with indicators for one symbol."""

    ticker: str
    timeframe: str
    points: List[IndicatorPoint]


class PipelineCheck(BaseModel):
    """Latest cleaning-pipeline report written to ops.data_quality_check."""

    checked_at: datetime
    passed: bool
    detail: dict[str, Any]


class DataQualityReport(BaseModel):
    """Data quality profile of one symbol, measured on market.ohlcv."""

    ticker: str
    asset_class: str
    timeframe: str
    bars: int
    first_ts: Optional[datetime] = None
    last_ts: Optional[datetime] = None
    expected_bars: int = Field(
        ..., description="Số nến kỳ vọng theo lịch giao dịch trong khoảng thời gian"
    )
    missing_bars: int = Field(..., description="Số nến thiếu so với lịch")
    completeness_pct: float
    zero_volume_bars: int = Field(
        ..., description="Nến volume = 0 (phiên được forward-fill hoặc không giao dịch)"
    )
    invalid_ohlc_bars: int = Field(
        ..., description="Nến vi phạm low ≤ open/close ≤ high"
    )
    return_outliers: int = Field(
        ..., description="Nến có lợi suất nằm ngoài ngưỡng IQR (biến động bất thường)"
    )
    volume_outliers: int = Field(..., description="Nến có volume ngoài ngưỡng IQR")
    last_pipeline_check: Optional[PipelineCheck] = None


class JobLogEntry(BaseModel):
    """One ingestion/cleaning job recorded in ops.job_log."""

    job_type: str
    job_name: str
    status: str
    ticker: Optional[str] = None
    timeframe: Optional[str] = None
    started_at: datetime
    finished_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    rows_affected: Optional[int] = None
    error_message: Optional[str] = None


class ReturnDistribution(BaseModel):
    """Histogram of daily simple returns of one ticker plus its normal fit."""

    ticker: str
    asset_class: str
    n: int
    bin_centers: List[float]
    counts: List[int]
    normal_counts: List[float] = Field(
        ..., description="Số quan sát kỳ vọng nếu lợi suất phân phối chuẩn"
    )
    mean: Optional[float] = None
    std: Optional[float] = None
    skew: Optional[float] = None
    excess_kurtosis: Optional[float] = Field(
        None,
        description="Độ nhọn vượt chuẩn; > 0 nghĩa là đuôi dày hơn phân phối chuẩn",
    )
    annualized_volatility: Optional[float] = None


class EdaResponse(BaseModel):
    """Exploratory analysis over all active tickers (daily bars)."""

    tickers: List[str]
    asset_classes: List[str]
    distributions: List[ReturnDistribution]
    correlation: List[List[Optional[float]]] = Field(
        ..., description="Ma trận tương quan lợi suất ngày, thứ tự theo `tickers`"
    )
    correlation_days: int = Field(
        ..., description="Số ngày chung (mọi mã đều có giá) dùng để tính tương quan"
    )
    cumulative_dates: List[str]
    cumulative: List[List[Optional[float]]] = Field(
        ..., description="Giá chuẩn hóa về 100 tại ngày chung đầu tiên, mỗi dòng 1 mã"
    )
    coverage_months: List[str]
    coverage: List[List[int]] = Field(
        ..., description="Số nến mỗi tháng, mỗi dòng 1 mã"
    )
    weekday_labels: List[str]
    weekday_mean_return: dict[str, List[Optional[float]]] = Field(
        ..., description="Lợi suất trung bình theo thứ, theo nhóm stock/crypto"
    )
    hourly_mean_return: List[Optional[float]] = Field(
        ...,
        description="Lợi suất 1 giờ trung bình theo giờ trong ngày (giờ VN), crypto",
    )
