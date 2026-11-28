"""Paquete de persistencia SQLite con SQLModel."""

from app.db.modelos import (
    McpLogDB,
    MovimientoDB,
    NivelAutonomiaDB,
    PerfilDB,
    PlanDB,
    ReglaDB,
    VencimientoDB,
)
from app.db.repositorio import (
    actualizar_estado_movimiento,
    actualizar_pausa_global,
    agregar_vencimiento,
    listar_mcp_log,
    listar_vencimientos,
    obtener_niveles_autonomia,
    obtener_perfil,
    obtener_reglas,
    registrar_mcp_log,
    registrar_o_obtener_movimiento,
    registrar_o_obtener_plan,
)
from app.db.semilla import reiniciar_demo, sembrar_sofia
from app.db.sesion import crear_engine, get_session, init_db, obtener_database_url

__all__ = [
    "McpLogDB",
    "MovimientoDB",
    "NivelAutonomiaDB",
    "PerfilDB",
    "PlanDB",
    "ReglaDB",
    "VencimientoDB",
    "actualizar_estado_movimiento",
    "actualizar_pausa_global",
    "agregar_vencimiento",
    "crear_engine",
    "get_session",
    "init_db",
    "listar_mcp_log",
    "listar_vencimientos",
    "obtener_database_url",
    "obtener_niveles_autonomia",
    "obtener_perfil",
    "obtener_reglas",
    "registrar_mcp_log",
    "registrar_o_obtener_movimiento",
    "registrar_o_obtener_plan",
    "reiniciar_demo",
    "sembrar_sofia",
]
