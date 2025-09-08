from __future__ import annotations

from datetime import datetime
from typing import Annotated, Optional

from fastapi import Depends, FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlmodel import SQLModel, create_engine

from .config import get_settings, Settings


app = FastAPI(title="MyRiskAgent API", version="0.1.0")

# CORS for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_engine(settings: Settings = Depends(get_settings)):
    engine = create_engine(settings.sqlalchemy_database_uri, echo=False)
    return engine


@app.on_event("startup")
async def startup_event():
    settings = get_settings()
    engine = create_engine(settings.sqlalchemy_database_uri, echo=False)
    SQLModel.metadata.create_all(engine)


@app.get("/healthz")
async def healthz():
    return {"status": "ok", "time": datetime.utcnow().isoformat()}


class IngestExternalRequest(BaseModel):
    org_id: int
    type: str
    endpoint: Optional[str] = None
    params: dict = {}


@app.post("/ingest/claims")
async def ingest_claims(file: UploadFile = File(...)):
    # MVP: accept file and return basic receipt
    content = await file.read()
    size = len(content)
    if size == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    return {"received_bytes": size, "filename": file.filename}


@app.post("/ingest/external")
async def ingest_external(req: IngestExternalRequest):
    return {"registered": True, "source": req.model_dump()}


@app.post("/risk/recompute/{org_id}/{period}")
async def risk_recompute(org_id: int, period: str):
    # Placeholder response for smoke test
    return {
        "org_id": org_id,
        "period": period,
        "scores": {
            "Financial Health Risk": {"score": 42.0, "confidence": 0.7},
            "Compliance and Reputation Risk": {"score": 35.0, "confidence": 0.6},
            "Operational and Outlier Risk": {"score": 50.0, "confidence": 0.65},
            "Combined Index": {"score": 44.0, "confidence": 0.66},
        },
    }


@app.get("/scores/{org_id}/{period}")
async def get_scores(org_id: int, period: str):
    return {"org_id": org_id, "period": period, "scores": []}


@app.get("/outliers/providers")
async def outliers_providers(org_id: int, period: str):
    return {"org_id": org_id, "period": period, "providers": []}


@app.get("/docs/search")
async def docs_search(q: str, org_id: Optional[int] = None):
    return {"query": q, "org_id": org_id, "results": []}


class AskRequest(BaseModel):
    question: str
    org_id: Optional[int] = None
    scope: list[str] = []


@app.post("/ask")
async def ask(req: AskRequest):
    return {"answer": "This is a placeholder answer.", "citations": []}


@app.get("/evidence/{entity}/{id}/{period}")
async def get_evidence(entity: str, id: str, period: str):
    return {"entity": entity, "id": id, "period": period, "uri": None}
