from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass
class Report:
    html: str
    summary: Dict[str, object]


class NarratorAgent:
    def __init__(self, openai_api_key: Optional[str] = None) -> None:
        self.openai_api_key = openai_api_key

    async def build_reports(self, inputs: Dict[str, object]) -> Report:
        # MVP stub: produce a minimal, branded HTML with placeholders
        html = (
            "<div style='font-family: \"Century Gothic\", Arial, sans-serif; color: #F1A501; background:#000; padding:16px'>"
            "<h1 style='font-family: \"Special Elite\", serif; color:#B30700'>MyRiskAgent Executive Brief</h1>"
            "<p>This is a preview of the executive brief. Citations are required in production.</p>"
            "</div>"
        )
        summary = {
            "headline": "Executive summary placeholder",
            "top_risks": ["Financial Health Risk ~ 42%", "Compliance and Reputation Risk ~ 35%"],
            "actions": ["Run deeper due diligence", "Engage with compliance review"],
        }
        return Report(html=html, summary=summary)
