from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

import httpx


@dataclass
class FilingsResult:
    org: str
    ticker: Optional[str]
    facts: Dict[str, str]
    snippets: List[Dict[str, str]]
    embeds: List[Dict[str, str]]


class FilingsAgent:
    """Fetch SEC filings and extract high-level snippets.

    MVP: hit EDGAR company facts if ticker is provided; otherwise return empty.
    """

    BASE = "https://data.sec.gov"

    async def fetch(self, org: str, ticker: Optional[str] = None) -> FilingsResult:
        headers = {"User-Agent": "MyRiskAgent/0.1 (contact@example.com)"}
        facts: Dict[str, str] = {}
        snippets: List[Dict[str, str]] = []
        embeds: List[Dict[str, str]] = []
        if not ticker:
            return FilingsResult(org=org, ticker=ticker, facts=facts, snippets=snippets, embeds=embeds)
        url = f"{self.BASE}/api/xbrl/companyfacts/CIK{ticker}.json"
        try:
            async with httpx.AsyncClient(timeout=20.0, headers=headers) as client:
                r = await client.get(url)
                if r.status_code == 200:
                    data = r.json()
                    facts["fetched"] = "true"
                    snippets.append({"section": "summary", "text": f"Fetched company facts for {ticker}"})
                    embeds.append({"id": f"sec-{ticker}", "text": f"Company facts for {org} ({ticker})"})
        except Exception:
            pass
        return FilingsResult(org=org, ticker=ticker, facts=facts, snippets=snippets, embeds=embeds)
