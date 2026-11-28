"""Lo que devuelve `LiveBeloMCPAdapter`, ya traducido al idioma del dominio.

Montos en `Decimal` y monedas como las usa el dominio (`ARS`, no `ARGt`). Cada resultado lleva
`live`: `True` si vino del MCP real de Belo, `False` si vino del MCP simulado (badge SIMULATED).
"""

from datetime import datetime
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel


class Resultado(BaseModel):
    live: bool


class Saldo(Resultado):
    moneda: str
    disponible: Decimal
    rendimiento: str | None = None  # `yield.rate` tal cual lo informa Belo


class Movimiento(Resultado):
    id: str
    tipo: str  # deposit | withdrawal | swap | transfer | pix_payout
    estado: str
    monto: Decimal | None
    moneda: str | None
    contraparte: str | None = None
    descripcion: str | None = None
    fecha: datetime


class Pagina(Resultado):
    movimientos: list[Movimiento]
    total: int
    siguiente: int | None


class Cotizacion(Resultado):
    """Una cotización vigente: no debita nada. Se confirma con su `id` antes de que venza."""

    id: str
    tipo: Literal["swap", "transfer"]
    vence: datetime | None
    debitos: dict[str, Decimal]
    precio: Decimal | None = None
    par: str | None = None
    monto_base: Decimal | None = None
    monto_cotizado: Decimal | None = None
    comision: Decimal | None = None
    direccion: str | None = None


class EstadoTransaccion(Resultado):
    """Estado de una operación confirmada. Solo `success` y `failed` son finales."""

    id: str
    estado: str  # awaiting_approval | pending | success | failed
    aprobacion: str | None = None  # pending | approved | rejected | expired
    aprobacion_vence: datetime | None = None
    enlace_aprobacion: str | None = None  # cuando Belo pide aprobar en un enlace

    @property
    def final(self) -> bool:
        return self.estado in ("success", "failed")


class Red(Resultado):
    tipo_direccion: str
    minimo: Decimal | None
    maximo: Decimal | None
    comision: Decimal
    disponible: bool


class Boveda(Resultado):
    id: str
    nombre: str
    moneda: str
    saldo: Decimal
    rinde: bool
