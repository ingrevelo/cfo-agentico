"""Modelos SQLModel en SQLite para reglas, planes, movimientos, autonomía y MCP Log."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import UniqueConstraint
from sqlmodel import Field, SQLModel


def _ahora_utc() -> datetime:
    return datetime.now(UTC)


class PerfilDB(SQLModel, table=True):
    """Perfil de la persona usuaria (sintético en la demo)."""

    __tablename__ = "perfiles"

    user_id: str = Field(primary_key=True)
    nombre: str
    ciudad: str
    ocupacion: str
    moneda_ingreso: str = "USD"
    pausa_global: bool = False
    creado_en: datetime = Field(default_factory=_ahora_utc)


class ReglaDB(SQLModel, table=True):
    """Reglas duras y preferencias blandas persistidas en código/DB, nunca en el prompt."""

    __tablename__ = "reglas"

    user_id: str = Field(primary_key=True, foreign_key="perfiles.user_id")
    min_cushion_usd: str = "500.00"
    cushion_scope_json: str = '["USD", "USDT", "alcancias_usd"]'
    max_conversion_usd: str = "400.00"
    fx_tolerance_pct: str = "2.00"
    fx_advance_trigger_pct: str = "2.00"
    tax_pct_of_income: str = "8.00"
    min_liquid_usd: str = "100.00"
    min_income_trigger_usd: str = "100.00"
    allowed_currencies_json: str = '["USD", "USDT", "USDC", "ARS"]'
    idempotency_required: bool = True
    soft_preferences_json: str = "{}"
    actualizado_en: datetime = Field(default_factory=_ahora_utc)


class VencimientoDB(SQLModel, table=True):
    """Obligaciones confirmadas por la persona (manuales o de origen 'perfilado')."""

    __tablename__ = "vencimientos"

    id: str = Field(primary_key=True)
    user_id: str = Field(index=True, foreign_key="perfiles.user_id")
    label: str
    amount: str
    currency: str
    due_weekday: str | None = None
    due_day: int | None = None
    origen: str = "manual"
    confirmado_en: datetime | None = None


class PlanDB(SQLModel, table=True):
    """Plan generado por un ingreso con clave única para evitar duplicados (T03, T06)."""

    __tablename__ = "planes"

    plan_id: str = Field(primary_key=True)
    user_id: str = Field(index=True, foreign_key="perfiles.user_id")
    ingreso_id: str = Field(unique=True, index=True)
    monto_ingreso_usd: str
    estado: str = "PROPUESTO"
    aprobado_en: datetime | None = None
    creado_en: datetime = Field(default_factory=_ahora_utc)


class MovimientoDB(SQLModel, table=True):
    """Cada paso de un plan con clave de idempotencia `plan_id` + paso."""

    __tablename__ = "movimientos"

    id: int | None = Field(default=None, primary_key=True)
    plan_id: str = Field(index=True, foreign_key="planes.plan_id")
    paso: str
    clave_idempotencia: str = Field(unique=True, index=True)
    categoria: str
    src: str
    dst: str
    monto_usd: str
    monto_destino: str | None = None
    cotizacion_aprobada: str | None = None
    estado: str = "PROPUESTO"
    decision_juez: str = "PEDIR_APROBACION"
    live: bool = False
    belo_tx_id: str | None = None
    creado_en: datetime = Field(default_factory=_ahora_utc)
    actualizado_en: datetime = Field(default_factory=_ahora_utc)


class NivelAutonomiaDB(SQLModel, table=True):
    """Nivel de autonomía ganado (1-4) por usuario y categoría."""

    __tablename__ = "niveles_autonomia"
    __table_args__ = (UniqueConstraint("user_id", "categoria", name="uq_usuario_categoria"),)

    id: int | None = Field(default=None, primary_key=True)
    user_id: str = Field(index=True, foreign_key="perfiles.user_id")
    categoria: str
    nivel: int = 1
    racha_sin_cambios: int = 0
    actualizado_en: datetime = Field(default_factory=_ahora_utc)


class McpLogDB(SQLModel, table=True):
    """Registro de auditoría de cada llamada al MCP o intento bloqueado."""

    __tablename__ = "mcp_log"

    id: int | None = Field(default=None, primary_key=True)
    plan_id: str | None = Field(default=None, index=True)
    paso: str | None = None
    tool: str
    referencia_id: str = Field(index=True)
    estado: str
    live: bool = False
    detalle_json: str = "{}"
    hora: datetime = Field(default_factory=_ahora_utc)
