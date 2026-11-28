"""Modo sombra: el código detecta patrones, el LLM los nombra y la persona confirma (T02, T08, T12).

El perfilador (`domain/perfilador.py`) es determinista: con el mismo historial devuelve las mismas
propuestas con los mismos ids, así que confirmar no necesita guardar las propuestas.
Los montos y días salen del código; el LLM solo pone nombre y pregunta.
"""

from datetime import UTC, datetime
from pathlib import Path

from fastapi import HTTPException
from sqlmodel import Session

from app.agent.llm import LLM
from app.agent.redaccion import Patron, nombrar_patrones
from app.db import VencimientoDB, agregar_vencimiento, registrar_mcp_log
from app.domain.perfilador import (
    PropuestaRegla as PropuestaDominio,
)
from app.domain.perfilador import (
    cargar_historial_json,
    confirmar_propuesta,
    perfilar_en_modo_sombra,
)

from .dependencias import USUARIO
from .esquemas import PropuestaRegla, Vencimiento

HISTORIAL = Path(__file__).resolve().parents[3] / "data" / "historial-sofia.json"


def _propuestas(llm: LLM) -> tuple[list[PropuestaDominio], dict[str, tuple[str, str]], list]:
    movimientos = cargar_historial_json(HISTORIAL)
    resultado = perfilar_en_modo_sombra(movimientos)
    patrones = [
        Patron(
            id=p.id,
            tipo="ingreso" if p.patron.tipo == "ingreso" else "pago",
            contraparte=p.patron.contraparte,
            descripciones=list(p.patron.descripciones)[:6],
            monto=f"{p.patron.monto_mediana}",
            moneda=p.patron.moneda,
            dias=f"{p.patron.dia_min} a {p.patron.dia_max}",
            repeticiones=p.patron.repeticiones,
        )
        for p in resultado.propuestas
    ]
    nombres = nombrar_patrones(llm, patrones).valor if patrones else None
    textos = {n.id: (n.nombre, n.pregunta) for n in (nombres.patrones if nombres else [])}
    return resultado.propuestas, textos, resultado.intentos_bloqueados


def _a_api(p: PropuestaDominio, textos: dict, estado: str = "pendiente") -> PropuestaRegla:
    pat = p.patron
    nombre, pregunta = textos.get(p.id, (p.nombre_sugerido, "¿Lo agrego a tus reglas?"))
    venc = None
    if pat.tipo != "ingreso":
        venc = Vencimiento(
            id=f"perfilado-{p.id}",
            label=nombre,
            amount=f"{pat.monto_mediana}",
            currency=pat.moneda,
            due_day=pat.dia_max,
            origen="perfilado",
        )
    return PropuestaRegla(
        id=p.id,
        patron=(
            f"{pat.monto_mediana} {pat.moneda} con {pat.contraparte}, días {pat.dia_min} a "
            f"{pat.dia_max}, {pat.repeticiones} veces en {pat.meses_distintos} meses"
        ),
        interpretacion=nombre,
        propuesta=pregunta,
        vencimiento=venc,
        estado=estado,
    )


def perfilar(s: Session, llm: LLM) -> list[PropuestaRegla]:
    propuestas, textos, sospechosos = _propuestas(llm)
    for m in sospechosos:  # el texto se trata como dato: no genera propuestas (T08)
        registrar_mcp_log(
            s,
            tool="belo_list_transactions",
            referencia_id=m.id,
            estado="INTENTO_BLOQUEADO",
            live=False,
            detalle={"regla": "dato con instrucciones (prompt injection)"},
        )
    return [_a_api(p, textos) for p in propuestas]


def confirmar(s: Session, llm: LLM, propuesta_id: str, confirmar_: bool) -> PropuestaRegla:
    propuestas, textos, _ = _propuestas(llm)
    p = next((x for x in propuestas if x.id == propuesta_id), None)
    if p is None:
        raise HTTPException(404, f"No existe la propuesta {propuesta_id}")
    if not confirmar_:
        return _a_api(p, textos, "descartada")
    _, venc = confirmar_propuesta(p, datetime.now(UTC))
    if p.patron.tipo != "ingreso":  # un ingreso no es un vencimiento: solo se espera
        nombre = textos.get(p.id, (venc.label, ""))[0]
        agregar_vencimiento(
            s,
            VencimientoDB(
                id=venc.id,
                user_id=USUARIO,
                label=nombre,
                amount=f"{venc.amount:.2f}",
                currency=venc.currency,
                due_day=venc.due_day,
                origen="perfilado",
                confirmado_en=venc.confirmada_en,
            ),
        )
    return _a_api(p, textos, "confirmada")
