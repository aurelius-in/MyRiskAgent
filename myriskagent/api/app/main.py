from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import Depends, FastAPI, UploadFile, File, HTTPException, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import io as _io_for_pdf
from pydantic import BaseModel
from sqlmodel import SQLModel, create_engine

from .config import get_settings, Settings
from .search.vector import InMemoryVectorStore, DocumentUpsert, PgVectorStore  # updated import
from .agents.provider_outlier import ProviderOutlierAgent
from .agents.narrator import NarratorAgent
from .agents.evidence import EvidenceAgent
from .storage.io import ObjectStore
from .risk.engine import compute_family_scores, combine_scores  # NEW: use engine
from .agents.news import NewsAgent
from .agents.filings import FilingsAgent
from .agents.sanctions import SanctionsAgent
from .search.keyword import bm25_score
from .telemetry import init_tracing, get_tracer

# Prometheus
from prometheus_client import Counter, generate_latest, CONTENT_TYPE_LATEST

# Data
import io
import pandas as pd
import numpy as np
import asyncio


app = FastAPI(title="MyRiskAgent API", version="0.1.0")

# CORS for dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Simple vector store (configured at startup)
VECTOR_STORE: InMemoryVectorStore | PgVectorStore | None = None

# Basic request counter
REQUEST_COUNTER = Counter("mra_requests_total", "Total HTTP requests", ["path", "method", "status"])

# Agents configured at startup
NARRATOR: Optional[NarratorAgent] = None
EVIDENCE: Optional[EvidenceAgent] = None

# In-memory claims store for MVP
CLAIMS_BY_ORG: dict[int, pd.DataFrame] = {}

# In-memory documents for keyword search (MVP)
DOCS: list[dict] = []

VERSION = "0.1.0"

@app.get("/version")
async def version():
    return {"version": VERSION, "time": datetime.utcnow().isoformat()}


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


async def _scheduler_loop():
    while True:
        try:
            # Fetch recent news for default org context and upsert
            agent = NewsAgent(api_key=get_settings().newsapi_key)
            res = await agent.search("ACME")
            if VECTOR_STORE is not None:
                docs = [
                    DocumentUpsert(id=None, org_id=1, title=it.get("text"), url=it.get("id"), content=it.get("text", ""))
                    for it in res.embeds
                ]
                if docs:
                    VECTOR_STORE.upsert_documents(docs)
                    # mirror to in-memory DOCS for keyword search
                    for it in res.embeds:
                        DOCS.append({
                            "id": len(DOCS) + 1,
                            "org_id": 1,
                            "title": it.get("text"),
                            "url": it.get("id"),
                            "content": it.get("text", ""),
                        })
        except Exception:
            # Best-effort scheduler; ignore errors
            pass
        # Sleep for 1 hour
        await asyncio.sleep(3600)


@app.on_event("startup")
async def startup_event():
    global NARRATOR, EVIDENCE, VECTOR_STORE, DOCS
    settings = get_settings()

    # Initialize tracing if configured
    init_tracing("myriskagent-api", settings.otel_exporter_otlp_endpoint)
    tracer = get_tracer("startup")

    engine = create_engine(settings.sqlalchemy_database_uri, echo=False)
    SQLModel.metadata.create_all(engine)

    with tracer.start_as_current_span("configure_vector_store"):
        # Configure vector store backend
        if settings.vector_backend == "pgvector":
            with engine.begin() as conn:
                try:
                    conn.exec_driver_sql("CREATE EXTENSION IF NOT EXISTS vector;")
                except Exception:
                    pass
            VECTOR_STORE = PgVectorStore(settings.sqlalchemy_database_uri)
        else:
            VECTOR_STORE = InMemoryVectorStore()

    with tracer.start_as_current_span("seed_documents"):
        seed_docs = [
            {"id": 1, "org_id": 1, "title": "ACME Q4 Results", "url": "https://example.com/acme-q4", "content": "ACME reported steady margins and lower debt."},
            {"id": 2, "org_id": 1, "title": "ACME Litigation Update", "url": "https://example.com/acme-litigation", "content": "A minor litigation was settled with no material impact."},
        ]
        DOCS = seed_docs.copy()
        if VECTOR_STORE is not None:
            VECTOR_STORE.upsert_documents([
                DocumentUpsert(id=None, org_id=d["org_id"], title=d["title"], url=d["url"], content=d["content"]) for d in seed_docs
            ])

    # Agents
    NARRATOR = NarratorAgent(openai_api_key=settings.openai_api_key)
    EVIDENCE = EvidenceAgent(store=ObjectStore(base_uri=settings.object_store_uri))

    asyncio.create_task(_scheduler_loop())


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
async def ingest_claims(file: UploadFile = File(...), org_id: int = Query(1)):
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

    if "claim_amount" not in df.columns:
        for cand in ["amount", "paid_amount", "total"]:
            if cand in df.columns:
                df = df.rename(columns={cand: "claim_amount"})
                break
    if "provider_id" not in df.columns and "provider" in df.columns:
        df = df.rename(columns={"provider": "provider_id"})

    # Save to in-memory store
    try:
        CLAIMS_BY_ORG[org_id] = df.copy()
    except Exception:
        pass

    # Compute provider outliers if possible
    outliers = []
    try:
        agent = ProviderOutlierAgent()
        outliers = [o.__dict__ for o in agent.run(df[[c for c in df.columns if c in {"provider_id", "claim_amount"}]].dropna())][:10]
    except Exception:
        outliers = []

    return {"org_id": org_id, "received_rows": int(len(df)), "outliers": outliers}


