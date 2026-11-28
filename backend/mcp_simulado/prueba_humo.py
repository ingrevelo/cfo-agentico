"""Prueba de humo del MCP simulado, hablando MCP de verdad por HTTP.

Con el servidor corriendo (`python -m mcp_simulado`), desde backend/:

    uv run --with "mcp>=2.3" python -m mcp_simulado.prueba_humo

Recorre las tools de lectura y el flujo del plan de Sofía: cotizar → confirmar →
aprobar → consultar, más el Caso Rojo de FX, el rechazo y el timeout.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys

from mcp.client.session import ClientSession
from mcp.client.streamable_http import streamable_http_client

URL = os.getenv("BELO_MCP_URL", "http://127.0.0.1:8001/mcp")
fallas: list[str] = []


def revisar(condicion: bool, que: str) -> None:
    print(("  ok  " if condicion else "  MAL ") + que)
    if not condicion:
        fallas.append(que)


async def llamar(s: ClientSession, tool: str, **args) -> tuple[bool, dict | str]:
    r = await s.call_tool(tool, args)
    texto = r.content[0].text if r.content else ""
    if r.is_error:
        return False, texto
    return True, json.loads(texto)


async def main() -> None:
    async with (
        streamable_http_client(URL) as (lectura, escritura),
        ClientSession(lectura, escritura) as s,
    ):
        await s.initialize()
        nombres = {t.name for t in (await s.list_tools()).tools}
        print(f"{len(nombres)} tools en {URL}")
        await llamar(s, "simulado_reiniciar")

        print("\nLecturas")
        ok, b = await llamar(s, "belo_get_balances")
        usd = next(x for x in b["data"] if x["currencyCode"] == "USD")
        revisar(
            ok and b["simulado"] and usd["available"] == "1500.00",
            "saldo inicial USD 1500.00, marcado como simulado",
        )
        ok, t = await llamar(s, "belo_list_transactions", limit=5)
        revisar(
            ok and t["pagination"]["total"] == 43 and len(t["data"]) == 5,
            "historial de 43 movimientos, paginado",
        )
        ok, t = await llamar(s, "belo_list_transactions", type="deposit", **{"from": "2026-11-01"})
        revisar(ok and all(m["type"] == "deposit" for m in t["data"]), "filtros type y from")
        ok, v = await llamar(s, "belo_list_vaults")
        revisar(ok and v["data"][0]["details"]["name"] == "Impuestos", "bóveda Impuestos")

        print("\nPlan: USD 900 → USDT (aprobación automática)")
        ok, q = await llamar(
            s,
            "belo_preview_swap",
            pairCode="USDT/USD",
            quoteAmount="900",
            quoteCurrency="USD",
            type="BUY",
        )
        revisar(ok and q["status"] == "quoted", "cotización creada, sin debitar")
        ok, c = await llamar(s, "belo_confirm_swap", transactionId=q["id"])
        revisar(ok and c["status"] == "success", "confirmada y aprobada")
        ok, c2 = await llamar(s, "belo_confirm_swap", transactionId=q["id"])
        revisar(
            ok and c2["status"] == "success", "confirmar dos veces no repite el movimiento (T06)"
        )
        ok, b = await llamar(s, "belo_get_balances")
        saldos = {x["currencyCode"]: x["available"] for x in b["data"]}
        revisar(
            saldos["USD"] == "600.00" and saldos["USDT"] == "900.00", "USD 600.00 y USDT 900.00"
        )

        print("\nAlquiler: transferencia ARGt a alias con aprobación manual")
        await llamar(s, "simulado_configurar", aprobacion="manual")
        ok, q = await llamar(
            s,
            "belo_preview_swap",
            pairCode="USD/ARGt",
            quoteAmount="450000",
            quoteCurrency="ARGt",
            type="SELL",
        )
        await llamar(s, "belo_confirm_swap", transactionId=q["id"])
        ok, c = await llamar(s, "belo_get_transaction", transactionId=q["id"])
        revisar(ok and c["status"] == "awaiting_approval", "queda en awaiting_approval")
        ok, c = await llamar(s, "simulado_aprobar", transactionId=q["id"])
        revisar(ok and c["status"] == "success", "la persona aprueba en Belo (simulado)")
        ok, q = await llamar(
            s,
            "belo_preview_transfer",
            address="sofia.alquiler.demo",
            addressType="ALIAS",
            currency="ARGt",
            quoteAmount="450000",
        )
        await llamar(s, "belo_confirm_transfer", transactionId=q["id"])
        ok, c = await llamar(s, "simulado_aprobar", transactionId=q["id"], aprobar=False)
        revisar(ok and c["status"] == "failed", "rechazo: queda en failed y no mueve nada")

        print("\nFallos")
        ok, e = await llamar(
            s,
            "belo_preview_transfer",
            address="x",
            addressType="CBU",
            currency="USD",
            quoteAmount="10",
        )
        revisar(not ok and "pesos argentinos" in e, "banco solo para ARGt")
        ok, e = await llamar(s, "belo_get_transfer_networks", currency="ARS")
        revisar(not ok and "ARGt" in e, "ARS se rechaza y sugiere ARGt")
        ok, b = await llamar(s, "belo_get_balances")
        revisar(ok and any(x["currencyCode"] == "ARGt" for x in b["data"]), "saldos con ARGt")
        await llamar(s, "simulado_configurar", aprobacion="auto", fallo="timeout")
        ok, q = await llamar(
            s,
            "belo_preview_swap",
            pairCode="USDT/USD",
            quoteAmount="10",
            quoteCurrency="USD",
            type="BUY",
        )
        ok, e = await llamar(s, "belo_confirm_swap", transactionId=q["id"])
        revisar(not ok and "Tiempo de espera" in e, "timeout simulado en la confirmación")
        ok, c = await llamar(s, "belo_get_transaction", transactionId=q["id"])
        revisar(
            ok and c["status"] == "success", "la reconciliación encuentra el movimiento hecho (T05)"
        )
        ok, cfg = await llamar(s, "simulado_configurar", fx_usd_ars="1150", fallo="ninguno")
        revisar(ok and cfg["fx_usd_ars"] == "1150", "cotización USD/ARGt cambiada a 1150 (T09)")
        await llamar(s, "simulado_reiniciar")

    print(f"\n{'Todo bien' if not fallas else f'{len(fallas)} fallas'}")
    sys.exit(1 if fallas else 0)


if __name__ == "__main__":
    asyncio.run(main())
