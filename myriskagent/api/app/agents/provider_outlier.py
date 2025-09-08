from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

import pandas as pd

from app.risk.engine import robust_z


@dataclass
class ProviderOutlier:
    provider_id: int
    score: float
    details: Dict[str, float]


class ProviderOutlierAgent:
    def run(self, claims: pd.DataFrame) -> List[ProviderOutlier]:
        if claims.empty:
            return []
        # Aggregate per provider
        g = (
            claims.groupby("provider_id")
            .agg(total_amount=("claim_amount", "sum"), avg_amount=("claim_amount", "mean"), n_claims=("claim_amount", "count"))
            .reset_index()
        )
        # Compute z for each metric and form a composite
        for col in ["total_amount", "avg_amount", "n_claims"]:
            g[f"z_{col}"] = robust_z(g[col])
        g["score"] = (g[["z_total_amount", "z_avg_amount", "z_n_claims"]].abs().mean(axis=1) * 10).clip(0, 100)
        out: List[ProviderOutlier] = []
        for _, row in g.iterrows():
            out.append(
                ProviderOutlier(
                    provider_id=int(row["provider_id"]),
                    score=float(row["score"]),
                    details={
                        "z_total_amount": float(row["z_total_amount"]),
                        "z_avg_amount": float(row["z_avg_amount"]),
                        "z_n_claims": float(row["z_n_claims"]),
                    },
                )
            )
        return out
