"""Pruebas del esqueleto FastAPI (/api/salud y montaje de estáticos)."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


def test_salud_responde_ok() -> None:
    client = TestClient(create_app())
    response = client.get("/api/salud")

    assert response.status_code == 200
    assert response.json() == {"estado": "ok", "servicio": "cfo-agentico"}


def test_sirve_estaticos_desde_frontend_dist(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    index_file = tmp_path / "index.html"
    index_file.write_text("<html><body>CFO Agentico</body></html>", encoding="utf-8")
    monkeypatch.setenv("FRONTEND_DIST", str(tmp_path))

    client = TestClient(create_app())

    salud = client.get("/api/salud")
    assert salud.status_code == 200
    assert salud.json()["estado"] == "ok"

    home = client.get("/")
    assert home.status_code == 200
    assert "CFO Agentico" in home.text
