"""Endpoints reales (api/endpoints-reales): misma ruta y mismo esquema que el contrato C3.

Hoy: reglas, perfilado, MCP Log, autonomía y reiniciar, sobre SQLite, el perfilador y el LLM.
El plan del ingreso, aprobar y avanzar el reloj siguen en `rutas_ejemplo.py` hasta que existan el
motor, el juez y la máquina de estados del dominio.
"""

import json
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.agent.llm import LLM
from app.db import NivelAutonomiaDB, listar_mcp_log, obtener_niveles_autonomia, reiniciar_demo

from . import ejemplos, servicio_perfilado, servicio_reglas
from .dependencias import USUARIO, llm, sesion
from .esquemas import (
    Autonomia,
    CambioReglas,
    ConfirmarPropuesta,
    EntradaLog,
    Ok,
    PropuestaRegla,
    Reglas,
    ResponderAutonomia,
)

router = APIRouter(prefix="/api", tags=["endpoints reales"])
SUBEN_A_NIVEL_4 = {"apartar_impuestos", "rendimiento_usdt"}  # nunca pesos ni salidas a terceros


@router.get("/reglas", response_model=Reglas, summary="Pantalla 1: leer las reglas")
def leer_reglas(s: Session = Depends(sesion)) -> Reglas:
    return servicio_reglas.leer(s)


@router.put("/reglas", response_model=Reglas, summary="Pantalla 1: confirmar o editar reglas")
def cambiar_reglas(cambio: CambioReglas, s: Session = Depends(sesion)) -> Reglas:
    return servicio_reglas.cambiar(s, cambio)


@router.post("/perfilado", response_model=list[PropuestaRegla], summary="Modo sombra")
def perfilar(s: Session = Depends(sesion), modelo: LLM = Depends(llm)) -> list[PropuestaRegla]:
    return servicio_perfilado.perfilar(s, modelo)


@router.post(
    "/perfilado/{propuesta_id}/confirmar",
    response_model=PropuestaRegla,
    summary="Confirmar o descartar una regla propuesta",
)
def confirmar_propuesta(
    propuesta_id: str,
    datos: ConfirmarPropuesta,
    s: Session = Depends(sesion),
    modelo: LLM = Depends(llm),
) -> PropuestaRegla:
    return servicio_perfilado.confirmar(s, modelo, propuesta_id, datos.confirmar)


@router.get("/log", response_model=list[EntradaLog], summary="Pantalla 4: MCP Log")
def leer_log(s: Session = Depends(sesion)) -> list[EntradaLog]:
    salida = []
    for e in listar_mcp_log(s):
        d = json.loads(e.detalle_json or "{}")
        salida.append(
            EntradaLog(
                hora=e.hora,
                plan_id=e.plan_id,
                paso=e.paso,
                tool=e.tool or None,
                regla=d.get("regla", e.tool),
                estado=e.estado,
                monto=d.get("monto"),
                live=e.live,
            )
        )
    return salida


@router.get("/autonomia", response_model=Autonomia, summary="Niveles y solicitud de autonomía")
def leer_autonomia(s: Session = Depends(sesion)) -> Autonomia:
    niveles = obtener_niveles_autonomia(s, USUARIO)
    # La solicitud usa el historial simulado del caso (6 de 6 planes) hasta que exista
    # domain/autonomia; solo se muestra mientras la categoría siga en nivel 3.
    solicitud = ejemplos.autonomia().solicitud
    if solicitud and niveles.get(solicitud.categoria, 0) != solicitud.nivel_actual:
        solicitud = None
    return Autonomia(niveles=niveles, solicitud=solicitud)


@router.post("/autonomia/{categoria}", response_model=Autonomia, summary="Aceptar más autonomía")
def responder_autonomia(
    categoria: str, datos: ResponderAutonomia, s: Session = Depends(sesion)
) -> Autonomia:
    fila = s.exec(
        select(NivelAutonomiaDB).where(
            NivelAutonomiaDB.user_id == USUARIO, NivelAutonomiaDB.categoria == categoria
        )
    ).first()
    if fila is None:
        raise HTTPException(404, f"No existe la categoría {categoria}")
    # Solo sube lo que no sale de dólares (caso de prueba, fase 5). Cuando exista domain/autonomia,
    # esta regla se mueve allá.
    if datos.aceptar and fila.nivel == 3 and categoria in SUBEN_A_NIVEL_4:
        fila.nivel, fila.actualizado_en = 4, datetime.now(UTC)
        s.add(fila)
        s.commit()
    return Autonomia(niveles=obtener_niveles_autonomia(s, USUARIO), solicitud=None)


@router.post("/demo/reiniciar", response_model=Ok, summary="Demo: volver al estado inicial")
def reiniciar(s: Session = Depends(sesion)) -> Ok:
    reiniciar_demo(s)
    return Ok()
