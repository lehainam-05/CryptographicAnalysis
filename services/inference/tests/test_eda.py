"""Tests for the EDA helpers and the /api/v1/eda endpoint (DB is stubbed)."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

import eda
import main
from shared.config.settings import settings
from shared.db.session import get_db

API_HEADERS = {"X-API-Key": settings.API_KEY_SECRET}
MONDAY = datetime(2025, 1, 6, tzinfo=timezone.utc)


def _daily_long() -> pd.DataFrame:
    """Two weeks: a crypto trading every day, a stock trading Mon-Fri."""
    rows = []
    for day in range(14):
        ts = MONDAY + timedelta(days=day)
        rows.append(("BTCUSDT", "crypto", ts, 100.0 * 1.01**day))
        if ts.weekday() < 5:
            rows.append(("ACB", "stock", ts, 20.0 + day))
    return pd.DataFrame(rows, columns=["ticker", "asset_class", "ts", "close"])


# ── Pure helpers ──────────────────────────────────────────────────────────────


def test_close_matrix_leaves_weekend_gaps_for_stocks() -> None:
    closes = eda.close_matrix(_daily_long())
    assert list(closes.columns) == ["ACB", "BTCUSDT"]
    assert closes["BTCUSDT"].notna().all()
    assert closes["ACB"].isna().sum() == 4  # two weekends


def test_daily_returns_span_weekend_for_stocks() -> None:
    returns = eda.daily_returns(eda.close_matrix(_daily_long()))
    # Monday of week 2: ACB return is Fri (24) -> Mon (27), not NaN.
    monday = pd.Timestamp("2025-01-13")
    assert returns.loc[monday, "ACB"] == pytest.approx(27 / 24 - 1)
    assert returns.loc[monday, "BTCUSDT"] == pytest.approx(0.01)


def test_correlation_uses_only_common_dates() -> None:
    closes = eda.close_matrix(_daily_long())
    corr = eda.correlation_matrix(closes)
    assert corr.loc["ACB", "ACB"] == pytest.approx(1.0)
    assert corr.shape == (2, 2)
    common = closes.dropna(how="any")
    expected = common.pct_change().corr().loc["ACB", "BTCUSDT"]
    assert corr.loc["ACB", "BTCUSDT"] == pytest.approx(expected)


def test_cumulative_index_starts_at_100() -> None:
    cumulative = eda.cumulative_index(eda.close_matrix(_daily_long()))
    assert cumulative.iloc[0].tolist() == pytest.approx([100.0, 100.0])
    assert cumulative["BTCUSDT"].iloc[1] == pytest.approx(101.0)


def test_return_distribution_detects_fat_tails() -> None:
    rng = np.random.default_rng(0)
    normal = eda.return_distribution(pd.Series(rng.normal(0, 0.01, 5000)))
    fat = eda.return_distribution(pd.Series(rng.standard_t(3, 5000) * 0.01))
    assert abs(normal["excess_kurtosis"]) < 0.5
    assert fat["excess_kurtosis"] > 2.0
    assert sum(normal["counts"]) == 5000
    # The normal curve integrates to roughly the sample size over the bins.
    assert sum(normal["normal_counts"]) == pytest.approx(5000, rel=0.02)


def test_return_distribution_handles_short_series() -> None:
    result = eda.return_distribution(pd.Series([0.01, np.nan]))
    assert result["n"] == 1 and result["mean"] is None


def test_annualized_volatility_uses_market_calendar() -> None:
    returns = pd.DataFrame({"A": [0.01, -0.01, 0.01, -0.01]})
    std = returns["A"].std(ddof=1)
    assert eda.annualized_volatility(returns, {"A": "stock"})["A"] == pytest.approx(
        std * np.sqrt(252)
    )
    assert eda.annualized_volatility(returns, {"A": "crypto"})["A"] == pytest.approx(
        std * np.sqrt(365)
    )


def test_monthly_coverage_counts_bars() -> None:
    coverage = eda.monthly_coverage(eda.close_matrix(_daily_long()))
    assert coverage.loc["2025-01", "BTCUSDT"] == 14
    assert coverage.loc["2025-01", "ACB"] == 10


def test_weekday_mean_returns_has_no_weekend_for_stocks() -> None:
    returns = eda.daily_returns(eda.close_matrix(_daily_long()))
    means = eda.weekday_mean_returns(returns, ["ACB"])
    assert means[5] is None and means[6] is None
    assert means[0] == pytest.approx(27 / 24 - 1)  # only Monday with a prior bar


def test_hourly_mean_returns_bucket_by_vietnam_hour() -> None:
    hourly = pd.DataFrame(
        {
            "ticker": ["X"] * 3,
            "ts": pd.date_range("2025-01-06 00:00", periods=3, freq="h", tz="UTC"),
            "close": [100.0, 110.0, 99.0],
        }
    )
    means = eda.hourly_mean_returns(hourly)
    assert len(means) == 24
    assert means[8] == pytest.approx(0.10)  # 01:00 UTC = 08:00 VN
    assert means[9] == pytest.approx(-0.10)
    assert means[7] is None


# ── Endpoint ──────────────────────────────────────────────────────────────────


class _EdaSession:
    """Return canned rows for the daily and hourly EDA queries."""

    def execute(self, statement: Any, params: dict) -> Any:
        sql = str(statement)
        if "'1d'" in sql:
            rows = list(_daily_long().itertuples(index=False, name=None))
        else:
            rows = []
        return type("Result", (), {"fetchall": lambda self: rows})()


@pytest.fixture()
def client():
    main.app.dependency_overrides[get_db] = lambda: _EdaSession()
    with TestClient(main.app) as test_client:
        yield test_client
    main.app.dependency_overrides.clear()


def test_eda_endpoint_returns_all_sections(client: TestClient) -> None:
    response = client.get("/api/v1/eda", headers=API_HEADERS)
    assert response.status_code == 200
    body = response.json()
    assert body["tickers"] == ["BTCUSDT", "ACB"]  # crypto before stock (sorted)
    assert body["asset_classes"] == ["crypto", "stock"]
    assert len(body["correlation"]) == 2
    assert body["correlation_days"] == 10
    assert body["cumulative"][0][0] == pytest.approx(100.0)
    assert len(body["hourly_mean_return"]) == 24
    assert set(body["weekday_mean_return"]) == {"stock", "crypto"}


def test_eda_endpoint_requires_api_key(client: TestClient) -> None:
    # verify_api_key declares the header as required, so a missing key is a 422.
    assert client.get("/api/v1/eda").status_code == 422
    bad = client.get("/api/v1/eda", headers={"X-API-Key": "wrong"})
    assert bad.status_code in (401, 403)
