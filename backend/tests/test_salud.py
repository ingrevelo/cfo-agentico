"""Pruebas del esqueleto FastAPI (/api/salud, semilla al arranque y montaje de estáticos)."""

from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session

from app.db import listar_vencimientos, obtener_perfil, obtener_reglas
from app.main import create_app


def test_salud_responde_ok() -> None:
    client = TestClient(create_app())
    response = client.get("/api/salud")

    assert response.status_code == 200
    assert response.json() == {"estado": "ok", "servicio": "cfo-agentico"}


def test_arranque_siembra_sofia_en_sqlite(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    db_file = tmp_path / "arranque.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_file}")

    app_instance = create_app()
    with TestClient(app_instance) as client:
        resp = client.get("/api/salud")
        assert resp.status_code == 200

        with Session(app_instance.state.db_engine) as session:
            assert obtener_perfil(session, "sofia-demo") is not None
            assert obtener_reglas(session, "sofia-demo") is not None
            assert len(listar_vencimientos(session, "sofia-demo")) == 2


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
