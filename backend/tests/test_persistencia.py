"""Pruebas de persistencia SQLite, idempotencia, MCP Log y semilla de la demo."""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path

from sqlmodel import Session

from app.db import (
    crear_engine,
    init_db,
    listar_mcp_log,
    listar_vencimientos,
    obtener_niveles_autonomia,
    obtener_perfil,
    obtener_reglas,
    registrar_mcp_log,
    registrar_o_obtener_movimiento,
    registrar_o_obtener_plan,
    reiniciar_demo,
    sembrar_sofia,
)


def _sesion_temporal(tmp_path: Path) -> Session:
    db_path = tmp_path / "test_cfo.db"
    engine = crear_engine(f"sqlite:///{db_path}")
    init_db(engine)
    return Session(engine)


def test_sembrar_sofia_es_idempotente_y_guarda_reglas(tmp_path: Path) -> None:
    with _sesion_temporal(tmp_path) as session:
        p1 = sembrar_sofia(session)
        p2 = sembrar_sofia(session)

        assert p1.user_id == "sofia-demo"
        assert p2.user_id == "sofia-demo"

        reglas = obtener_reglas(session, "sofia-demo")
        assert reglas is not None
        assert Decimal(reglas.min_cushion_usd) == Decimal("500.00")
        assert Decimal(reglas.max_conversion_usd) == Decimal("400.00")

        vencimientos = listar_vencimientos(session, "sofia-demo")
        assert len(vencimientos) == 2

        niveles = obtener_niveles_autonomia(session, "sofia-demo")
        assert niveles["rendimiento_usdt"] == 3
        assert niveles["salidas_a_terceros"] == 1


def test_planes_y_movimientos_son_idempotentes(tmp_path: Path) -> None:
    with _sesion_temporal(tmp_path) as session:
        sembrar_sofia(session)

        plan1, creado_p1 = registrar_o_obtener_plan(
            session,
            plan_id="plan-ing01",
            user_id="sofia-demo",
            ingreso_id="ing-001",
            monto_ingreso_usd=Decimal("1500"),
        )
        plan2, creado_p2 = registrar_o_obtener_plan(
            session,
            plan_id="plan-ing01",
            user_id="sofia-demo",
            ingreso_id="ing-001",
            monto_ingreso_usd=Decimal("1500"),
        )
        assert creado_p1 is True
        assert creado_p2 is False
        assert plan1.plan_id == plan2.plan_id

        m1, creado_m1 = registrar_o_obtener_movimiento(
            session,
            plan_id="plan-ing01",
            paso="M1",
            clave_idempotencia="plan-ing01-M1",
            categoria="rendimiento_usdt",
            src="USD",
            dst="USDT",
            monto_usd=Decimal("900"),
            live=False,
        )
        m2, creado_m2 = registrar_o_obtener_movimiento(
            session,
            plan_id="plan-ing01",
            paso="M1",
            clave_idempotencia="plan-ing01-M1",
            categoria="rendimiento_usdt",
            src="USD",
            dst="USDT",
            monto_usd=Decimal("900"),
            live=False,
        )
        assert creado_m1 is True
        assert creado_m2 is False
        assert m1.id == m2.id


def test_mcp_log_y_reiniciar_demo(tmp_path: Path) -> None:
    with _sesion_temporal(tmp_path) as session:
        sembrar_sofia(session)
        registrar_o_obtener_plan(
            session,
            plan_id="plan-ing01",
            user_id="sofia-demo",
            ingreso_id="ing-001",
            monto_ingreso_usd="1500.00",
        )
        registrar_mcp_log(
            session,
            tool="move_to_pocket",
            referencia_id="plan-ing01-M2",
            estado="COMPLETADO",
            live=False,
            plan_id="plan-ing01",
            paso="M2",
            detalle={"pocket": "Impuestos", "monto_usd": "120.00"},
        )

        logs = listar_mcp_log(session, plan_id="plan-ing01")
        assert len(logs) == 1
        assert logs[0].live is False

        reiniciar_demo(session)
        assert obtener_perfil(session, "sofia-demo") is not None
        assert listar_mcp_log(session) == []
