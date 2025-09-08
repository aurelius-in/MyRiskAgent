from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import httpx


@dataclass
class NewsResult:
    query: str
    items: List[Dict[str, str]]
    embeds: List[Dict[str, str]]
    online_component: float


class NewsAgent:
    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key

    async def search(self, query: str, months: int = 12) -> NewsResult:
        if not self.api_key:
            return NewsResult(query=query, items=[], embeds=[], online_component=10.0)
        url = "https://newsapi.org/v2/everything"
        params = {"q": query, "pageSize": 20, "sortBy": "publishedAt", "language": "en"}
        headers = {"X-Api-Key": self.api_key}
        items: List[Dict[str, str]] = []
        embeds: List[Dict[str, str]] = []
        try:
            async with httpx.AsyncClient(timeout=15.0, headers=headers) as client:
                r = await client.get(url, params=params)
                if r.status_code == 200:
                    data = r.json()
                    for art in data.get("articles", [])[:20]:
                        items.append(
                            {
                                "title": art.get("title") or "",
                                "url": art.get("url") or "",
                                "publishedAt": art.get("publishedAt") or "",
                                "source": (art.get("source") or {}).get("name") or "",
                            }
                        )
                        embeds.append({"id": art.get("url") or "", "text": (art.get("title") or "")})
        except Exception:
            pass
        # Online component is a tiny placeholder until sentiment/severity
        return NewsResult(query=query, items=items, embeds=embeds, online_component=15.0)
