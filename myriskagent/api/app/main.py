from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import Depends, FastAPI, UploadFile, File, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlmodel import SQLModel, create_engine

from .config import get_settings, Settings
from .search.vector import InMemoryVectorStore, DocumentUpsert
from .agents.provider_outlier import ProviderOutlierAgent
from .agents.narrator import NarratorAgent
from .agents.evidence import EvidenceAgent
from .storage.io import ObjectStore
from .risk.engine import compute_family_scores, combine_scores  # NEW: use engine

# Prometheus
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST

# Data
import io
import pandas as pd
import numpy as np


app = FastAPI(title="MyRiskAgent API", version="0.1.0")

# CORS for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Simple in-memory vector store for MVP
VECTOR_STORE = InMemoryVectorStore()

# Basic request counter
REQUEST_COUNTER = Counter("mra_requests_total", "Total HTTP requests", ["path", "method", "status"])

# Agents configured at startup
NARRATOR: Optional[NarratorAgent] = None
EVIDENCE: Optional[EvidenceAgent] = None


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    response: Response = await call_next(request)
    try:
        REQUEST_COUNTER.labels(path=request.url.path, method=request.method, status=str(response.status_code)).inc()
    except Exception:
        pass
    return response


def get_engine(settings: Settings = Depends(get_settings)):
    engine = create_engine(settings.sqlalchemy_database_uri, echo=False)
    return engine


@app.on_event("startup")
async def startup_event():
    global NARRATOR, EVIDENCE
    settings = get_settings()
    engine = create_engine(settings.sqlalchemy_database_uri, echo=False)
    SQLModel.metadata.create_all(engine)
    # Seed a couple demo documents into the vector store
    VECTOR_STORE.upsert_documents(
        [
            DocumentUpsert(id=None, org_id=1, title="ACME Q4 Results", url="https://example.com/acme-q4", content="ACME reported steady margins and lower debt."),
            DocumentUpsert(id=None, org_id=1, title="ACME Litigation Update", url="https://example.com/acme-litigation", content="A minor litigation was settled with no material impact."),
        ]
    )
    # Agents
    NARRATOR = NarratorAgent(openai_api_key=settings.openai_api_key)
    EVIDENCE = EvidenceAgent(store=ObjectStore(base_uri=settings.object_store_uri))


@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)


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
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")
    name = (file.filename or "").lower()
    try:
        if name.endswith(".parquet") or name.endswith(".pq"):
            df = pd.read_parquet(io.BytesIO(content))
        else:
            df = pd.read_csv(io.BytesIO(content))
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse file: {e}")

    # Minimal normalization for expected columns
    if "claim_amount" not in df.columns:
        for cand in ["amount", "paid_amount", "total"]:
            if cand in df.columns:
                df = df.rename(columns={cand: "claim_amount"})
                break
    if "provider_id" not in df.columns and "provider" in df.columns:
        df = df.rename(columns={"provider": "provider_id"})

    # Compute provider outliers if possible
    outliers = []
    try:
        agent = ProviderOutlierAgent()
        outliers = [o.__dict__ for o in agent.run(df[[c for c in df.columns if c in {"provider_id", "claim_amount"}]].dropna())][:10]
    except Exception:
        outliers = []

    return {"received_rows": int(len(df)), "outliers": outliers}


@app.post("/ingest/external")
async def ingest_external(req: IngestExternalRequest):
    return {"registered": True, "source": req.model_dump()}


