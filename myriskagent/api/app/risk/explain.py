from __future__ import annotations

from typing import Dict, List, Optional

import numpy as np
import pandas as pd

try:
    import shap  # type: ignore
except Exception:  # pragma: no cover
    shap = None  # type: ignore


def explain_with_shap(model, X: pd.DataFrame) -> Dict[str, float]:
    if shap is None:
        return {}
    explainer = shap.Explainer(model, X)
    sv = explainer(X)
    mean_abs = np.abs(sv.values).mean(axis=0)
    return {feat: float(val) for feat, val in zip(X.columns, mean_abs)}


def heuristic_drivers(z: pd.DataFrame, top_n: int = 10) -> Dict[str, float]:
    abs_mean = z.abs().mean(axis=0).sort_values(ascending=False)
    top = abs_mean.head(top_n)
    return {k: float(v) for k, v in top.items()}


def to_plain_language(drivers: Dict[str, float]) -> List[str]:
    out = []
    for feat, strength in drivers.items():
        if strength >= 3:
            gloss = "is driving risk strongly"
        elif strength >= 2:
            gloss = "is a notable risk factor"
        else:
            gloss = "has a mild influence"
        out.append(f"{feat} {gloss} (|z|~{strength:.1f}).")
    return out


def explain_scores(features: pd.DataFrame, labels: Optional[pd.Series] = None) -> Dict[str, object]:
    numeric = features.select_dtypes(include=["number"]).copy()
    if numeric.empty:
        return {"drivers": {}, "rationales": []}
    z = (numeric - numeric.mean()) / (numeric.std() + 1e-6)
    drivers = heuristic_drivers(z)
    rationales = to_plain_language(drivers)
    return {"drivers": drivers, "rationales": rationales}
