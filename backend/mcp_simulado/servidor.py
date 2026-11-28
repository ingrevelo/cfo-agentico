"""Servidor MCP simulado: mismas tools, parámetros y forma de respuesta que el MCP de Belo.

Ver `docs/belo-mcp/tools.json` (estructura real). Solo las tools que usa CFO Agéntico, más cuatro
`simulado_*` para manejar la demo y los tests. Cada respuesta lleva `"simulado": true`.
"""

import functools
import inspect
from typing import Annotated, Literal

from mcp.server.mcpserver import MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from mcp.types import ToolAnnotations
from pydantic import Field

from .estado import APROBACIONES, FALLOS, ErrorSimulado, Estado, dec

estado = Estado()
mcp = MCPServer(
    name="belo-simulado",
    version="0.2.0",
    instructions=(
        "MCP SIMULADO de CFO Agéntico. Imita las tools de Belo con datos sintéticos: "
        "nada de lo que hace mueve dinero real."
    ),
)

LECTURA = ToolAnnotations(readOnlyHint=True, destructiveHint=False, idempotentHint=True)
COTIZA = ToolAnnotations(readOnlyHint=False, destructiveHint=False, idempotentHint=False)
MUEVE = ToolAnnotations(readOnlyHint=False, destructiveHint=True, idempotentHint=True)


def _sim(datos: dict) -> dict:
    return {"simulado": True, **datos}


def herramienta(annotations: ToolAnnotations | None = None):
    """Registra la tool y devuelve los ErrorSimulado como error de la tool, con su mensaje."""

    def registrar(fn):
        @functools.wraps(fn)
        def envuelta(*args, **kwargs):
            try:
                return fn(*args, **kwargs)
            except ErrorSimulado as e:
                raise ToolError(str(e)) from e

        return mcp.tool(annotations=annotations)(envuelta)

    return registrar


# ---------------------------------------------------------------------- solo lectura
@herramienta(LECTURA)
def belo_get_balances() -> dict:
    """Saldo disponible por moneda, con el rendimiento (yield.rate) y lo ganado."""
    return _sim(estado.saldos_vista())


def _listar(
    currency: str | None = None,
    from_: Annotated[str | None, Field(alias="from")] = None,
    to: str | None = None,
    type: Literal["deposit", "withdrawal", "swap", "transfer", "pix_payout"] | None = None,
    page: int = 1,
    limit: int = 20,
) -> dict:
    movs = estado.movimientos()
    if currency:
        movs = [m for m in movs if m["currency"] == currency]
    if type:
        movs = [m for m in movs if m["type"] == type]
    if from_:
        movs = [m for m in movs if m["createdAt"] >= from_]
    if to:
        movs = [m for m in movs if m["createdAt"] <= to]
    page, limit = max(page, 1), min(max(limit, 1), 100)
    inicio = (page - 1) * limit
    hay_mas = inicio + limit < len(movs)
    return _sim(
        {
            "data": movs[inicio : inicio + limit],
            "pagination": {
                "total": len(movs),
                "limit": limit,
                "currentPage": page,
                "nextPage": page + 1 if hay_mas else None,
                "prevPage": page - 1 if page > 1 else None,
            },
        }
    )


def belo_list_transactions(**argumentos) -> dict:
    """Historial de movimientos, del más reciente al más antiguo."""
    # El parámetro se llama `from`, palabra reservada en Python: el SDK lo entrega por su alias.
    if "from" in argumentos:
        argumentos["from_"] = argumentos.pop("from")
    return _listar(**argumentos)


belo_list_transactions.__signature__ = inspect.signature(_listar)
belo_list_transactions.__annotations__ = _listar.__annotations__
herramienta(LECTURA)(belo_list_transactions)


@herramienta(LECTURA)
def belo_get_transaction(transactionId: str) -> dict:  # noqa: N803 (nombre del MCP de Belo)
    """Una transacción con su estado: awaiting_approval, pending, success o failed."""
    for m in estado.historial:
        if m["id"] == transactionId:
            return _sim(m)
    return _sim(estado.buscar(transactionId).vista_transaccion())


@herramienta(LECTURA)
def belo_get_transfer_networks(currency: str) -> dict:
    """Redes por las que se puede enviar una moneda, con su mínimo, máximo y comisión."""
    return _sim(estado.redes(currency))


