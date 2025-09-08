from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Tuple

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor


@dataclass
class RiskScores:
    financial: float
    compliance: float
    operational: float
    provider_outlier: float | None
    combined: float
    confidence: float


def robust_z(series: pd.Series) -> pd.Series:
    x = series.astype(float).replace([np.inf, -np.inf], np.nan).dropna()
    if x.empty:
        return pd.Series(np.zeros(len(series)), index=series.index)
    med = x.median()
    mad = (x - med).abs().median() or 1.0
    z = (series - med) / (1.4826 * mad)
    z = z.replace([np.inf, -np.inf], 0).fillna(0)
    return z


def isolation_forest_score(df: pd.DataFrame) -> float:
    if df.empty or df.shape[0] < 10:
        return 30.0
    clf = IsolationForest(n_estimators=100, contamination=0.1, random_state=42)
    preds = -clf.fit(df.values).score_samples(df.values)
    return float(np.clip(np.mean(preds) * 10, 0, 100))


def lof_score(df: pd.DataFrame) -> float:
    if df.empty or df.shape[0] < 10:
        return 35.0
    lof = LocalOutlierFactor(n_neighbors=min(20, len(df) - 1), novelty=False)
    s = -lof.fit_predict(df.values)  # 1 for inlier, -1 for outlier -> flip sign
    score = float(np.clip(s.mean() * 50, 0, 100))
    return score


def topk_deviation_score(z: pd.Series, k: int = 5) -> float:
    topk = np.sort(np.abs(z.values))[-k:]
    return float(np.clip(np.mean(topk) * 10, 0, 100))


def recency_weighted_online(events: pd.DataFrame, lambda_: float = 0.01) -> float:
    if events.empty:
        return 20.0
    ages = events["age_days"].astype(float).values
    weights = np.exp(-lambda_ * ages)
    return float(np.clip(100 * (weights.mean()), 0, 100))


def compute_family_scores(features: pd.DataFrame) -> Dict[str, Tuple[float, float]]:
    """Return scores and confidences by family.

    Heuristic mapping of feature groups to families for MVP.
    """
    if features.empty:
        return {
            "Financial Health Risk": (40.0, 0.5),
            "Compliance and Reputation Risk": (35.0, 0.5),
            "Operational and Outlier Risk": (50.0, 0.5),
        }

    numeric = features.select_dtypes(include=["number"]).copy()
    z = numeric.apply(robust_z)

    fin_score = float(np.clip(topk_deviation_score(z.mean(axis=1)), 0, 100))
    comp_score = float(np.clip(lof_score(numeric), 0, 100))
    op_score = float(np.clip(isolation_forest_score(numeric), 0, 100))

    return {
        "Financial Health Risk": (fin_score, 0.65),
        "Compliance and Reputation Risk": (comp_score, 0.6),
        "Operational and Outlier Risk": (op_score, 0.6),
    }


def combine_scores(scores: Dict[str, Tuple[float, float]]) -> Tuple[float, float]:
    # Weighted average by confidence
    if not scores:
        return 45.0, 0.5
    num = sum(score * conf for score, conf in scores.values())
    den = sum(conf for _, conf in scores.values()) or 1.0
    combined = num / den
    confidence = min(0.9, den / (len(scores) * 1.0))
    return float(combined), float(confidence)
