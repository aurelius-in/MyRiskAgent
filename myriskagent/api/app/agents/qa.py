from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional
import os

from app.search.vector import InMemoryVectorStore, DocumentUpsert
from app.agents.news import NewsAgent

try:
    import openai  # type: ignore
except Exception:  # pragma: no cover
    openai = None  # type: ignore


SYSTEM_PROMPT = (
    "You are MyRiskAgent's Q&A assistant. Answer with strict citations using [id](url) for each factual claim. "
    "If no reliable sources, say so clearly. Never fabricate URLs or claims. Keep answers concise and professional."
)


@dataclass
class QAAnswer:
    lead: str
    answer_html: str
    citations: List[Dict[str, str]]


class QAAssistantAgent:
    def __init__(self, vector_store: Optional[InMemoryVectorStore] = None, news_api_key: Optional[str] = None) -> None:
        self.vs = vector_store or InMemoryVectorStore()
        self.news = NewsAgent(api_key=news_api_key)
        api_key = os.getenv("OPENAI_API_KEY")
        if openai is None or not api_key:
            raise RuntimeError("OPENAI_API_KEY is required for QAAssistantAgent")
        self._client = openai.OpenAI(api_key=api_key)
        self._model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    async def answer(self, question: str, org_id: Optional[int] = None, scope: Optional[List[str]] = None) -> QAAnswer:
        scope = [s.lower() for s in (scope or [])]
        # Retrieve first
        results = self.vs.search(question, org_id=org_id, k=5)
        citations: List[Dict[str, str]] = [
            {"id": str(r.get("id")), "title": r.get("title") or "", "url": r.get("url") or ""}
            for r in results
        ]
        # Optionally fetch recent news and append citations
        if "news" in scope:
            nr = await self.news.search(question)
            for it in nr.items[:3]:
                citations.append({"id": it.get("url", ""), "title": it.get("title", ""), "url": it.get("url", "")})

        # Build prompt with top citations
        cite_lines = "\n".join(
            f"- [{c.get('id')}]{'(' + c.get('url') + ')' if c.get('url') else ''} {c.get('title','')}" for c in citations[:10]
        )
        user_prompt = f"""
Question: {question}
Organization: {org_id}
Sources (cite only from these):
{cite_lines}

Write an answer HTML with strict citations using [id](url) after each factual claim.
If info is insufficient, say you need more data.
"""
        resp = self._client.chat.completions.create(
            model=self._model,
            temperature=0.2,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
        html = resp.choices[0].message.content or ""
        lead = "Answer prepared with citations."
        return QAAnswer(lead=lead, answer_html=html, citations=citations[:10])
