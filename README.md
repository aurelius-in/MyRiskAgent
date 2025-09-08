Awesome. Here’s an **updated README.md** you can drop in now. It keeps everything strong from the last version and adds what you asked for: multi-source online intelligence, risk-score families, “Ask MyRiskAgent,” agent roster, design system (fonts/colors), and options for orgs to upload their own data.

---

# MyRiskAgent

**Agentic risk analysis platform** that ingests claims, filings, finance data, news, and OSINT to compute provider and company risk with peer-normalized outlier detection and evidence-rich explanations. Built for production workloads on FastAPI, Postgres/pgvector, DuckDB, Redis, and LangGraph-style orchestration. GPT-5 summarizes findings into executive briefs and full reports with citations.

> Faster investigations, fewer false positives, and “show me the receipts” evidence packs for every score.

---

## Why it’s different

* **Agentic workflow** that searches the public web and your permitted data, then drafts reports with sources.
* **Defensible math** with robust peer normalization, anomaly ensembles, trend shift detection, and SHAP explanations.
* **Evidence on tap** with the exact rows, codes, timelines, and plots that drove a score.
* **Enterprise posture** with tracing, governance policies, and reproducible runs.

---

## Design system

* **Colors:**

  * Primary Red `#B30700`
  * Accent Yellow `#F1A501`
  * Background Black `#000000`
* **Typography:**

  * Headings use an aged typewriter look (recommend Google font **Special Elite** or **IM Fell English** as a stand-in for “aged typeface”).
  * Body copy and UI controls use **Century Gothic** (fallback: `CenturyGothic, AppleGothic, Arial, sans-serif`).
* **Brand wordmark:** My and Agent set in sans-serif. Risk set in a bold aged typewriter face.
* **CSS tokens:**

  ```css
  :root{
    --mra-red:#B30700; --mra-yellow:#F1A501; --mra-black:#000000;
    --font-heading:"Special Elite", "IM Fell English", "Courier New", monospace;
    --font-body:"Century Gothic","AppleGothic","Arial",sans-serif;
  }
  body{ background:#000; color:#fff; font-family:var(--font-body); }
  h1,h2,h3{ font-family:var(--font-heading); color:var(--mra-yellow); }
  .cta{ background:var(--mra-red); color:#000; }
  a{ color:var(--mra-yellow); }
  ```

---

## Data sources

No proprietary data is required. Public and online sources are supported out of the box. Your organization can optionally upload its own data to improve accuracy.

**Public web and datasets**

* **Filings:** SEC EDGAR 10-K, 10-Q, 8-K.
* **Finance:** Yahoo Finance style endpoints via `yfinance` or equivalent, Alpha Vantage, Stooq.
* **News:** GDELT 2.1, News API, Common Crawl based feeds.
* **Knowledge bases:** Wikipedia, Wikidata.
* **Sanctions and enforcement:** OFAC SDN, OpenSanctions, HHS OIG exclusions.
* **Healthcare sample:** Medicare Provider Utilization and Payment Data PUF for provider outlier prototypes.
* **Social signals:** X via snscrape or authorized APIs, Reddit API, YouTube Data API, public RSS, company blogs.

**Your optional data**

* Claims or billing history CSV or Parquet.
* Policy exceptions, incidents, audit flags.
* Customer tickets, escalation logs.

---

## Risk score families

Three score families compute percent risk on 0 to 100 scale. 100 means do not engage. 0 means risk free which does not exist in real life.

1. **Financial Health Risk**
   Liquidity stress, leverage, revenue volatility, abrupt margin changes, filings sentiment.

2. **Compliance and Reputation Risk**
   Sanctions, enforcement, lawsuit mentions, adverse media, social sentiment spikes, governance red flags.

3. **Operational and Outlier Risk**
   Provider or unit level anomalies, volume and coding outliers, sudden pattern shifts, SLA breaches.

Optional specialized score:

* **Provider Billing Outlier Risk** when healthcare data is available.

**Final profile** contains each score, confidence, drivers, and a combined **Engagement Index**.

---

## Scoring method overview

* For each feature $x$, compute peer median and MAD within a cohort and produce robust $z$ scores
  $z = (x - \text{median}) / (1.4826\cdot(\text{MAD}+\epsilon))$ with clipping.
* Build an anomaly ensemble with IsolationForest, Local Outlier Factor, top-K deviation of $|z|$, and a trend spike score using STL and change-point detection.
* Online signals get **recency decay** $w_t = \exp(-\lambda \Delta t)$ and source credibility weights.
* Per family score $S_f = \sigma(\alpha a_{iso} + \beta a_{lof} + \gamma d + \delta t + \eta c_{online}) \times 100$.
* Combine families into a profile with exposure weights, then write all components to the evidence pack.

