"""Operaciones de persistencia con idempotencia estricta y auditoría en MCP Log."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

from sqlmodel import Session, select

from app.db.modelos import (
    McpLogDB,
    MovimientoDB,
    NivelAutonomiaDB,
    PerfilDB,
    PlanDB,
    ReglaDB,
    VencimientoDB,
)


def _a_texto_decimal(valor: Decimal | int | str) -> str:
    return format(Decimal(str(valor)).quantize(Decimal("0.01")), "f")


def obtener_perfil(session: Session, user_id: str) -> PerfilDB | None:
    return session.get(PerfilDB, user_id)


def obtener_reglas(session: Session, user_id: str) -> ReglaDB | None:
    return session.get(ReglaDB, user_id)


def actualizar_pausa_global(session: Session, user_id: str, activa: bool) -> PerfilDB:
    perfil = session.get(PerfilDB, user_id)
    if perfil is None:
        raise KeyError(f"Perfil no encontrado: {user_id}")
    perfil.pausa_global = activa
    session.add(perfil)
    session.commit()
    session.refresh(perfil)
    return perfil


def listar_vencimientos(session: Session, user_id: str) -> list[VencimientoDB]:
    stmt = select(VencimientoDB).where(VencimientoDB.user_id == user_id)
    return list(session.exec(stmt).all())


def agregar_vencimiento(session: Session, vencimiento: VencimientoDB) -> VencimientoDB:
    existente = session.get(VencimientoDB, vencimiento.id)
    if existente is not None:
        return existente
    session.add(vencimiento)
    session.commit()
    session.refresh(vencimiento)
    return vencimiento


def registrar_o_obtener_plan(
    session: Session,
    plan_id: str,
    user_id: str,
    ingreso_id: str,
    monto_ingreso_usd: Decimal | str,
) -> tuple[PlanDB, bool]:
    """Crea un plan o devuelve el existente si `plan_id` o `ingreso_id` ya se procesaron."""
    por_plan = session.get(PlanDB, plan_id)
    if por_plan is not None:
        return por_plan, False

    por_ingreso = session.exec(select(PlanDB).where(PlanDB.ingreso_id == ingreso_id)).first()
    if por_ingreso is not None:
        return por_ingreso, False

    plan = PlanDB(
        plan_id=plan_id,
        user_id=user_id,
        ingreso_id=ingreso_id,
        monto_ingreso_usd=_a_texto_decimal(monto_ingreso_usd),
    )
    session.add(plan)
    session.commit()
    session.refresh(plan)
    return plan, True


def registrar_o_obtener_movimiento(
    session: Session,
    plan_id: str,
    paso: str,
    clave_idempotencia: str,
    categoria: str,
    src: str,
    dst: str,
    monto_usd: Decimal | str,
    monto_destino: Decimal | str | None = None,
    cotizacion_aprobada: Decimal | str | None = None,
    decision_juez: str = "PEDIR_APROBACION",
    live: bool = False,
) -> tuple[MovimientoDB, bool]:
    """Crea un movimiento o devuelve el existente por `clave_idempotencia`."""
    existente = session.exec(
        select(MovimientoDB).where(MovimientoDB.clave_idempotencia == clave_idempotencia)
    ).first()
    if existente is not None:
        return existente, False

    mov = MovimientoDB(
        plan_id=plan_id,
        paso=paso,
        clave_idempotencia=clave_idempotencia,
        categoria=categoria,
        src=src,
        dst=dst,
        monto_usd=_a_texto_decimal(monto_usd),
        monto_destino=_a_texto_decimal(monto_destino) if monto_destino is not None else None,
        cotizacion_aprobada=(
            _a_texto_decimal(cotizacion_aprobada) if cotizacion_aprobada is not None else None
        ),
        decision_juez=decision_juez,
        live=live,
    )
    session.add(mov)
    session.commit()
    session.refresh(mov)
    return mov, True


def actualizar_estado_movimiento(
    session: Session,
    clave_idempotencia: str,
    nuevo_estado: str,
    belo_tx_id: str | None = None,
    live: bool | None = None,
) -> MovimientoDB:
    mov = session.exec(
        select(MovimientoDB).where(MovimientoDB.clave_idempotencia == clave_idempotencia)
    ).first()
    if mov is None:
        raise KeyError(f"Movimiento no encontrado: {clave_idempotencia}")
    mov.estado = nuevo_estado
    if belo_tx_id is not None:
        mov.belo_tx_id = belo_tx_id
    if live is not None:
        mov.live = live
    mov.actualizado_en = datetime.now(UTC)
    session.add(mov)
    session.commit()
    session.refresh(mov)
    return mov


def obtener_niveles_autonomia(session: Session, user_id: str) -> dict[str, int]:
    stmt = select(NivelAutonomiaDB).where(NivelAutonomiaDB.user_id == user_id)
    return {row.categoria: row.nivel for row in session.exec(stmt).all()}


def registrar_mcp_log(
    session: Session,
    tool: str,
    referencia_id: str,
    estado: str,
    live: bool,
    plan_id: str | None = None,
    paso: str | None = None,
    detalle: dict[str, Any] | None = None,
) -> McpLogDB:
    entry = McpLogDB(
        plan_id=plan_id,
        paso=paso,
        tool=tool,
        referencia_id=referencia_id,
        estado=estado,
        live=live,
        detalle_json=json.dumps(detalle or {}, ensure_ascii=False),
    )
    session.add(entry)
    session.commit()
    session.refresh(entry)
    return entry


def listar_mcp_log(session: Session, plan_id: str | None = None) -> list[McpLogDB]:
    stmt = select(McpLogDB)
    if plan_id is not None:
        stmt = stmt.where(McpLogDB.plan_id == plan_id)
    stmt = stmt.order_by(McpLogDB.id)  # type: ignore[arg-type]
    return list(session.exec(stmt).all())
