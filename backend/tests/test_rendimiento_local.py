"""Benchmark local de latencia p95 y tamaño acotado de SQLite (HU #7 · Ops)."""

from __future__ import annotations

import math
import time

from fastapi.testclient import TestClient

from app.main import create_app


def test_latencia_p95_y_tamano_sqlite_acotado(tmp_path, monkeypatch) -> None:
    db_path = tmp_path / "cfo.db"
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    monkeypatch.setenv("LLM_DESACTIVADO", "1")

    tiempos: list[float] = []
    with TestClient(create_app()) as client:
        for _ in range(15):
            inicio = time.perf_counter()
            assert client.post("/api/demo/reiniciar").status_code == 200
            assert client.get("/api/reglas").status_code == 200
            assert client.post("/api/perfilado").status_code == 200
            assert client.get("/api/log").status_code == 200
            r_sim = client.post("/api/ingresos/simular", json={"monto_usd": "1500"})
            assert r_sim.status_code == 201
            tiempos.append(time.perf_counter() - inicio)

        log_final = client.get("/api/log").json()

    ordenados = sorted(tiempos)
    idx_p95 = max(0, math.ceil(0.95 * len(ordenados)) - 1)
    p95 = ordenados[idx_p95]

    assert p95 < 0.5, f"p95 demasiado alto: {p95:.3f}s"
    assert db_path.stat().st_size < 1_000_000
    assert len(log_final) == 1
