from fastapi.testclient import TestClient

from app.main import app


def test_healthz():
    client = TestClient(app)
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_recompute_smoke():
    client = TestClient(app)
    r = client.post("/risk/recompute/1/2024Q4")
    assert r.status_code == 200
    data = r.json()
    assert data["org_id"] == 1
    assert "scores" in data


def test_docs_search_smoke():
    client = TestClient(app)
    r = client.get("/docs/search?q=acme&org_id=1")
    assert r.status_code == 200
    data = r.json()
    assert data.get("query") == "acme"
    assert isinstance(data.get("results"), list)


def test_drivers_smoke():
    client = TestClient(app)
    r = client.get("/risk/drivers/1/latest")
    assert r.status_code == 200
    body = r.json()
    assert body.get("org_id") == 1
    assert isinstance(body.get("drivers"), list)


def test_ingest_and_outliers_smoke():
    client = TestClient(app)
    csv_data = "provider_id,claim_amount\n1,100\n1,120\n2,500\n2,520\n3,50\n"
    files = {"file": ("claims.csv", csv_data, "text/csv")}
    r = client.post("/ingest/claims?org_id=1", files=files)
    assert r.status_code == 200
    resp = r.json()
    assert resp.get("org_id") == 1
    assert resp.get("received_rows") >= 3
    r2 = client.get("/outliers/providers?org_id=1&period=latest")
    assert r2.status_code == 200
    out = r2.json()
    assert out.get("org_id") == 1
    assert isinstance(out.get("providers"), list)


def test_docs_search_keyword_smoke():
    client = TestClient(app)
    r = client.get("/docs/search/keyword?q=acme&org_id=1")
    assert r.status_code == 200
    data = r.json()
    assert data.get("query") == "acme"
    assert isinstance(data.get("results"), list)


def test_version_endpoint():
    client = TestClient(app)
    r = client.get("/version")
    assert r.status_code == 200
    data = r.json()
    assert "version" in data
