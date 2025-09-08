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

# Prometheus
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST


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
    size = len(content)
    if size == 0:
        raise HTTPException(status_code=400, detail="Empty file")
    return {"received_bytes": size, "filename": file.filename}


@app.post("/ingest/external")
async def ingest_external(req: IngestExternalRequest):
    return {"registered": True, "source": req.model_dump()}


@app.post("/risk/recompute/{org_id}/{period}")
async def risk_recompute(org_id: int, period: str):
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


@app.get("/evidence/{entity}/{id}/{period}")
async def get_evidence(entity: str, id: str, period: str):
    return {"entity": entity, "id": id, "period": period, "uri": None}
