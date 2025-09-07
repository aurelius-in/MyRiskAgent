# MyRiskAgent

**Production-grade agentic risk analysis platform** that ingests claims, filings, and open-source signals to compute provider- and company-level risk with peer-normalized outlier detection and evidence-rich explanations. Built for real workloads: FastAPI, Postgres/pgvector, DuckDB, Redis, and LangGraph-style agent orchestration.

> Outcomes first: faster investigations, fewer false positives, and “show me the receipts” evidence packs for every score.

---

## Why it’s different

* **Agentic workflow**: specialized agents fetch filings/news, compute outliers, and draft exec-ready briefs with citations.
* **Defensible math**: robust peer normalization, anomaly ensemble, trend shift detection, and SHAP explanations.
* **Evidence on tap**: one click to export the exact rows, codes, and plots that drove a score.
* **Operates at enterprise scale**: streaming ingestion, cached features, vector search for documents, and full tracing.
* **Governed by design**: OPA/Rego policies, PHI guards, immutable audit trails, and reproducible runs.

---

## Architecture at a glance

```
                 ┌──────────────────────────┐
 Raw Sources ───▶│ Ingest (FastAPI workers) │──▶ Object Store (S3/Azure)
  • Claims CSV   └──────────┬───────────────┘
  • EDI/Parquet              │                         ┌──────────────┐
  • SEC 10-K/8-K             │ Features + Scores       │   Grafana    │
  • News/OSINT               ▼                         │ + Prometheus │
                     ┌───────────────────┐             └──────┬───────┘
                     │   Feature Store   │◀──DuckDB/SQL───┐   │
                     │ Postgres (+jsonb) │                │   │ OpenTelemetry
                     └────────┬──────────┘                │   │ LangSmith
                              │                           │   │
                        pgvector (docs)                   │   │
                              │                           │   │
                              ▼                           │   │
                  ┌────────────────────┐                  │   │
                  │  Risk Engine (Py) │◀── Redis Queue ──┘   │
                  │  IForest, LOF,    │
                  │  STL trend, SHAP  │
                  └─────────┬─────────┘
                            │ REST/JSON
                            ▼
                     ┌───────────────┐
                     │   Web (React) │
                     │  MUI + ECharts│
                     └───────┬───────┘
                             │
                             ▼
                        End Users
```

---

## Core capabilities

* **Provider Outlier Scores** (0–100) with top drivers, peer deltas, and time-series shifts.
* **Company Roll-ups** by line of business, specialty, and region.
* **What-if Controls** to tune weights and cohorts, updating scores and waterfalls instantly.
* **Document Intelligence** pulls risk-relevant snippets from 10-K/8-K and recent news, searchable via embeddings.
* **Evidence Packs** (ZIP): dataset hashes, parameters, SHAP summaries, CSV slices, and plots, signed for integrity.

---

## Risk scoring (concise spec)

### Features per provider, per period

* **Volume/Intensity**: claim counts, allowed/paid, RVUs per CPT, units/visit.
* **Coding Mix**: CPT/HCPCS distributions, modifiers, place of service, upcoding indicators.
* **Financial**: reimbursement per CPT, denial/refund/recoup patterns.
* **Peer Context**: same specialty + region + payer mix.
* **Drift/Trend**: MoM deltas, seasonal residuals, change-points.

### Peer-robust normalization

For feature $x$, with peer median and MAD:

$$
z = \frac{x - \text{median}}{1.4826(\text{MAD} + \epsilon)} \quad \text{(clip } |z| \le 10\text{)}
$$

### Anomaly ensemble

* IsolationForest score $a_{iso}$
* Local Outlier Factor score $a_{lof}$
* Top-K deviation $d$ = mean of largest $|z|$ across fraud-relevant features
* Trend spike score $t$ from STL residuals / change-points

### Risk score (0–100)

$$
S = 100 \cdot \sigma\big( \alpha a_{iso} + \beta a_{lof} + \gamma \tfrac{d}{10} + \delta t \big)
$$

Default weights: $\alpha=.35,\ \beta=.15,\ \gamma=.35,\ \delta=.15$. Exposed in the UI, learnable with labeled data.

### Company aggregation

$$
S_{\text{company}} = \sum_i w_i S_i \quad \text{with } w_i \propto \text{exposure} \ (\text{paid},\ \text{member-months},\ \ldots)
$$

### Explainability

* Global and local **SHAP** values; plain-English rationales (“99214 usage 3.1× peer median; +12.4 to risk”).
* Evidence pack for each score.

---

## Agents (LangGraph-style)

* **OSINTAgent**: recent news, sanctions, enforcement actions → embeddings + citations.
* **FilingsAgent**: 10-K/10-Q/8-K sections, KPIs, compliance highlights.
* **ProviderOutlierAgent**: orchestrates feature builds, ensemble scoring, and evidence packs.
* **NarratorAgent**: exec brief: “what changed, why, actions to take,” with linked sources.
* **ComplianceAgent**: OPA-enforced PHI rules, access scopes, redaction, export limits.

---

## Tech stack

* **Backend**: Python 3.11+, FastAPI, Pydantic, Uvicorn, SQLModel/SQLAlchemy
* **ML**: scikit-learn, statsmodels (STL), shap, numpy/pandas
* **Storage**: Postgres 15 (+jsonb, +pgvector), DuckDB, Redis
* **Docs/Vector**: pgvector or Chroma (optional)
* **Frontend**: React + TypeScript, MUI, TanStack Query, ECharts
* **Ops**: Docker Compose, OpenTelemetry, LangSmith (traces), Prometheus/Grafana, OPA/Rego

