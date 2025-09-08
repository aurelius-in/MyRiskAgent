# MyRiskAgent

Production-lean, agentic risk analysis web app. Ingests OSINT and optional internal data, computes three risk score families, explains drivers, and produces executive and full reports.

## Tech Stack
- Backend: Python 3.11, FastAPI, Uvicorn, SQLModel/SQLAlchemy, Pydantic, DuckDB
- Data/ML: numpy, pandas, scikit-learn, statsmodels, shap
- Search: pgvector (Postgres 15) or in-memory fallback; keyword (BM25-ish)
- Queue/Cache: Redis (stubbed in MVP)
- Frontend: React + TypeScript + Vite + MUI + TanStack Query + ECharts
- Agents: LangGraph-style orchestration (MVP stubs) with OpenAI (GPT-5 intended)
- Observability: Prometheus + Grafana; /metrics endpoint exposed
- Policies: OPA Rego (basic allow rules)
- Packaging: Docker Compose

## Repository Layout
```
myriskagent/
  api/
    app/...
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
- VECTOR_BACKEND=pgvector or chroma (MVP uses in-memory hash embeddings)
- OBJECT_STORE_URI (e.g., file:///data)
- OTEL_EXPORTER_OTLP_ENDPOINT (optional)
- NEWSAPI_KEY (optional)
- ALPHAVANTAGE_KEY (optional)
- OPENAI_API_KEY (required for GPT-5 Narrator/QA in full build)

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
- POST `/risk/recompute/{org_id}/{period}` → demo scores payload
- GET `/risk/drivers/{org_id}/{period}` → demo drivers (for waterfall)
- GET `/scores/{org_id}/{period}` → list view derived from recompute
- GET `/outliers/providers?org_id=...&period=...` → demo provider outliers
- GET `/docs/search?q=...&org_id=...` → vector search top docs (in-memory)
- POST `/ask` → placeholder answer with citations
- POST `/report/executive/{org_id}/{period}` → stub report HTML + summary
- GET `/evidence/{entity}/{id}/{period}` → stub evidence location
- GET `/metrics` → Prometheus metrics

## Frontend (MVP)
- Noir brand: black background, headings red `#B30700`, body yellow `#F1A501`
- Fonts: headings `Special Elite`, body `Century Gothic` with Arial fallback
- Splash: `mra-logo.gif` for 5 seconds, then app loads; AppBar shows `mra-banner-sm.png`
- Tabs: Overview, Scores, Drivers, Documents, Ask
  - Overview: combined gauge, family gauges, trend sparkline, What-If panel, evidence button
  - Scores: list + provider outliers, export CSV (client-side)
  - Drivers: waterfall chart driven by `/risk/drivers`
  - Documents: search with two-pane viewer
  - Ask: prompt box, citation chips, Executive Brief preview dialog

## Sample Data
- `data/samples/claims_small.parquet` placeholder; provide your own CSV/Parquet for ingestion.

## Notes
- MVP uses in-memory vector store and demo endpoints; swap to Postgres + pgvector for production.
- Do not send internal data to external services without an allowlist.
- External crawlers and APIs should be rate limited and retried (tenacity included).

## Scripts
From repo root:
```bash
# start full dev stack
docker compose -f myriskagent/infra/docker-compose.yml up -d

# API only
yuvicorn app.main:app --reload --port 8000

# Web only
npm --prefix myriskagent/web run dev
```

## Tests
```bash
cd myriskagent/api
pytest -q
```