@app.post("/ingest/external")
async def ingest_external(req: IngestExternalRequest):
    return {"registered": True, "source": req.model_dump()}


@app.post("/risk/recompute/{org_id}/{period}")
async def risk_recompute(org_id: int, period: str):
    tracer = get_tracer("risk")
    with tracer.start_as_current_span("build_features"):
        rng = np.random.default_rng(42)
        base = rng.normal(0, 1, size=(200, 6))
        trend = np.linspace(0, 0.5, 200).reshape(-1, 1)
        features = pd.DataFrame(base + trend, columns=[f"f{i}" for i in range(6)])
    with tracer.start_as_current_span("compute_scores"):
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
async def outliers_providers(
    org_id: int = Query(...),
    period: str = Query(...),
    industry: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
):
    # If claims are available, compute outliers; otherwise return demo
    try:
        df = CLAIMS_BY_ORG.get(org_id)
        if df is not None and not df.empty:
            filt_df = df
            if industry is not None and "industry" in filt_df.columns:
                filt_df = filt_df[filt_df["industry"].astype(str) == str(industry)]
            if region is not None and "region" in filt_df.columns:
                filt_df = filt_df[filt_df["region"].astype(str) == str(region)]
            if filt_df.empty:
                return {"org_id": org_id, "period": period, "providers": []}
            agent = ProviderOutlierAgent()
            rows = agent.run(
                filt_df[[c for c in filt_df.columns if c in {"provider_id", "claim_amount"}]].dropna()
            )
            providers = [
                {
                    "provider_id": r.provider_id,
                    "provider_name": f"Provider {r.provider_id}",
                    "score": r.score,
                    **r.details,
                }
                for r in rows
            ]
            providers = sorted(providers, key=lambda x: x["score"], reverse=True)[:25]
            return {"org_id": org_id, "period": period, "providers": providers}
    except Exception:
        pass
    providers = [
        {"provider_id": 101, "provider_name": "Provider A", "score": 74.2, "z_total_amount": 2.3, "z_avg_amount": 1.7, "z_n_claims": 2.9},
        {"provider_id": 102, "provider_name": "Provider B", "score": 63.5, "z_total_amount": 1.9, "z_avg_amount": 1.2, "z_n_claims": 2.1},
    ]
    return {"org_id": org_id, "period": period, "providers": providers}


@app.get("/providers/{provider_id}/detail")
async def provider_detail(provider_id: int, org_id: int = Query(...)):
    df = CLAIMS_BY_ORG.get(org_id)
    if df is None or df.empty:
        return {"provider_id": provider_id, "org_id": org_id, "count": 0, "total": 0.0, "avg": 0.0, "series": []}
    pdf = df[df.get("provider_id") == provider_id]
    if pdf.empty:
        return {"provider_id": provider_id, "org_id": org_id, "count": 0, "total": 0.0, "avg": 0.0, "series": []}
    total = float(pdf["claim_amount"].sum())
    count = int(pdf["claim_amount"].count())
    avg = float(pdf["claim_amount"].mean())
    # time series by date if present
    series = []
    if "claim_date" in pdf.columns:
        try:
            s = (
                pdf.assign(claim_date=pd.to_datetime(pdf["claim_date"]))
                .groupby(pd.Grouper(key="claim_date", freq="D"))["claim_amount"].sum()
                .reset_index()
            )
            series = [{"date": d.strftime("%Y-%m-%d"), "amount": float(v)} for d, v in zip(s["claim_date"], s["claim_amount"])]
        except Exception:
            pass
    return {"provider_id": provider_id, "org_id": org_id, "count": count, "total": total, "avg": avg, "series": series}


@app.get("/docs/search")
async def docs_search(q: str, org_id: Optional[int] = None):
    if VECTOR_STORE is None:
        raise HTTPException(status_code=500, detail="Vector store not initialized")
    results = VECTOR_STORE.search(q, org_id=org_id, k=5)
    for r in results:
        r.setdefault("snippet", r.get("title") or "")
    return {"query": q, "org_id": org_id, "results": results}


