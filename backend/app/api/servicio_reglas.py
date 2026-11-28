"""Pantalla 1: leer y cambiar las reglas de Sofía en SQLite (no en un prompt).

Los saldos vienen de Belo: mientras `BeloPort` no exista, se leen de los datos sintéticos de la
demo, igual que en los ejemplos del contrato C3.
"""

import json
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation

from fastapi import HTTPException
from sqlmodel import Session, delete

from app.db import (
    VencimientoDB,
    listar_vencimientos,
    obtener_niveles_autonomia,
    obtener_perfil,
    obtener_reglas,
)

from . import ejemplos
from .dependencias import USUARIO
from .esquemas import CambioReglas, Reglas, ReglasDuras, Vencimiento

_MONTOS = (
    "min_cushion_usd",
    "max_conversion_usd",
    "fx_tolerance_pct",
    "fx_advance_trigger_pct",
    "tax_pct_of_income",
    "min_liquid_usd",
    "min_income_trigger_usd",
)


def _texto(valor: str) -> str:
    try:
        d = Decimal(valor)
    except InvalidOperation as e:
        raise HTTPException(422, f"Monto inválido: {valor}") from e
    if d < 0:
        raise HTTPException(422, f"El valor no puede ser negativo: {valor}")
    return f"{d:.2f}"


def leer(s: Session) -> Reglas:
    perfil, regla = obtener_perfil(s, USUARIO), obtener_reglas(s, USUARIO)
    if perfil is None or regla is None:
        raise HTTPException(404, "No hay reglas sembradas")
    duras = ReglasDuras(
        **{c: getattr(regla, c) for c in _MONTOS},
        cushion_scope=json.loads(regla.cushion_scope_json),
        allowed_currencies=json.loads(regla.allowed_currencies_json),
        idempotency_required=regla.idempotency_required,
    )
    vencimientos = [
        Vencimiento(
            id=v.id,
            label=v.label,
            amount=v.amount,
            currency=v.currency,
            due=v.due_weekday,
            due_day=v.due_day,
            origen=v.origen,
        )
        for v in listar_vencimientos(s, USUARIO)
    ]
    return Reglas(
        user_id=perfil.user_id,
        profile={
            "name": perfil.nombre,
            "city": perfil.ciudad,
            "occupation": perfil.ocupacion,
            "income_currency": perfil.moneda_ingreso,
        },
        balances=ejemplos.reglas().balances,
        fx_usd_ars=ejemplos.reglas().fx_usd_ars,
        hard_rules=duras,
        dues=vencimientos,
        autonomy_levels=obtener_niveles_autonomia(s, USUARIO),
        soft_preferences=json.loads(regla.soft_preferences_json or "{}"),
    )


def cambiar(s: Session, cambio: CambioReglas) -> Reglas:
    regla = obtener_reglas(s, USUARIO)
    if regla is None:
        raise HTTPException(404, "No hay reglas sembradas")
    if cambio.hard_rules is not None:
        h = cambio.hard_rules
        for campo in _MONTOS:
            setattr(regla, campo, _texto(getattr(h, campo)))
        regla.cushion_scope_json = json.dumps(h.cushion_scope, ensure_ascii=False)
        regla.allowed_currencies_json = json.dumps(h.allowed_currencies, ensure_ascii=False)
        regla.actualizado_en = datetime.now(UTC)
        s.add(regla)
    if cambio.dues is not None:  # la lista enviada reemplaza a la actual
        s.exec(delete(VencimientoDB).where(VencimientoDB.user_id == USUARIO))
        for v in cambio.dues:
            s.add(
                VencimientoDB(
                    id=v.id,
                    user_id=USUARIO,
                    label=v.label,
                    amount=_texto(v.amount),
                    currency=v.currency,
                    due_weekday=v.due,
                    due_day=v.due_day,
                    origen=v.origen,
                    confirmado_en=datetime.now(UTC),
                )
            )
    s.commit()
    return leer(s)