---

## Ask MyRiskAgent

A natural language surface that answers questions about any company using online sources and your optional data.

* Query routing chooses tools based on intent.
* Retrieval pulls facts and documents from the vector store and structured tables.
* GPT-5 writes a cited answer, an executive brief, or a full report.
* Everything includes links to sources and artifacts.

Example prompt shown in the app:

> **Ask MyRiskAgent** a question about risk. MyRiskAgent will search filings, finance, news, OSINT, Wikipedia, social activity, and your permitted internal data to answer. You can also search by company name or risk type.

---

## Agent graph

All agents run under policy guardrails and are fully traced.

* **FilingsAgent**
  Ingests SEC filings, extracts risk sections, MD\&A, liquidity notes, and builds KPIs.

* **FinanceAgent**
  Fetches prices, returns, volatility, distress indicators, and calculates financial features.

* **NewsAgent**
  Searches GDELT or News API, clusters events, de-duplicates, and scores sentiment and severity.

* **SocialAgent**
  Pulls public social mentions through approved endpoints, detects spikes and anomalies.

* **SanctionsAgent**
  Checks OFAC, OpenSanctions, and HHS OIG for entity and affiliate matches.

* **WikipediaAgent**
  Pulls infobox and history with change detection. Cross-links to filings and news.

* **ProviderOutlierAgent**
  Builds features from claims or billing data, runs anomaly ensemble, and prepares SHAP explanations.

* **NarratorAgent**
  Uses GPT-5 to draft an **Executive Brief** or **Full Report** with citations and score explanations.

* **QAAssistantAgent**
  Powers the “Ask” box, returns cited answers with quick charts.

* **ComplianceAgent**
  Applies OPA policies, PHI redaction, rate limits, and export controls.

* **EvidenceAgent**
  Packages CSV slices, score components, SHAP plots, parameters, and dataset hashes into a signed ZIP.

---

## Frontend

* React with TypeScript and MUI.
* Headings set in aged typewriter font, body set in Century Gothic.
* Color tokens from the design system above.
* Tabs: Overview, Scores, Drivers, Documents, Q\&A.
* What-if panel to adjust weights and cohorts.
* Export buttons for Executive Brief and Full Report.

---

## API surface

```
POST /ingest/claims
POST /ingest/external           # register RSS, GDELT, SEC, Finance sources
POST /risk/recompute/{org_id}/{period}
GET  /scores/{org_id}/{period}  # returns all family scores + combined index
GET  /outliers/providers?org_id=...&period=...
GET  /docs/search?q=...&org_id=...
POST /ask                       # {org_id?, question} -> cited answer
GET  /evidence/{entity}/{id}/{period}
```

**Ask payload**

```json
{ "question":"What changed in ACME's risk last quarter?",
  "org_id":"optional-guid",
  "scope":["filings","finance","news","social","sanctions","internal"]
}
```

---

## Project structure

```
myriskagent/
  api/
    app/main.py
    app/agents/        # filings.py, finance.py, news.py, social.py, sanctions.py, wiki.py, narrator.py, qa.py, provider_outlier.py, evidence.py
    app/risk/engine.py # ensemble scoring
    app/risk/explain.py
    app/search/        # vector store + keyword
    app/storage/
    tests/
  web/
    src/
      app/
      components/
      features/
      lib/api.ts
      styles/design.css
  infra/
    docker-compose.yml
    opa/policies.rego
    grafana/dashboards/
  data/
    samples/claims_small.parquet
  README.md
```

---

## Quick start

See existing steps for Docker, environment, seeding, and running both API and web.
To enable public data fetchers, set API keys where required and configure allowed sources.

`.env` additions:

```env
# News and finance
NEWSAPI_KEY=
ALPHAVANTAGE_KEY=
GDELT_BASE=https://api.gdeltproject.org/api/v2

# Vector store or pgvector
VECTOR_BACKEND=pgvector
```

---

## Reports

* **Executive Brief**
  One page with scores, trend, top five risks, and recommended actions.

* **Full Report**
  Detailed write-up with score drivers, SHAP plots, peer boxplots, and cited sources. Download as PDF or HTML.

---

## Operations and trust

* Immutable audit log with dataset hashes and parameter snapshots.
* OPA policies for PHI and export control.
* OpenTelemetry traces across agents and pipelines.
* Reproducible runs with deterministic seeds.

---

## Roadmap

* Connectors for more filings outside the US.
* Higher quality event deduplication with cross-document coreference.
* Active learning loop to refine weights using analyst feedback.
* Scheduled recomputes and monthly rollups.

---

If you want, I can now write a **Cursor task plan** that scaffolds the agents, routes, UI pages, and design tokens exactly to this spec.
