"""Endpoints reales: reglas, perfilado, log, autonomía y reiniciar sobre SQLite (sin LLM ni red)."""

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def c(tmp_path, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'cfo.db'}")
    monkeypatch.setenv("LLM_DESACTIVADO", "1")  # plantillas: sin red ni clave
    return TestClient(create_app())


def test_reglas_salen_de_la_base(c):
    j = c.get("/api/reglas").json()
    assert j["hard_rules"]["min_cushion_usd"] == "500.00"
    assert {v["id"] for v in j["dues"]} >= {"rent-thursday", "monotributo-20"}
    assert j["autonomy_levels"]["salidas_a_terceros"] == 1


def test_cambiar_reglas_persiste(c):
    reglas = c.get("/api/reglas").json()
    reglas["hard_rules"]["min_cushion_usd"] = "600"
    r = c.put("/api/reglas", json={"hard_rules": reglas["hard_rules"]})
    assert r.status_code == 200 and r.json()["hard_rules"]["min_cushion_usd"] == "600.00"
    assert c.get("/api/reglas").json()["hard_rules"]["min_cushion_usd"] == "600.00"


def test_regla_negativa_se_rechaza(c):
    reglas = c.get("/api/reglas").json()
    reglas["hard_rules"]["min_cushion_usd"] = "-1"
    assert c.put("/api/reglas", json={"hard_rules": reglas["hard_rules"]}).status_code == 422


def test_perfilado_propone_sin_aplicar_y_bloquea_la_inyeccion(c):
    antes = {v["id"] for v in c.get("/api/reglas").json()["dues"]}
    props = c.post("/api/perfilado").json()
    assert len(props) >= 3 and all(p["estado"] == "pendiente" for p in props)
    assert {v["id"] for v in c.get("/api/reglas").json()["dues"]} == antes, "nada se aplica solo"
    log = c.get("/api/log").json()
    assert any(e["estado"] == "INTENTO_BLOQUEADO" for e in log)
    assert all("SISTEMA" not in p["propuesta"] for p in props)


def test_confirmar_una_propuesta_agrega_el_vencimiento(c):
    props = c.post("/api/perfilado").json()
    pago = next(p for p in props if p["vencimiento"])
    r = c.post(f"/api/perfilado/{pago['id']}/confirmar", json={"confirmar": True})
    assert r.json()["estado"] == "confirmada"
    dues = c.get("/api/reglas").json()["dues"]
    assert any(v["id"] == pago["vencimiento"]["id"] and v["origen"] == "perfilado" for v in dues)


def test_descartar_no_agrega_nada(c):
    props = c.post("/api/perfilado").json()
    antes = len(c.get("/api/reglas").json()["dues"])
    r = c.post(f"/api/perfilado/{props[0]['id']}/confirmar", json={"confirmar": False})
    assert r.json()["estado"] == "descartada" and len(c.get("/api/reglas").json()["dues"]) == antes


def test_autonomia_sube_solo_lo_que_no_sale_de_dolares(c):
    assert c.get("/api/autonomia").json()["solicitud"]["categoria"] == "apartar_impuestos"
    assert (
        c.post("/api/autonomia/apartar_impuestos", json={"aceptar": True}).json()["niveles"][
            "apartar_impuestos"
        ]
        == 4
    )
    assert c.get("/api/autonomia").json()["solicitud"] is None
    r = c.post("/api/autonomia/convertir_para_vencimientos", json={"aceptar": True})
    assert r.json()["niveles"]["convertir_para_vencimientos"] == 3, (
        "los pesos se siguen preguntando"
    )


def test_reiniciar_vuelve_al_estado_inicial(c):
    reglas = c.get("/api/reglas").json()
    reglas["hard_rules"]["min_cushion_usd"] = "900"
    c.put("/api/reglas", json={"hard_rules": reglas["hard_rules"]})
    c.post("/api/perfilado")
    assert c.post("/api/demo/reiniciar").json() == {"ok": True}
    assert c.get("/api/reglas").json()["hard_rules"]["min_cushion_usd"] == "500.00"
    assert c.get("/api/log").json() == []


def test_plan_sigue_en_ejemplos(c):
    r = c.post("/api/ingresos/simular", json={"monto_usd": "1500"})
    assert r.status_code == 201 and len(r.json()["movimientos"]) == 3
