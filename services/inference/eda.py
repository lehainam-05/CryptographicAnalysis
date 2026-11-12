"""Pure pandas helpers behind the exploratory-data-analysis (EDA) endpoint.

Kept free of FastAPI/DB code so the formulas can be unit-tested directly.
Every helper works on daily closes in "long" form (columns ticker,
asset_class, ts, close) or on the wide close matrix built from it.

- ``return_distribution``: histogram of daily simple returns with the matching
  normal curve, mean, std, skew and excess kurtosis (fat tails => kurtosis > 0).
- ``correlation_matrix``: Pearson correlation of daily returns. Returns are
  computed on the dates where *every* ticker has a close, so a stock return
  (Fri -> Mon) is never paired with a crypto return over a different horizon.
- ``cumulative_index``: each close rebased to 100 on the first common date.
- ``annualized_volatility``: std of daily returns x sqrt(trading periods/year).
- ``monthly_coverage``: number of bars per ticker and calendar month.
- ``weekday_mean_returns`` / ``hourly_mean_returns``: average return by day of
  week (both markets) and by hour of day (crypto 1h), in Vietnam time.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

LOCAL_TIMEZONE = "Asia/Ho_Chi_Minh"
HISTOGRAM_BINS = 40
# Trading periods per year used to annualize daily volatility.
PERIODS_PER_YEAR: dict[str, int] = {"stock": 252, "crypto": 365}
WEEKDAY_LABELS: tuple[str, ...] = ("T2", "T3", "T4", "T5", "T6", "T7", "CN")


def close_matrix(daily: pd.DataFrame) -> pd.DataFrame:
    """Pivot long daily closes into a date x ticker matrix (dates in VN time).

    Input: columns ticker, ts (tz-aware), close. Output: index = calendar date,
    one column per ticker, NaN where a ticker has no bar that day.
    """
    frame = daily.assign(
        date=pd.to_datetime(daily["ts"], utc=True)
        .dt.tz_convert(LOCAL_TIMEZONE)
        .dt.normalize()
        .dt.tz_localize(None)
    )
    return frame.pivot_table(
        index="date", columns="ticker", values="close", aggfunc="last"
    ).sort_index()


def daily_returns(closes: pd.DataFrame) -> pd.DataFrame:
    """Simple returns of each ticker over its own consecutive bars."""
    return closes.apply(lambda column: column.dropna().pct_change())


def return_distribution(returns: pd.Series, bins: int = HISTOGRAM_BINS) -> dict:
    """Histogram + normal fit of one return series (NaN dropped).

    Output: bin edges/centers/counts, normal counts expected for the same
    mean/std, and moments. Returns None-valued moments when < 3 observations.
    """
    values = returns.dropna().to_numpy(dtype=float)
    if len(values) < 3:
        return {
            "n": int(len(values)),
            "bin_centers": [],
            "counts": [],
            "normal_counts": [],
            "mean": None,
            "std": None,
            "skew": None,
            "excess_kurtosis": None,
        }
    counts, edges = np.histogram(values, bins=bins)
    centers = (edges[:-1] + edges[1:]) / 2
    mean, std = float(values.mean()), float(values.std(ddof=1))
    width = float(edges[1] - edges[0])
    density = np.exp(-0.5 * ((centers - mean) / std) ** 2) / (std * np.sqrt(2 * np.pi))
    series = pd.Series(values)
    return {
        "n": int(len(values)),
        "bin_centers": centers.tolist(),
        "counts": counts.astype(int).tolist(),
        "normal_counts": (density * width * len(values)).tolist(),
        "mean": mean,
        "std": std,
        "skew": float(series.skew()),
        "excess_kurtosis": float(series.kurt()),
    }


def correlation_matrix(closes: pd.DataFrame) -> pd.DataFrame:
    """Return correlation on dates where every ticker traded (common calendar)."""
    common = closes.dropna(how="any")
    return common.pct_change().dropna(how="all").corr()


def cumulative_index(closes: pd.DataFrame) -> pd.DataFrame:
    """Rebase every ticker to 100 on the first date where all have a close.

    Later NaNs (weekends for stocks) are left as gaps, not forward-filled.
    """
    common_dates = closes.dropna(how="any").index
    if common_dates.empty:
        return closes.iloc[0:0]
    window = closes.loc[common_dates[0] :]
    return window / window.iloc[0] * 100.0


def annualized_volatility(returns: pd.DataFrame, asset_class: dict[str, str]) -> dict:
    """Std of daily returns x sqrt(periods per year), per ticker."""
    result: dict[str, float | None] = {}
    for ticker in returns.columns:
        std = returns[ticker].std(ddof=1)
        periods = PERIODS_PER_YEAR[asset_class[ticker]]
        result[ticker] = None if pd.isna(std) else float(std * np.sqrt(periods))
    return result


def monthly_coverage(closes: pd.DataFrame) -> pd.DataFrame:
    """Bars per ticker per calendar month (index 'YYYY-MM')."""
    counts = closes.notna().groupby(closes.index.to_period("M")).sum()
    counts.index = counts.index.astype(str)
    return counts.astype(int)


def weekday_mean_returns(returns: pd.DataFrame, tickers: list[str]) -> list:
    """Mean daily return by weekday, pooled over `tickers` (None if no data)."""
    stacked = returns[tickers].stack()
    by_day = stacked.groupby(stacked.index.get_level_values(0).dayofweek).mean()
    return [
        None if day not in by_day.index else float(by_day[day])
        for day in range(len(WEEKDAY_LABELS))
    ]


def hourly_mean_returns(hourly: pd.DataFrame) -> list:
    """Mean 1h return by hour of day (VN time), pooled over all tickers.

    Input: long frame with ticker, ts, close (hourly bars). Output: 24 values.
    """
    if hourly.empty:
        return [None] * 24
    frame = hourly.sort_values(["ticker", "ts"]).copy()
    frame["ret"] = frame.groupby("ticker")["close"].pct_change()
    hours = pd.to_datetime(frame["ts"], utc=True).dt.tz_convert(LOCAL_TIMEZONE).dt.hour
    by_hour = frame["ret"].groupby(hours).mean()
    return [
        None
        if hour not in by_hour.index or pd.isna(by_hour[hour])
        else float(by_hour[hour])
        for hour in range(24)
    ]