@herramienta(LECTURA)
def belo_list_vaults(currencyCode: str | None = None) -> dict:  # noqa: N803
    """Bóvedas de ahorro. Desde este servidor no se puede meter ni sacar dinero de una bóveda."""
    return _sim({"data": [estado.boveda()] if currencyCode in (None, "USDC") else []})


@herramienta(LECTURA)
def belo_get_vault(vaultId: str) -> dict:  # noqa: N803
    """Una bóveda con lo ganado: total, hoy, ayer, semana, mes y año."""
    if vaultId != "1":
        raise ErrorSimulado(f"No existe la bóveda {vaultId}")
    ganado = dict.fromkeys(("total", "today", "yesterday", "week", "month", "year"), "0.00")
    return _sim({**estado.boveda(), "earned": ganado})


# ---------------------------------------------------------------------- cotizar
@herramienta(COTIZA)
def belo_preview_swap(
    pairCode: str,  # noqa: N803
    quoteAmount: str,  # noqa: N803
    quoteCurrency: str,  # noqa: N803
    type: Literal["BUY", "SELL"],
) -> dict:
    """Cotiza una conversión. Vence a los 15 minutos. No debita nada."""
    return _sim(estado.cotizar_swap(pairCode, quoteAmount, quoteCurrency, type).vista_cotizacion())


@herramienta(COTIZA)
def belo_preview_transfer(
    address: str,
    addressType: str,  # noqa: N803
    currency: str,
    quoteAmount: str,  # noqa: N803
    quoteCurrency: str | None = None,  # noqa: N803
) -> dict:
    """Cotiza un envío: interno de Belo, a CVU/CBU/alias (solo ARGt) o cripto. No debita nada."""
    if quoteCurrency and quoteCurrency != currency:
        raise ErrorSimulado("En el simulado, quoteCurrency debe ser igual a currency")
    cotizacion = estado.cotizar_transferencia(address, addressType, currency, quoteAmount)
    return _sim(cotizacion.vista_cotizacion())


# ---------------------------------------------------------------------- mueven dinero (simulado)
@herramienta(MUEVE)
def belo_confirm_swap(transactionId: str, waitForApproval: bool = False) -> dict:  # noqa: N803
    """Confirma la conversión cotizada. Queda en awaiting_approval hasta que la persona apruebe."""
    return _sim(estado.confirmar(transactionId, "swap").vista_confirmacion())


@herramienta(MUEVE)
def belo_confirm_transfer(transactionId: str, waitForApproval: bool = False) -> dict:  # noqa: N803
    """Confirma el envío cotizado. Queda en awaiting_approval hasta que la persona apruebe."""
    return _sim(estado.confirmar(transactionId, "transfer").vista_confirmacion())


# ---------------------------------------------------------------------- control de la demo
@herramienta()
def simulado_aprobar(transactionId: str, aprobar: bool = True) -> dict:  # noqa: N803
    """Simula que la persona aprueba (o rechaza) en Belo una transacción en awaiting_approval."""
    return _sim(estado.resolver(transactionId, aprobar).vista_transaccion())


@herramienta()
def simulado_configurar(
    fx_usd_ars: str | None = None,
    aprobacion: Literal["auto", "manual", "rechazo"] | None = None,
    fallo: Literal["ninguno", "timeout"] | None = None,
) -> dict:
    """Cambia la cotización USDC/ARGt, el modo de aprobación o el modo de fallo (T05 y T09)."""
    if fx_usd_ars is not None:
        estado.fx_usd_ars = dec(fx_usd_ars)
    if aprobacion is not None:
        estado.aprobacion = aprobacion
    if fallo is not None:
        estado.fallo = fallo
    return _sim(
        {
            "fx_usd_ars": str(estado.fx_usd_ars),
            "aprobacion": estado.aprobacion,
            "fallo": estado.fallo,
            "aprobaciones": list(APROBACIONES),
            "fallos": list(FALLOS),
        }
    )


@herramienta()
def simulado_ingreso(monto_usd: str, contraparte: str = "Cliente de la demo") -> dict:
    """Simula la llegada de un pago en USDC a la cuenta de Sofía."""
    return _sim(estado.ingreso(monto_usd, contraparte))


@herramienta()
def simulado_reiniciar() -> dict:
    """Vuelve al estado inicial de la demo (data/sofia-demo.json)."""
    estado.reiniciar()
    return _sim({"ok": True})
