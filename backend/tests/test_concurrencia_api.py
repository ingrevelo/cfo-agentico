"""Pruebas de concurrencia sobre FastAPI + SQLite (HU #2 · Chaos Concurrency)."""

from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'cfo.db'}")
    monkeypatch.setenv("LLM_DESACTIVADO", "1")
    with TestClient(create_app()) as c:
        yield c


def test_lecturas_y_perfilado_concurrentes_sin_500(client: TestClient) -> None:
    def tarea(indice: int) -> int:
        ruta = indice % 4
        if ruta == 0:
            return client.get("/api/reglas").status_code
        if ruta == 1:
            return client.post("/api/perfilado").status_code
        if ruta == 2:
            return client.post("/api/planes/plan-ing01/aprobar").status_code
        return client.get("/api/log").status_code

    with ThreadPoolExecutor(max_workers=10) as pool:
        codigos = list(pool.map(tarea, range(20)))

    assert len(codigos) == 20
    assert all(codigo == 200 for codigo in codigos), f"Respuestas inesperadas: {codigos}"


def test_actualizaciones_concurrentes_de_reglas_sin_corrupcion(client: TestClient) -> None:
    base = client.get("/api/reglas").json()["hard_rules"]
    valores = [str(510 + i * 10) for i in range(12)]
    esperados = {f"{int(v):.2f}" for v in valores}

    def actualizar(valor: str) -> int:
        payload = {**base, "min_cushion_usd": valor}
        return client.put("/api/reglas", json={"hard_rules": payload}).status_code

    with ThreadPoolExecutor(max_workers=6) as pool:
        codigos = list(pool.map(actualizar, valores))

    assert all(codigo == 200 for codigo in codigos), f"Respuestas inesperadas: {codigos}"
    final = client.get("/api/reglas")
    assert final.status_code == 200
    assert final.json()["hard_rules"]["min_cushion_usd"] in esperados


def test_reinicio_demo_concurrente_es_atomico(client: TestClient) -> None:
    def operar(indice: int) -> int:
        if indice % 2 == 0:
            return client.post("/api/demo/reiniciar").status_code
        return client.get("/api/reglas").status_code

    with ThreadPoolExecutor(max_workers=6) as pool:
        codigos = list(pool.map(operar, range(10)))

    assert all(codigo == 200 for codigo in codigos), f"Respuestas inesperadas: {codigos}"
    final = client.get("/api/reglas")
    assert final.status_code == 200
    assert final.json()["hard_rules"]["min_cushion_usd"] == "500.00"
