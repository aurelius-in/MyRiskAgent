# MyRiskAgent

Production-lean, agentic risk analysis web app. Ingests OSINT and optional internal data, computes three risk score families, explains drivers, and produces executive and full reports.

## Tech Stack
- Backend: Python 3.11, FastAPI, Uvicorn, SQLModel/SQLAlchemy, Pydantic, DuckDB
- Data/ML: numpy, pandas, scikit-learn, statsmodels, shap
- Search: pgvector (Postgres 15) or Chroma (duckdb+parquet) or in-memory fallback; keyword (BM25-ish)
- Queue/Cache: Redis (stubbed in MVP)
- Frontend: React + TypeScript + Vite + MUI + TanStack Query + ECharts
- Agents: LangGraph-style orchestration (MVP stubs) with OpenAI (GPT-5 intended)
- Observability: Prometheus + Grafana; /metrics endpoint exposed; optional OpenTelemetry OTLP traces
- Policies: OPA Rego (basic allow rules)
- Packaging: Docker Compose; Alembic for migrations

## Repository Layout
```
myriskagent/
  api/
    app/...
    alembic.ini
    migrations/
      env.py
      versions/
        0001_create_document_table.py
  web/
    ...
  infra/
    docker-compose.yml
    prometheus.yml
    grafana/dashboards/mra.json
  assets/
  data/
.env.example
```

## Environment Variables
Copy `.env.example` to `.env` and adjust values.
- DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME
- REDIS_URL
- VECTOR_BACKEND=pgvector or chroma (fallback: in-memory hashing embeddings)
- USE_OPENAI_EMBEDDINGS=true|false (optional)
- OPENAI_EMBEDDING_MODEL=text-embedding-3-small (optional)
- CHROMA_PERSIST_DIR= (optional; when VECTOR_BACKEND=chroma)
- OBJECT_STORE_URI (e.g., file:///data)
- OTEL_EXPORTER_OTLP_ENDPOINT (optional)
- NEWSAPI_KEY (optional)
- ALPHAVANTAGE_KEY (optional)
- OPENAI_API_KEY (required for narrator/QA in full build; optional for embeddings if enabled)

## Quick Start (Docker Compose)
From repo root:
```bash
docker compose -f myriskagent/infra/docker-compose.yml up -d
```
Services:
- API: http://localhost:8000 (docs via OpenAPI not enabled in MVP)
- Web (Vite dev): http://localhost:5173
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)

## Local Dev (API)
```bash
cd myriskagent/api
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

If using pgvector: ensure Postgres has the `vector` extension. If using Chroma: set `VECTOR_BACKEND=chroma` and optionally `CHROMA_PERSIST_DIR`.

To run migrations (optional; initial migration includes `document` table):
```bash
cd myriskagent/api
alembic upgrade head
```

## Local Dev (Web)
```bash
cd myriskagent/web
npm install
npm run dev
# or pnpm install && pnpm dev
```

## API Surface (MVP)
- GET `/healthz` → 200 ok
- POST `/ingest/claims` → CSV/Parquet upload; returns rows and provider outliers (if computable)
- POST `/risk/recompute/{org_id}/{period}` → builds features; supports what‑if weights `{alpha,beta,gamma,delta}` to reweight families
- GET `/risk/drivers/{org_id}/{period}` → heuristic drivers with rationales (for waterfall)
- GET `/scores/{org_id}/{period}` → list view derived from recompute
- GET `/outliers/providers?org_id=...&period=...&industry=&region=` → provider outliers (filters optional)
- GET `/providers?org_id=...` → provider aggregates (totals, avg, counts)
- GET `/providers/export?org_id=...` → CSV export of provider aggregates
- GET `/docs/search?q=...&org_id=...` → vector search top docs
- GET `/docs/search/keyword?q=...&org_id=...` → keyword/BM25 search
- POST `/agents/news` → fetch + upsert news docs (best-effort)
- POST `/agents/filings` → fetch + upsert filings docs (best-effort)
- POST `/ask` → honors `scope` (e.g., `news`, `filings`) to upsert then returns placeholder answer with citations
- POST `/report/executive/{org_id}/{period}` → stub report HTML + summary
- POST `/report/full/{org_id}/{period}` → stub full report HTML + summary
- GET `/report/pdf/{org_id}/{period}` → PDF download (placeholder)
- GET `/evidence/{entity}/{id}/{period}` → stub evidence location
- GET `/evidence/download/{entity}/{id}/{period}` → ZIP evidence download with manifest
- GET `/social/{org_id}/recent` → social events and online component
- GET `/version` → backend version
- GET `/metrics` → Prometheus metrics

## Frontend (MVP)
- Noir brand: black background, headings red `#B30700`, body yellow `#F1A501`
- Fonts: headings `Special Elite`, body `Century Gothic` with Arial fallback
- Splash: `mra-logo.gif` for 5 seconds, then app loads; AppBar shows `mra-banner-sm.png`
- Tabs: Overview, Scores, Drivers, Documents, Ask, Providers
  - Overview: combined gauge, family gauges, trend sparkline, social sparkline, What-If panel, Evidence + Download ZIP buttons
  - Scores: list + provider outliers, client CSV export, upload claims (CSV/Parquet), filters (min score, industry, region)
  - Drivers: waterfall chart driven by `/risk/drivers` with plain-language rationales
  - Documents: vector/keyword toggle, two-pane viewer, fetch news/filings; Providers page lists aggregates with sorting, filters, export (client/server)
  - Ask: prompt box, scope toggles (News/Filings), citation chips, Executive Brief/Full Report preview dialog, PDF download

## Sample Data
- `data/samples/claims_small.parquet` placeholder; provide your own CSV/Parquet for ingestion.

## Notes
- MVP can use in-memory vector store; for persistence use Postgres + pgvector or Chroma.
- Do not send internal data to external services without an allowlist.
- External crawlers and APIs are rate limited/best-effort; tenacity included for retries.

## Scripts
From repo root:
```bash
# start full dev stack
docker compose -f myriskagent/infra/docker-compose.yml up -d

# API only
uvicorn app.main:app --reload --port 8000

# Migrations (optional)
cd myriskagent/api && alembic upgrade head

# Web only
npm --prefix myriskagent/web run dev
```

## Tests
```bash
cd myriskagent/api
pytest -q
```
