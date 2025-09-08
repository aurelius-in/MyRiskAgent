from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

import numpy as np
import pandas as pd


@dataclass
class SocialResult:
    query: str
    events: List[Dict[str, float]]
    online_component: float
    embeds: List[Dict[str, str]]


class SocialAgent:
    async def scan(self, query: str, days: int = 60) -> SocialResult:
        # MVP: simulate a time series of mention counts with occasional spikes
        idx = pd.date_range(end=pd.Timestamp.utcnow(), periods=days, freq="D")
        base = np.random.poisson(lam=10, size=days)
        # inject a couple spikes
        for i in np.random.choice(range(days), size=min(3, max(1, days // 20)), replace=False):
            base[i] += np.random.randint(30, 80)
        events = [{"date": d.isoformat(), "count": int(c)} for d, c in zip(idx, base)]
        spike_ratio = float(np.mean(base > (np.mean(base) + 2 * np.std(base))))
        online_component = float(min(100.0, 10 + 80 * spike_ratio))
        embeds = [{"id": f"social-{i}", "text": f"{query} social signal {e['count']}"} for i, e in enumerate(events[-5:])]
        return SocialResult(query=query, events=events[-30:], online_component=online_component, embeds=embeds)
