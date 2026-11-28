"""Pruebas de banda asimétrica de FX (T09) y oportunidad de adelanto favorable (T11)."""

from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal

import pytest

from app.domain.fx import (
    DecisionFX,
    chequear_fx_al_ejecutar,
    evaluar_oportunidad_favorable,
)


def test_t09_fx_empeora_mas_del_2_por_ciento_retiene() -> None:
    res = chequear_fx_al_ejecutar(
        monto_objetivo_destino=Decimal("450000"),
        monto_usd_aprobado=Decimal("380"),
        cotizacion_aprobada=Decimal("1185"),
        cotizacion_actual=Decimal("1150"),
        tolerancia_pct=Decimal("2.0"),
        moneda_destino="ARS",
    )

    assert res.decision == DecisionFX.RETENER
    assert res.desvio_pct == Decimal("-2.95")
    assert res.usd_a_convertir == Decimal("0")
    assert res.usd_necesarios_actuales == Decimal("392")


def test_t09_fx_dentro_de_banda_ejecuta_solo_lo_necesario() -> None:
    res = chequear_fx_al_ejecutar(
        monto_objetivo_destino=Decimal("450000"),
        monto_usd_aprobado=Decimal("380"),
        cotizacion_aprobada=Decimal("1185"),
        cotizacion_actual=Decimal("1190"),
        tolerancia_pct=Decimal("2.0"),
        moneda_destino="ARS",
    )

    assert res.decision == DecisionFX.EJECUTAR
    assert res.usd_a_convertir == Decimal("379")


def test_t09_fx_empeora_dentro_de_banda_no_supera_lo_aprobado() -> None:
    res = chequear_fx_al_ejecutar(
        monto_objetivo_destino=Decimal("450000"),
        monto_usd_aprobado=Decimal("380"),
        cotizacion_aprobada=Decimal("1185"),
        cotizacion_actual=Decimal("1163"),
        tolerancia_pct=Decimal("2.0"),
        moneda_destino="ARS",
    )

    assert res.decision == DecisionFX.EJECUTAR
    assert res.usd_necesarios_actuales == Decimal("387")
    assert res.usd_a_convertir == Decimal("380")


def test_t11_adelanto_favorable_propone_menos_usd() -> None:
    vence = datetime(2026, 12, 3, 12, 0, tzinfo=UTC)
    martes = datetime(2026, 12, 1, 10, 0, tzinfo=UTC)

    propuesta = evaluar_oportunidad_favorable(
        key="plan-ing01-M3",
        estado="APROBADO",
        vence=vence,
        ahora=martes,
        monto_objetivo_destino=Decimal("450000"),
        monto_usd_aprobado=Decimal("380"),
        cotizacion_aprobada=Decimal("1185"),
        cotizacion_actual=Decimal("1220"),
        trigger_pct=Decimal("2.0"),
        moneda_destino="ARS",
    )

    assert propuesta is not None
    assert propuesta.key == "plan-ing01-M3.v2"
    assert propuesta.categoria == "adelantar_conversion_favorable"
    assert propuesta.monto_usd == Decimal("369")
    assert propuesta.ahorro_usd == Decimal("11")
    assert propuesta.mejora_pct == Decimal("2.95")


def test_t11_no_propone_si_no_esta_aprobado_o_ya_vencio() -> None:
    vence = datetime(2026, 12, 3, 12, 0, tzinfo=UTC)
    despues = datetime(2026, 12, 3, 13, 0, tzinfo=UTC)
    antes = datetime(2026, 12, 1, 10, 0, tzinfo=UTC)

    assert (
        evaluar_oportunidad_favorable(
            key="plan-ing01-M3",
            estado="PROPUESTO",
            vence=vence,
            ahora=antes,
            monto_objetivo_destino=Decimal("450000"),
            monto_usd_aprobado=Decimal("380"),
            cotizacion_aprobada=Decimal("1185"),
            cotizacion_actual=Decimal("1220"),
        )
        is None
    )
    assert (
        evaluar_oportunidad_favorable(
            key="plan-ing01-M3",
            estado="APROBADO",
            vence=vence,
            ahora=despues,
            monto_objetivo_destino=Decimal("450000"),
            monto_usd_aprobado=Decimal("380"),
            cotizacion_aprobada=Decimal("1185"),
            cotizacion_actual=Decimal("1220"),
        )
        is None
    )


def test_fx_soporta_monedas_genericas_y_valida_entradas() -> None:
    vence = datetime(2026, 12, 3, 12, 0, tzinfo=UTC)
    ahora = datetime(2026, 12, 1, 10, 0, tzinfo=UTC)

    propuesta_brl = evaluar_oportunidad_favorable(
        key="plan-br-M1",
        estado="APROBADO",
        vence=vence,
        ahora=ahora,
        monto_objetivo_destino=Decimal("2000"),
        monto_usd_aprobado=Decimal("400"),
        cotizacion_aprobada=Decimal("5.00"),
        cotizacion_actual=Decimal("5.20"),
        moneda_destino="BRL",
    )
    assert propuesta_brl is not None
    assert propuesta_brl.moneda_destino == "BRL"
    assert propuesta_brl.monto_usd == Decimal("385")

    with pytest.raises(ValueError):
        chequear_fx_al_ejecutar(
            monto_objetivo_destino=Decimal("0"),
            monto_usd_aprobado=Decimal("380"),
            cotizacion_aprobada=Decimal("1185"),
            cotizacion_actual=Decimal("1185"),
        )
