from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Optional

import httpx


@dataclass
class WikiResult:
    title: str
    summary: str
    url: str


class WikipediaAgent:
    BASE = "https://en.wikipedia.org/api/rest_v1/page/summary/"

    async def fetch(self, title: str) -> WikiResult:
        url = self.BASE + title.replace(" ", "%20")
        summary = ""
        page_url = f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                r = await client.get(url)
                if r.status_code == 200:
                    data = r.json()
                    summary = data.get("extract", "")
                    page_url = data.get("content_urls", {}).get("desktop", {}).get("page", page_url)
        except Exception:
            pass
        return WikiResult(title=title, summary=summary, url=page_url)
