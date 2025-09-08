from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional

from app.search.vector import InMemoryVectorStore, DocumentUpsert
from app.agents.news import NewsAgent


@dataclass
class QAAnswer:
    lead: str
    answer_html: str
    citations: List[Dict[str, str]]


class QAAssistantAgent:
    def __init__(self, vector_store: Optional[InMemoryVectorStore] = None, news_api_key: Optional[str] = None) -> None:
        self.vs = vector_store or InMemoryVectorStore()
        self.news = NewsAgent(api_key=news_api_key)

    async def answer(self, question: str, org_id: Optional[int] = None, scope: Optional[List[str]] = None) -> QAAnswer:
        scope = scope or []
        citations: List[Dict[str, str]] = []
        # Vector search first
        results = self.vs.search(question, org_id=org_id, k=3)
        for r in results:
            citations.append({"id": str(r.get("id")), "title": r.get("title") or "", "url": r.get("url") or ""})
        # News if requested
        if "news" in [s.lower() for s in scope]:
            nr = await self.news.search(question)
            for it in nr.items[:3]:
                citations.append({"id": it.get("url", ""), "title": it.get("title", ""), "url": it.get("url", "")})
        lead = "Here is what we know, with sources to back it up."
        answer_html = "<p>Answer draft based on available documents. Citations included below.</p>"
        return QAAnswer(lead=lead, answer_html=answer_html, citations=citations[:5])
