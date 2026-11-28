"""Pruebas de límites y entradas hostiles contra la API (HU #4 · Fuzz / Boundaries)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'cfo.db'}")
    monkeypatch.setenv("LLM_DESACTIVADO", "1")
    with TestClient(create_app(), raise_server_exceptions=False) as c:
        yield c


@pytest.mark.parametrize("valor_invalido", ["-1", "-0.01", "abc", ""])
def test_put_reglas_rechaza_montos_invalidos_sin_500(
    client: TestClient, valor_invalido: str
) -> None:
    base = client.get("/api/reglas").json()["hard_rules"]
    r = client.put("/api/reglas", json={"hard_rules": {**base, "min_cushion_usd": valor_invalido}})
    assert r.status_code == 422


def test_put_reglas_rechaza_json_roto_y_tolera_texto_largo(client: TestClient) -> None:
    r_json = client.put(
        "/api/reglas",
        content="{json_invalido",
        headers={"Content-Type": "application/json"},
    )
    assert r_json.status_code == 422

    r_largo = client.put(
        "/api/reglas",
        json={
            "dues": [
                {
                    "id": "due-largo",
                    "label": "A" * 5000,
                    "amount": "100",
                    "currency": "ARGt",
                }
            ]
        },
    )
    assert r_largo.status_code in (200, 422)


@pytest.mark.parametrize("monto_invalido", ["0", "-100", "abc", ""])
def test_simular_ingreso_rechaza_montos_invalidos(
    client: TestClient, monto_invalido: str
) -> None:
    r = client.post("/api/ingresos/simular", json={"monto_usd": monto_invalido})
    assert r.status_code == 422


def test_rutas_de_plan_y_paso_inexistentes_devuelven_404(client: TestClient) -> None:
    assert client.get("/api/planes/plan-inexistente").status_code == 404
    assert client.post("/api/planes/plan-inexistente/aprobar").status_code == 404
    assert (
        client.patch(
            "/api/planes/plan-ing01/movimientos/M99", json={"monto_usd": "100"}
        ).status_code
        == 404
    )


@pytest.mark.parametrize("monto_invalido", ["0", "-5", "abc"])
def test_editar_movimiento_rechaza_montos_invalidos(
    client: TestClient, monto_invalido: str
) -> None:
    r = client.patch(
        "/api/planes/plan-ing01/movimientos/M1", json={"monto_usd": monto_invalido}
    )
    assert r.status_code == 422


def test_avanzar_reloj_rechaza_dia_y_fx_invalidos(client: TestClient) -> None:
    assert client.post("/api/demo/avanzar", json={"dia": "domingo"}).status_code == 422
    for fx in ("0", "-1", "abc"):
        r = client.post("/api/demo/avanzar", json={"dia": "martes", "fx_usd_ars": fx})
        assert r.status_code == 422


def test_perfilado_y_autonomia_inexistentes_y_limites_seguridad(client: TestClient) -> None:
    assert (
        client.post(
            "/api/perfilado/propuesta-inexistente/confirmar", json={"confirmar": True}
        ).status_code
        == 404
    )
    assert (
        client.post(
            "/api/autonomia/categoria-inexistente", json={"aceptar": True}
        ).status_code
        == 404
    )
    r_terceros = client.post("/api/autonomia/salidas_a_terceros", json={"aceptar": True})
    assert r_terceros.status_code == 200
    assert r_terceros.json()["niveles"]["salidas_a_terceros"] == 1


@pytest.mark.xfail(
    strict=True,
    reason="Bug reportado en api/servicio_reglas.py: falta d.is_finite() para NaN/Infinity",
)
@pytest.mark.parametrize("valor_especial", ["NaN", "Infinity"])
def test_put_reglas_rechaza_nan_e_infinity(client: TestClient, valor_especial: str) -> None:
    base = client.get("/api/reglas").json()["hard_rules"]
    r = client.put("/api/reglas", json={"hard_rules": {**base, "min_cushion_usd": valor_especial}})
    assert r.status_code == 422


@pytest.mark.xfail(
    strict=True,
    reason="Bug reportado en api/rutas_ejemplo.py: falta d.is_finite() para NaN/Infinity",
)
@pytest.mark.parametrize("valor_especial", ["NaN", "Infinity"])
def test_rutas_ejemplo_rechaza_nan_e_infinity(client: TestClient, valor_especial: str) -> None:
    r_ing = client.post("/api/ingresos/simular", json={"monto_usd": valor_especial})
    r_fx = client.post("/api/demo/avanzar", json={"dia": "martes", "fx_usd_ars": valor_especial})
    assert r_ing.status_code == 422
    assert r_fx.status_code == 422