@app.get("/docs/search/keyword")
async def docs_search_keyword(q: str, org_id: Optional[int] = None):
    # Collect in-memory docs for this org (or all)
    corpus = [(str(d.get("id")), f"{d.get('title','')}\n{d.get('content','')}") for d in DOCS if org_id is None or d.get("org_id") == org_id]
    ranked = bm25_score(q, corpus)
    # Map back to doc entries
    top = []
    for doc_id, score in ranked[:10]:
        for d in DOCS:
            if str(d.get("id")) == doc_id:
                top.append({"id": d.get("id"), "title": d.get("title"), "url": d.get("url"), "snippet": d.get("content"), "score": score})
                break
    return {"query": q, "org_id": org_id, "results": top}


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


@app.get("/report/pdf/{org_id}/{period}")
async def report_pdf(org_id: int, period: str):
    try:
        from reportlab.pdfgen import canvas  # type: ignore
    except Exception as e:  # pragma: no cover
        raise HTTPException(status_code=500, detail=f"PDF generation not available: {e}")

    buffer = _io_for_pdf.BytesIO()
    c = canvas.Canvas(buffer)
    c.setTitle(f"MyRiskAgent Report {org_id} {period}")
    c.setFont("Helvetica-Bold", 16)
    c.drawString(72, 800, "MyRiskAgent Report")
    c.setFont("Helvetica", 11)
    c.drawString(72, 780, f"Org: {org_id}  Period: {period}")
    c.drawString(72, 760, "This is a minimal PDF placeholder for the full report.")
    c.showPage()
    c.save()
    buffer.seek(0)
    headers = {"Content-Disposition": f"attachment; filename=report_{org_id}_{period}.pdf"}
    return StreamingResponse(buffer, media_type="application/pdf", headers=headers)


@app.get("/evidence/{entity}/{id}/{period}")
async def get_evidence(entity: str, id: str, period: str):
    if EVIDENCE is None:
        raise HTTPException(status_code=500, detail="Evidence not initialized")
    uri = EVIDENCE.build(entity, id, period, payloads={
        "scores.json": b"{}",
        "README.txt": f"Evidence for {entity}:{id} {period}".encode("utf-8"),
    }).uri
    return {"entity": entity, "id": id, "period": period, "uri": uri}


class AgentFetchRequest(BaseModel):
    query: Optional[str] = None
    ticker: Optional[str] = None
    org: Optional[str] = None

@app.post("/agents/news")
async def agents_news(req: AgentFetchRequest):
    tracer = get_tracer("agents.news")
    if VECTOR_STORE is None:
        raise HTTPException(status_code=500, detail="Vector store not initialized")
    agent = NewsAgent(api_key=get_settings().newsapi_key)
    q = req.query or req.org or ""
    with tracer.start_as_current_span("fetch_news"):
        res = await agent.search(q)
    docs = []
    for it in res.embeds:
        docs.append(DocumentUpsert(id=None, org_id=1, title=it.get("text"), url=it.get("id"), content=it.get("text", "")))
    with tracer.start_as_current_span("upsert_docs"):
        count = VECTOR_STORE.upsert_documents(docs)
    for it in res.embeds:
        DOCS.append({"id": len(DOCS) + 1, "org_id": 1, "title": it.get("text"), "url": it.get("id"), "content": it.get("text", "")})
    return {"fetched": len(res.items), "upserted": count}

@app.post("/agents/filings")
async def agents_filings(req: AgentFetchRequest):
    if VECTOR_STORE is None:
        raise HTTPException(status_code=500, detail="Vector store not initialized")
    if not req.ticker and not req.org:
        raise HTTPException(status_code=400, detail="ticker or org required")
    agent = FilingsAgent()
    res = await agent.fetch(org=req.org or req.ticker or "", ticker=req.ticker)
    docs = []
    for it in res.embeds:
        docs.append(DocumentUpsert(id=None, org_id=1, title=it.get("text"), url=it.get("id"), content=it.get("text", "")))
    count = VECTOR_STORE.upsert_documents(docs)
    for it in res.embeds:
        DOCS.append({"id": len(DOCS) + 1, "org_id": 1, "title": it.get("text"), "url": it.get("id"), "content": it.get("text", "")})
    return {"upserted": count, "snippets": len(res.snippets)}

class SanctionsRequest(BaseModel):
    name: str

@app.post("/agents/sanctions")
async def agents_sanctions(req: SanctionsRequest):
    agent = SanctionsAgent()
    flags = await agent.check(req.name)
    return {"count": len(flags), "flags": [f.__dict__ for f in flags]}