---

## Quick start

### Prereqs

* Docker + Docker Compose
* Python 3.11+ and Node 20+ (if running without containers)

### Clone

```bash
git clone https://github.com/<you>/MyRiskAgent.git
cd MyRiskAgent
```

### Configure environment

Create `.env` at repo root:

```env
# Postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=myrisk
DB_PASS=myrisk
DB_NAME=myrisk

# Redis
REDIS_URL=redis://localhost:6379/0

# Object store (local/minio or Azure/AWS)
OBJECT_STORE_URI=file:///data/artifacts
# e.g. s3://bucket/prefix or az://container/prefix

# Tracing (optional)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
LANGSMITH_API_KEY=
```

### Bring up infrastructure

```bash
docker compose up -d
# services: postgres, redis, grafana, prometheus, (optional) minio
```

### Initialize DB and sample data

```bash
# from repo root
make migrate         # or: alembic upgrade head
make seed-sample     # loads data/samples/claims_small.parquet
```

### Run the API

```bash
# with Python locally
cd api
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Run the web app

```bash
cd web
pnpm install
pnpm dev  # http://localhost:5173 (proxy to :8000 for /api)
```

---

## API surface (initial)

```
POST   /ingest/claims                  # Upload CSV/Parquet of claims
POST   /risk/recompute/{org_id}/{prd}  # Rebuild features, recompute scores
GET    /providers/{provider_id}/score/{prd}
GET    /orgs/{org_id}/summary/{prd}
GET    /orgs/{org_id}/outliers?prd=...&limit=100
GET    /evidence/{entity_type}/{id}/{prd}   # signed ZIP of evidence
GET    /docs/search?q=...                   # filings/news semantic search
```

Example response:

```json
{
  "entity_type": "provider",
  "entity_id": "f1b2e3...",
  "period": "2025-06",
  "score": 82.4,
  "components": {"iso": 0.77, "lof": 0.32, "topk": 0.68, "trend": 0.19},
  "top_contributors": [
    {"feature":"CPT_99214_rate","effect":12.4,"rationale":"3.1× peer median"},
    {"feature":"units_per_visit","effect":7.9,"rationale":"+2.4σ vs cohort"}
  ],
  "evidence_uri": "s3://.../evidence/provider/f1b2e3/2025-06.zip"
}
```

---

## Minimal schema (Postgres)

```sql
create table providers (
  provider_id uuid primary key,
  npi text, name text, specialty text, region text, org_id uuid
);

create table claims (
  claim_id uuid primary key,
  provider_id uuid references providers(provider_id),
  service_date date,
  cpt text, modifier text,
  allowed numeric, paid numeric, units int,
  place_of_service text, payer text
);

create table provider_features (
  provider_id uuid, period date, feature jsonb,
  primary key (provider_id, period)
);

create table risk_scores (
  entity_type text, entity_id uuid, period date,
  score numeric, components jsonb, weights jsonb,
  evidence_uri text, model_version text,
  created_at timestamptz default now(),
  primary key (entity_type, entity_id, period)
);
```

---

## Project structure

```
myriskagent/
  api/
    app/main.py
    app/risk/engine.py
    app/risk/explain.py
    app/storage/
    tests/
  web/
    src/
      components/
      features/risk/
      lib/api.ts
    vite.config.ts
  infra/
    docker-compose.yml
    opa/policies.rego
    grafana/dashboards/
  data/
    samples/claims_small.parquet
  README.md
```

---

## Operations, governance, and trust

* **Auditability**: every score links to its dataset hashes, parameters, seed, and SHAP summary. Evidence ZIPs are signed.
* **OPA/Rego**: enforce PHI access scopes, redaction, and export controls in the API gateway.
* **Observability**: OpenTelemetry spans around agent/tool calls and risk pipeline stages; Grafana dashboards for latency, throughput, and queue depth.
* **Reproducibility**: deterministic seeds, pinned versions, and snapshotting of inputs to object storage.

---

## Roadmap

* [ ] **MVP**: ingestion → feature build → ensemble score → Outliers table + gauge/waterfall
* [ ] **Explainability**: SHAP visualizations, downloadable evidence packs
* [ ] **Documents**: filings/news ingestion, semantic search, side-by-side highlights
* [ ] **What-if**: live weight/cohort sliders with cached recomputes
* [ ] **Hardening**: OPA policies, structured logs, rate limits, perf on 10–50M rows
* [ ] **Packaging**: Helm charts, Terraform examples, cloud object stores

---

## Development notes

* Prefer **DuckDB** for fast intermediate aggregates; persist golden features to Postgres.
* Keep **feature registry** explicit (names, types, cohorts) to stabilize SHAP attributions.
* Use **batch + incremental** strategies: nightly full recompute with streaming deltas during the day.
* Treat **peer cohort selection** as a first-class input (specialty, region, payer mix, time window).

---

## Security

* Designed for PHI: strict table-level and row-level access, encryption at rest, OPA-guarded exports.
* No public endpoints by default; all services are private/network-restricted.

---

## License

MIT (placeholder). See `LICENSE`.

---

## Contact

Oliver A. Ellison • [oliveraellison@gmail.com](mailto:oliveraellison@gmail.com) • LinkedIn: [https://www.linkedin.com/in/oellison/](https://www.linkedin.com/in/oellison/)
