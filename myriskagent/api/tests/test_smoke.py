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
