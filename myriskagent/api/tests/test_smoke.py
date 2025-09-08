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
