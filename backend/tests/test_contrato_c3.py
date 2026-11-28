"""Contrato C3: las rutas de /api responden con la forma acordada (respuestas de ejemplo)."""

from fastapi.testclient import TestClient

from app.main import create_app

c = TestClient(create_app())
PLAN = "/api/planes/plan-ing01"


def test_reglas_con_montos_como_texto() -> None:
    j = c.get("/api/reglas").json()
    assert j["balances"]["USDC"] == "1500.00"
    assert j["hard_rules"]["min_cushion_usd"] == "500.00"
    assert j["dues"][0]["amount"] == "450000.00"


def test_simular_ingreso_devuelve_el_plan_del_caso() -> None:
    r = c.post("/api/ingresos/simular", json={"monto_usd": "1500"})
    assert r.status_code == 201
    movs = r.json()["movimientos"]
    assert [m["desde"]["valor"] for m in movs] == ["900.00", "120.00", "380.00"]
    assert movs[1]["simulado"] is True


def test_caso_rojo_bloquea() -> None:
    r = c.patch(f"{PLAN}/movimientos/M3", json={"monto_usd": "1100"})
    assert r.json()["movimientos"][2]["estado"] == "BLOQUEADO"


def test_aprobar_dos_veces_da_lo_mismo() -> None:
    assert c.post(f"{PLAN}/aprobar").json() == c.post(f"{PLAN}/aprobar").json()


def test_jueves_con_dolar_peor_retiene() -> None:
    r = c.post("/api/demo/avanzar", json={"dia": "jueves", "fx_usd_ars": "1150"})
    assert r.json()["movimientos"][2]["estado"] == "RETENIDO"


def test_monto_invalido_y_plan_inexistente() -> None:
    assert c.post("/api/ingresos/simular", json={"monto_usd": "-5"}).status_code == 422
    assert c.get("/api/planes/otro").status_code == 404


def test_salud_sigue_respondiendo() -> None:
    assert c.get("/api/salud").json()["estado"] == "ok"
