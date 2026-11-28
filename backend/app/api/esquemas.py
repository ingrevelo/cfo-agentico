"""Contrato C3: la forma de cada respuesta de la API.

Los montos viajan como texto decimal ("900.00") para no perder precisión; en el backend son `Decimal`.
Estos esquemas son de la API: el dominio (C1) los llena, pero no depende de ellos.
"""

from datetime import date, datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class EstadoMovimiento(StrEnum):
    PROPUESTO = "PROPUESTO"
    APROBADO = "APROBADO"
    EJECUTANDO = "EJECUTANDO"  # esperando la aprobación en Belo o la respuesta del MCP
    COMPLETADO = "COMPLETADO"
    RETENIDO = "RETENIDO"
    DESCONOCIDO = "DESCONOCIDO"
    FALLIDO = "FALLIDO"
    BLOQUEADO = "BLOQUEADO"
    RECHAZADO = "RECHAZADO"


class Decision(StrEnum):
    EJECUTAR = "EJECUTAR"
    PEDIR_APROBACION = "PEDIR_APROBACION"
    BLOQUEAR = "BLOQUEAR"
    RETENER = "RETENER"


class Monto(BaseModel):
    valor: str = Field(examples=["900.00"], description="Texto decimal con dos decimales")
    moneda: str = Field(examples=["USD"])


class DecisionJuez(BaseModel):
    decision: Decision
    motivos: list[str] = []


class AprobacionBelo(BaseModel):
    """La segunda aprobación (D13): la persona confirma en Belo cada movimiento real."""

    transaction_id: str
    estado: str = Field(examples=["awaiting_approval"], description="Estado que informa Belo")
    url: str | None = None


class Movimiento(BaseModel):
    paso: str = Field(examples=["M1"])
    clave: str = Field(examples=["plan-ing01-M1"], description="Clave de idempotencia: plan_id + paso")
    categoria: str = Field(examples=["rendimiento_usdt"])
    titulo: str
    porque: str
    desde: Monto
    hacia: Monto
    cotizacion: str | None = None
    banda_fx: tuple[str, str] | None = Field(None, description="Mínimo y máximo aceptables (±2%)")
    programado_para: date | None = None
    estado: EstadoMovimiento
    decision_juez: DecisionJuez
    simulado: bool = Field(description="True si no corre en vivo: la pantalla muestra SIMULATED")
    aprobacion_belo: AprobacionBelo | None = None


class ResumenPlan(BaseModel):
    libre_usd: str
    en_dolares_usd: str
    colchon_usd: str
    colchon_cubierto: bool


class Plan(BaseModel):
    plan_id: str = Field(examples=["plan-ing01"])
    creado: datetime
    ingreso: Monto
    titulo: str
    movimientos: list[Movimiento]
    resumen: ResumenPlan
    mensaje: str | None = Field(None, description="Texto para la persona: Caso Rojo, RETENIDO o resumen final")


class Vencimiento(BaseModel):
    id: str
    label: str
    amount: str
    currency: str
    due: str | None = Field(None, examples=["thursday"])
    due_day: int | None = Field(None, examples=[20])
    origen: str = Field("manual", examples=["manual", "perfilado"])


class ReglasDuras(BaseModel):
    min_cushion_usd: str
    cushion_scope: list[str]
    max_conversion_usd: str
    fx_tolerance_pct: str
    fx_advance_trigger_pct: str
    tax_pct_of_income: str
    min_liquid_usd: str
    min_income_trigger_usd: str
    allowed_currencies: list[str]
    idempotency_required: bool = True


class Reglas(BaseModel):
    """Pantalla 1. Mismas claves que `data/sofia-demo.json`, con los montos como texto."""

    user_id: str
    profile: dict[str, str]
    balances: dict[str, str]
    fx_usd_ars: str
    hard_rules: ReglasDuras
    dues: list[Vencimiento]
    autonomy_levels: dict[str, int]
    soft_preferences: dict[str, str]


class CambioReglas(BaseModel):
    hard_rules: ReglasDuras | None = None
    dues: list[Vencimiento] | None = None


class SimularIngreso(BaseModel):
    monto_usd: str = Field("1500", examples=["1500"])


class EditarMovimiento(BaseModel):
    monto_usd: str = Field(examples=["1100"])


class PropuestaRegla(BaseModel):
    id: str = Field(examples=["P1"])
    patron: str = Field(description="Lo que detectó el código")
    interpretacion: str = Field(description="Lo que interpretó el LLM")
    propuesta: str
    vencimiento: Vencimiento | None = None
    estado: str = Field("pendiente", examples=["pendiente", "confirmada", "descartada"])


class ConfirmarPropuesta(BaseModel):
    confirmar: bool = True


class EntradaLog(BaseModel):
    hora: datetime
    plan_id: str | None
    paso: str | None
    tool: str | None = Field(examples=["belo_confirm_swap"])
    regla: str
    estado: str
    monto: str | None = Field(None, examples=["USD 900 → 900 USDT"])
    live: bool


class SolicitudAutonomia(BaseModel):
    categoria: str
    nivel_actual: int
    nivel_propuesto: int
    evidencia: str
    texto: str


class Autonomia(BaseModel):
    niveles: dict[str, int]
    solicitud: SolicitudAutonomia | None = None


class ResponderAutonomia(BaseModel):
    aceptar: bool


class AvanzarReloj(BaseModel):
    dia: str = Field(examples=["martes", "jueves"])
    fx_usd_ars: str | None = Field(None, examples=["1150", "1190", "1220"])


class Ok(BaseModel):
    ok: bool = True
