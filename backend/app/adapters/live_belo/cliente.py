"""`LiveBeloMCPAdapter`: habla MCP con Belo (real o simulado) y devuelve modelos del dominio.

    async with LiveBeloMCPAdapter("http://127.0.0.1:8001/mcp") as belo:   # MCP simulado
        saldos = await belo.saldos()

Con la URL real (`https://b2b.belo.app/mcp`) usa OAuth con la sesión guardada (ver `oauth.py`).
Reglas que cumple:
- Solo se usa detrás de `BeloPort`: nadie más llama a Belo.
- Mover dinero real exige `BELO_PERMITIR_MOVER=1` (la URL pública nunca lo tiene, D16).
- Cualquier fallo al confirmar se trata como resultado desconocido: el dominio reconcilia con
  `transaccion()` y nunca reintenta a ciegas (T05). Repetir una confirmación es seguro en Belo.
"""

import json
import os
from contextlib import AsyncExitStack
from decimal import Decimal
from typing import Any
from urllib.parse import urlparse

import httpx2
from mcp import Client
from mcp.client.streamable_http import streamable_http_client

from . import traduccion as tr
from .modelos import Boveda, Cotizacion, EstadoTransaccion, Pagina, Red, Saldo
from .oauth import proveedor

URL_BELO = "https://b2b.belo.app/mcp"
LOCALES = {"localhost", "127.0.0.1", "::1"}


class ErrorBelo(RuntimeError):
    """Error de una tool de Belo. `desconocido` indica que no se sabe si el dinero se movió."""

    def __init__(self, mensaje: str, *, desconocido: bool = False) -> None:
        super().__init__(mensaje)
        self.desconocido = desconocido


class LiveBeloMCPAdapter:
    def __init__(self, servidor: Any = None, *, timeout: float = 30.0) -> None:
        """`servidor`: URL del MCP (por defecto `BELO_MCP_URL`) o, en tests, un `MCPServer`."""
        self.servidor = servidor or os.getenv("BELO_MCP_URL") or URL_BELO
        self.timeout = timeout
        self._pila = AsyncExitStack()
        self._cliente: Client | None = None

    # ------------------------------------------------------------------ conexión
    @property
    def es_belo_real(self) -> bool:
        if not isinstance(self.servidor, str):
            return False
        return (urlparse(self.servidor).hostname or "") not in LOCALES

    async def __aenter__(self) -> "LiveBeloMCPAdapter":
        destino = self.servidor
        if isinstance(destino, str):
            auth = proveedor(destino) if self.es_belo_real else None
            http = await self._pila.enter_async_context(
                httpx2.AsyncClient(auth=auth, timeout=httpx2.Timeout(self.timeout, read=300))
            )
            destino = streamable_http_client(destino, http_client=http)
        self._cliente = await self._pila.enter_async_context(Client(destino))
        return self

    async def __aexit__(self, *exc) -> None:
        await self._pila.aclose()
        self._cliente = None

    async def _llamar(self, tool: str, argumentos: dict | None = None) -> tuple[dict, str, bool]:
        if self._cliente is None:
            raise RuntimeError("Usa el adaptador dentro de `async with`.")
        args = {k: v for k, v in (argumentos or {}).items() if v is not None}
        r = await self._cliente.call_tool(tool, args, read_timeout_seconds=self.timeout)
        texto = "\n".join(getattr(c, "text", "") for c in r.content or [])
        if r.is_error:
            raise ErrorBelo(texto or f"{tool} devolvió un error")
        datos = r.structured_content
        if isinstance(datos, dict) and set(datos) == {"result"}:
            datos = datos["result"]
        if not isinstance(datos, dict):
            datos = json.loads(texto)
        return datos, texto, not datos.get("simulado", False)

    # ------------------------------------------------------------------ lecturas
    async def saldos(self) -> list[Saldo]:
        r, _, live = await self._llamar("belo_get_balances")
        return tr.saldos(r, live)

    async def movimientos(
        self,
        *,
        desde: str | None = None,
        hasta: str | None = None,
        tipo: str | None = None,
        moneda: str | None = None,
        pagina: int = 1,
        limite: int = 20,
    ) -> Pagina:
        args = {
            "from": desde,
            "to": hasta,
            "type": tipo,
            "page": pagina,
            "limit": limite,
            "currency": tr.moneda_a_belo(moneda) if moneda else None,
        }
        r, _, live = await self._llamar("belo_list_transactions", args)
        return tr.pagina(r, live)

    async def transaccion(self, transaction_id: str) -> EstadoTransaccion:
        r, _, live = await self._llamar("belo_get_transaction", {"transactionId": transaction_id})
        return tr.transaccion(r, live)

    async def redes(self, moneda: str) -> list[Red]:
        r, _, live = await self._llamar(
            "belo_get_transfer_networks", {"currency": tr.moneda_a_belo(moneda)}
        )
        return tr.redes(r, live)

    async def bovedas(self) -> list[Boveda]:
        r, _, live = await self._llamar("belo_list_vaults")
        return tr.bovedas(r, live)

    # ------------------------------------------------------------------ cotizar (no mueve dinero)
    async def cotizar_conversion(
        self, par: str, monto: Decimal, moneda: str, tipo: str
    ) -> Cotizacion:
        """`par` como "USD/ARS"; `tipo` BUY (comprar la base) o SELL (vender la base)."""
        args = {
            "pairCode": tr.par_a_belo(par),
            "quoteAmount": str(monto),
            "quoteCurrency": tr.moneda_a_belo(moneda),
            "type": tipo,
        }
        r, _, live = await self._llamar("belo_preview_swap", args)
        return tr.cotizacion_swap(r, live)

    async def cotizar_transferencia(
        self, direccion: str, tipo_direccion: str, moneda: str, monto: Decimal
    ) -> Cotizacion:
        args = {
            "address": direccion,
            "addressType": tipo_direccion,
            "currency": tr.moneda_a_belo(moneda),
            "quoteAmount": str(monto),
        }
        r, _, live = await self._llamar("belo_preview_transfer", args)
        return tr.cotizacion_transferencia(r, live)

    # ------------------------------------------------------------------ confirmar (mueve dinero)
    async def confirmar_conversion(
        self, cotizacion_id: str, *, esperar: bool = False
    ) -> EstadoTransaccion:
        return await self._confirmar("belo_confirm_swap", cotizacion_id, esperar)

    async def confirmar_transferencia(
        self, cotizacion_id: str, *, esperar: bool = False
    ) -> EstadoTransaccion:
        return await self._confirmar("belo_confirm_transfer", cotizacion_id, esperar)

    async def _confirmar(self, tool: str, cotizacion_id: str, esperar: bool) -> EstadoTransaccion:
        if self.es_belo_real and os.getenv("BELO_PERMITIR_MOVER") != "1":
            raise ErrorBelo("Mover dinero real está desactivado (BELO_PERMITIR_MOVER no es 1).")
        try:
            r, texto, live = await self._llamar(
                tool, {"transactionId": cotizacion_id, "waitForApproval": esperar}
            )
        except Exception as e:  # timeout, red o error de la tool: no se sabe si se movió
            raise ErrorBelo(f"Resultado desconocido al confirmar: {e}", desconocido=True) from e
        return tr.confirmacion(r, live, texto)
