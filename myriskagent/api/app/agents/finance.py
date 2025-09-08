from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

import httpx
import numpy as np
import pandas as pd


@dataclass
class FinanceResult:
    ticker: str
    features: Dict[str, float]
    series: pd.DataFrame


class FinanceAgent:
    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key

    async def fetch_prices_alpha(self, ticker: str) -> pd.DataFrame:
        if not self.api_key:
            return pd.DataFrame()
        url = "https://www.alphavantage.co/query"
        params = {"function": "TIME_SERIES_DAILY_ADJUSTED", "symbol": ticker, "outputsize": "compact", "apikey": self.api_key}
        async with httpx.AsyncClient(timeout=20.0) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            data = r.json().get("Time Series (Daily)", {})
        if not data:
            return pd.DataFrame()
        rows = []
        for day, vals in data.items():
            rows.append({"date": day, "close": float(vals.get("5. adjusted close", vals.get("4. close", 0.0)))})
        df = pd.DataFrame(rows).sort_values("date")
        df["date"] = pd.to_datetime(df["date"])  
        df.set_index("date", inplace=True)
        return df

    @staticmethod
    def compute_features(prices: pd.DataFrame) -> Dict[str, float]:
        if prices.empty:
            return {"ret_30d": 0.0, "vol_30d": 0.0, "drawdown": 0.0}
        close = prices["close"].astype(float)
        ret = close.pct_change().dropna()
        ret_30 = (close.iloc[-1] / close.iloc[-min(30, len(close)-1)] - 1.0) if len(close) > 1 else 0.0
        vol_30 = float(ret.tail(min(30, len(ret))).std() or 0.0)
        peak = close.cummax()
        dd = float(((close - peak) / peak).min() or 0.0)
        return {"ret_30d": float(ret_30), "vol_30d": float(vol_30), "drawdown": float(abs(dd))}

    async def run(self, ticker: str) -> FinanceResult:
        df = await self.fetch_prices_alpha(ticker)
        if df.empty:
            # fallback: synthetic flat series
            idx = pd.date_range(end=pd.Timestamp.utcnow(), periods=60, freq="D")
            df = pd.DataFrame({"close": np.linspace(100, 102, len(idx))}, index=idx)
        feats = self.compute_features(df)
        return FinanceResult(ticker=ticker, features=feats, series=df)
