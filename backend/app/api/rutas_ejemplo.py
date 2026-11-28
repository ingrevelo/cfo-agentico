"""Contrato C3: los endpoints de la API con respuestas de ejemplo, sin lógica todavía.

Se incluye en la app con `app.include_router(rutas_ejemplo.router)`. Cada endpoint se reemplaza
por el real en `api/endpoints-reales`, sin cambiar la ruta ni el esquema de respuesta.
"""

from decimal import Decimal, InvalidOperation

from fastapi import APIRouter, HTTPException

from . import ejemplos
from .esquemas import (
    Autonomia,
    AvanzarReloj,
    CambioReglas,
    ConfirmarPropuesta,
    EditarMovimiento,
    EntradaLog,
    Ok,
    Plan,
    PropuestaRegla,
    Reglas,
    ResponderAutonomia,
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


@router.get("/reglas", response_model=Reglas, summary="Pantalla 1: leer las reglas")
def leer_reglas() -> Reglas:
    return ejemplos.reglas()


@router.put("/reglas", response_model=Reglas, summary="Pantalla 1: confirmar o editar reglas")
def cambiar_reglas(cambio: CambioReglas) -> Reglas:
    actuales = ejemplos.reglas()
    cambios = {k: v for k, v in cambio if v is not None}
    return actuales.model_copy(update=cambios)


@router.post("/ingresos/simular", response_model=Plan, status_code=201, summary="Demo: llega un pago")
def simular_ingreso(datos: SimularIngreso) -> Plan:
    _decimal(datos.monto_usd)
    return ejemplos.plan_propuesto()


@router.get("/planes/{plan_id}", response_model=Plan, summary="Pantalla 2: plan propuesto")
def leer_plan(plan_id: str) -> Plan:
    _plan_existe(plan_id)
    return ejemplos.plan_propuesto()


@router.patch("/planes/{plan_id}/movimientos/{paso}", response_model=Plan, summary="Editar un movimiento (pasa por el juez)")
def editar_movimiento(plan_id: str, paso: str, datos: EditarMovimiento) -> Plan:
    _plan_existe(plan_id)
    if paso not in PASOS:
        raise HTTPException(404, f"No existe el paso {paso}")
    if Decimal(1500) - _decimal(datos.monto_usd) < 500:  # en el real decide el juez de domain/
        return ejemplos.plan_caso_rojo(datos.monto_usd)
    return ejemplos.plan_propuesto()


@router.post("/planes/{plan_id}/aprobar", response_model=Plan, summary="Pantalla 3: OK del plan (idempotente)")
def aprobar_plan(plan_id: str) -> Plan:
    _plan_existe(plan_id)
    return ejemplos.plan_aprobado()


@router.post("/perfilado", response_model=list[PropuestaRegla], summary="Modo sombra: reglas propuestas")
def perfilar() -> list[PropuestaRegla]:
    return ejemplos.propuestas()


@router.post("/perfilado/{propuesta_id}/confirmar", response_model=PropuestaRegla, summary="Confirmar o descartar")
def confirmar_propuesta(propuesta_id: str, datos: ConfirmarPropuesta) -> PropuestaRegla:
    for p in ejemplos.propuestas():
        if p.id == propuesta_id:
            return p.model_copy(update={"estado": "confirmada" if datos.confirmar else "descartada"})
    raise HTTPException(404, f"No existe la propuesta {propuesta_id}")


@router.get("/log", response_model=list[EntradaLog], summary="Pantalla 4: MCP Log")
def leer_log() -> list[EntradaLog]:
    return ejemplos.log()


@router.get("/autonomia", response_model=Autonomia, summary="Niveles y solicitud de más autonomía")
def leer_autonomia() -> Autonomia:
    return ejemplos.autonomia()


@router.post("/autonomia/{categoria}", response_model=Autonomia, summary="Aceptar o rechazar más autonomía")
def responder_autonomia(categoria: str, datos: ResponderAutonomia) -> Autonomia:
    actual = ejemplos.autonomia()
    if categoria not in actual.niveles:
        raise HTTPException(404, f"No existe la categoría {categoria}")
    if datos.aceptar:
        actual.niveles[categoria] = 4
    return actual.model_copy(update={"solicitud": None})


@router.post("/demo/avanzar", response_model=Plan, summary="Demo: avanzar al martes o al jueves")
def avanzar_reloj(datos: AvanzarReloj) -> Plan:
    fx = datos.fx_usd_ars or "1185"
    _decimal(fx)
    if datos.dia == "martes":
        return ejemplos.plan_martes(fx)
    if datos.dia == "jueves":
        return ejemplos.plan_jueves(fx)
    raise HTTPException(422, "dia debe ser martes o jueves")


@router.post("/demo/reiniciar", response_model=Ok, summary="Demo: volver al estado inicial")
def reiniciar_demo() -> Ok:
    return Ok()
