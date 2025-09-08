from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List

import httpx


@dataclass
class SanctionFlag:
    name: str
    list: str
    score: float
    source_url: str


class SanctionsAgent:
    async def check(self, name: str) -> List[SanctionFlag]:
        """Best-effort match against OpenSanctions. Returns empty on failure.

        This is a very light-touch MVP; production should use proper APIs and allowlists.
        """
        url = "https://api.opensanctions.org/match/default"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.post(url, json={"queries": [{"q": name}]})
                if r.status_code != 200:
                    return []
                data = r.json()
                out: List[SanctionFlag] = []
                for res in data.get("responses", []):
                    for m in res.get("matches", [])[:3]:
                        out.append(
                            SanctionFlag(
                                name=m.get("entity", {}).get("name", ""),
                                list=",".join(m.get("entity", {}).get("datasets", [])),
                                score=float(m.get("score", 0.0)),
                                source_url=m.get("entity", {}).get("first_seen", "https://opensanctions.org"),
                            )
                        )
                return out
        except Exception:
            return []
