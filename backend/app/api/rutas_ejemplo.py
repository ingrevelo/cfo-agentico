"""Contrato C3: los endpoints que todavía responden con ejemplos (plan, aprobar, avanzar el reloj).

Reglas, perfilado, log, autonomía y reiniciar ya son reales: ver `rutas_reales.py`.

Se incluye en la app con `app.include_router(rutas_ejemplo.router)`. Cada endpoint se reemplaza
por el real en `api/endpoints-reales`, sin cambiar la ruta ni el esquema de respuesta.
"""

from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, HTTPException

from . import ejemplos
from .esquemas import (
    AvanzarReloj,
    EditarMovimiento,
    Plan,
    SimularIngreso,
)

router = APIRouter(prefix="/api", tags=["contrato C3 (ejemplos)"])
PLAN = "plan-ing01"
PASOS = {"M1", "M2", "M3"}


def _plan_existe(plan_id: str) -> None:
    if plan_id != PLAN:
        raise HTTPException(404, f"No existe el plan {plan_id}")


def _decimal(valor: str) -> Decimal:
    try:
        d = Decimal(valor)
    except InvalidOperation as e:
        raise HTTPException(422, f"Monto inválido: {valor}") from e
    if d <= 0:
        raise HTTPException(422, "El monto debe ser mayor que cero")
    return d


@router.post(
    "/ingresos/simular", response_model=Plan, status_code=201, summary="Demo: llega un pago"
)
def simular_ingreso(datos: SimularIngreso) -> Plan:
    _decimal(datos.monto_usd)
    return ejemplos.plan_propuesto()


@router.get("/planes/{plan_id}", response_model=Plan, summary="Pantalla 2: plan propuesto")
def leer_plan(plan_id: str) -> Plan:
    _plan_existe(plan_id)
    return ejemplos.plan_propuesto()


@router.patch(
    "/planes/{plan_id}/movimientos/{paso}",
    response_model=Plan,
    summary="Editar un movimiento (pasa por el juez)",
)
def editar_movimiento(plan_id: str, paso: str, datos: EditarMovimiento) -> Plan:
    _plan_existe(plan_id)
    if paso not in PASOS:
        raise HTTPException(404, f"No existe el paso {paso}")
    if Decimal(1500) - _decimal(datos.monto_usd) < 500:  # en el real decide el juez de domain/
        return ejemplos.plan_caso_rojo(datos.monto_usd)
    return ejemplos.plan_propuesto()


@router.post(
    "/planes/{plan_id}/aprobar",
    response_model=Plan,
    summary="Pantalla 3: OK del plan (idempotente)",
)
def aprobar_plan(plan_id: str) -> Plan:
    _plan_existe(plan_id)
    return ejemplos.plan_aprobado()


@router.post("/demo/avanzar", response_model=Plan, summary="Demo: avanzar al martes o al jueves")
def avanzar_reloj(datos: AvanzarReloj) -> Plan:
    fx = datos.fx_usd_ars or "1185"
    _decimal(fx)
    if datos.dia == "martes":
        return ejemplos.plan_martes(fx)
    if datos.dia == "jueves":
        return ejemplos.plan_jueves(fx)
    raise HTTPException(422, "dia debe ser martes o jueves")