@app.post("/risk/recompute/{org_id}/{period}")
async def risk_recompute(org_id: int, period: str):
    # Demo feature frame: 200 rows, 6 features with light trends/noise
    rng = np.random.default_rng(42)
    base = rng.normal(0, 1, size=(200, 6))
    trend = np.linspace(0, 0.5, 200).reshape(-1, 1)
    features = pd.DataFrame(base + trend, columns=[f"f{i}" for i in range(6)])
    fam = compute_family_scores(features)
    combined_score, combined_conf = combine_scores(fam)
    scores = {
        "Financial Health Risk": {"score": float(fam["Financial Health Risk"][0]), "confidence": float(fam["Financial Health Risk"][1])},
        "Compliance and Reputation Risk": {"score": float(fam["Compliance and Reputation Risk"][0]), "confidence": float(fam["Compliance and Reputation Risk"][1])},
        "Operational and Outlier Risk": {"score": float(fam["Operational and Outlier Risk"][0]), "confidence": float(fam["Operational and Outlier Risk"][1])},
        "Combined Index": {"score": float(combined_score), "confidence": float(combined_conf)},
    }
    return {"org_id": org_id, "period": period, "scores": scores}


@app.get("/risk/drivers/{org_id}/{period}")
async def risk_drivers(org_id: int, period: str):
    drivers = [
        {"name": "Margins", "value": 5.0},
        {"name": "Legal Mentions", "value": 3.0},
        {"name": "Supply Delays", "value": -2.0},
        {"name": "Online Buzz", "value": 1.0},
    ]
    return {"org_id": org_id, "period": period, "drivers": drivers}


@app.get("/scores/{org_id}/{period}")
async def get_scores(org_id: int, period: str):
    profile = await risk_recompute(org_id, period)
    items = []
    for fam, val in profile["scores"].items():
        items.append({"entity": f"org:{org_id}", "family": fam, "score": val["score"]})
    return {"org_id": org_id, "period": period, "scores": items}


@app.get("/outliers/providers")
async def outliers_providers(org_id: int = Query(...), period: str = Query(...)):
    providers = [
        {"provider_id": 101, "provider_name": "Provider A", "score": 74.2, "z_total_amount": 2.3, "z_avg_amount": 1.7, "z_n_claims": 2.9},
        {"provider_id": 102, "provider_name": "Provider B", "score": 63.5, "z_total_amount": 1.9, "z_avg_amount": 1.2, "z_n_claims": 2.1},
    ]
    return {"org_id": org_id, "period": period, "providers": providers}


@app.get("/docs/search")
async def docs_search(q: str, org_id: Optional[int] = None):
    results = VECTOR_STORE.search(q, org_id=org_id, k=5)
    for r in results:
        r.setdefault("snippet", r.get("title") or "")
    return {"query": q, "org_id": org_id, "results": results}


class AskRequest(BaseModel):
    question: str
    org_id: Optional[int] = None
    scope: list[str] = []


@app.post("/ask")
async def ask(req: AskRequest):
    results = VECTOR_STORE.search(req.question, org_id=req.org_id, k=3)
    citations = [
        {"id": str(r.get("id")), "title": r.get("title") or "", "url": r.get("url") or ""}
        for r in results
    ]
    return {"answer": "This is a placeholder answer.", "citations": citations}


@app.post("/report/executive/{org_id}/{period}")
async def report_executive(org_id: int, period: str):
    if NARRATOR is None:
        raise HTTPException(status_code=500, detail="Narrator not initialized")
    rep = await NARRATOR.build_reports({"org_id": org_id, "period": period})
    return {"html": rep.html, "summary": rep.summary}


@app.post("/report/full/{org_id}/{period}")
async def report_full(org_id: int, period: str):
    if NARRATOR is None:
        raise HTTPException(status_code=500, detail="Narrator not initialized")
    rep = await NARRATOR.build_reports({"org_id": org_id, "period": period, "mode": "full"})
    return {"html": rep.html, "summary": rep.summary}


@app.get("/evidence/{entity}/{id}/{period}")
async def get_evidence(entity: str, id: str, period: str):
    if EVIDENCE is None:
        raise HTTPException(status_code=500, detail="Evidence not initialized")
    uri = EVIDENCE.build(entity, id, period, payloads={
        "scores.json": b"{}",
        "README.txt": f"Evidence for {entity}:{id} {period}".encode("utf-8"),
    }).uri
    return {"entity": entity, "id": id, "period": period, "uri": uri}
