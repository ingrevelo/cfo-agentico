"""El único archivo que conoce los nombres de campos y monedas de Belo.

Si Belo cambia un campo, solo cambia esto. Entrada: el JSON de cada tool (`outputSchema` real,
ver `docs/belo-mcp/tools.json`). Salida: los modelos de `modelos.py`.
"""

import re
from datetime import datetime
from decimal import Decimal

from .modelos import Boveda, Cotizacion, EstadoTransaccion, Movimiento, Pagina, Red, Saldo

# El dominio usa ARS; Belo llama ARGt a los pesos argentinos.
A_BELO = {"ARS": "ARGt"}
DESDE_BELO = {v: k for k, v in A_BELO.items()}
_ENLACE = re.compile(r"https://\S+")


def moneda_a_belo(moneda: str) -> str:
    return A_BELO.get(moneda, moneda)


def moneda_desde_belo(moneda: str | None) -> str | None:
    return DESDE_BELO.get(moneda, moneda) if moneda else moneda


def par_a_belo(par: str) -> str:
    base, _, cotizada = par.partition("/")
    return f"{moneda_a_belo(base)}/{moneda_a_belo(cotizada)}"


def par_desde_belo(par: str | None) -> str | None:
    if not par:
        return par
    base, _, cotizada = par.partition("/")
    return f"{moneda_desde_belo(base)}/{moneda_desde_belo(cotizada)}"


def _dec(valor: str | None) -> Decimal | None:
    return Decimal(valor) if valor not in (None, "") else None


def _fecha(valor: str | None) -> datetime | None:
    return datetime.fromisoformat(valor.replace("Z", "+00:00")) if valor else None


def _debitos(lista: list[dict] | None) -> dict[str, Decimal]:
    return {moneda_desde_belo(d["currency"]): Decimal(d["amount"]) for d in lista or []}


def saldos(r: dict, live: bool) -> list[Saldo]:
    return [
        Saldo(
            live=live,
            moneda=moneda_desde_belo(s["currencyCode"]),
            disponible=Decimal(s["available"]),
            rendimiento=(s.get("yield") or {}).get("rate"),
        )
        for s in r["data"]
    ]


def movimiento(m: dict, live: bool) -> Movimiento:
    recibo = m.get("receipt") or {}
    contraparte = (recibo.get("counterparty") or {}).get("name")
    descripcion = (m.get("metadata") or {}).get("description")
    return Movimiento(
        live=live,
        id=m["id"],
        tipo=m["type"],
        estado=m["status"],
        monto=_dec(m.get("amount")),
        moneda=moneda_desde_belo(m.get("currency")),
        contraparte=contraparte,
        descripcion=descripcion,
        fecha=_fecha(m["createdAt"]),
    )


def pagina(r: dict, live: bool) -> Pagina:
    p = r.get("pagination") or {}
    return Pagina(
        live=live,
        movimientos=[movimiento(m, live) for m in r["data"]],
        total=int(p.get("total", len(r["data"]))),
        siguiente=p.get("nextPage"),
    )


def cotizacion_swap(r: dict, live: bool) -> Cotizacion:
    base, _, cotizada = r["pairCode"].partition("/")
    monto_base, monto_cot = _dec(r.get("baseAmount")), _dec(r.get("quoteAmount"))
    # BUY: se paga con la moneda cotizada; SELL: se entrega la moneda base.
    debitos = (
        {moneda_desde_belo(cotizada): monto_cot}
        if r["type"] == "BUY"
        else {moneda_desde_belo(base): monto_base}
    )
    return Cotizacion(
        live=live,
        id=r["id"],
        tipo="swap",
        vence=_fecha(r.get("expiresAt")),
        debitos={k: v for k, v in debitos.items() if v is not None},
        precio=_dec(r.get("price")),
        par=par_desde_belo(r["pairCode"]),
        monto_base=monto_base,
        monto_cotizado=monto_cot,
    )


def cotizacion_transferencia(r: dict, live: bool) -> Cotizacion:
    return Cotizacion(
        live=live,
        id=r["id"],
        tipo="transfer",
        vence=_fecha(r.get("expiresAt")),
        debitos=_debitos(r.get("debits")),
        comision=_dec(r.get("fee")),
        monto_cotizado=_dec(r.get("amount")),
        direccion=r.get("address"),
    )


def confirmacion(r: dict, live: bool, texto: str = "") -> EstadoTransaccion:
    enlace = _ENLACE.search(texto)
    return EstadoTransaccion(
        live=live,
        id=r["id"],
        estado=r["status"],
        aprobacion_vence=_fecha(r.get("approvalExpiresAt")),
        enlace_aprobacion=enlace.group(0).rstrip(").,") if enlace else None,
    )


def transaccion(r: dict, live: bool) -> EstadoTransaccion:
    aprob = r.get("approval") or {}
    return EstadoTransaccion(
        live=live,
        id=r["id"],
        estado=r["status"],
        aprobacion=aprob.get("status"),
        aprobacion_vence=_fecha(aprob.get("expiresAt")),
    )


def redes(r: dict, live: bool) -> list[Red]:
    return [
        Red(
            live=live,
            tipo_direccion=n["addressType"],
            minimo=_dec(n.get("minAmount")),
            maximo=_dec(n.get("maxAmount")),
            comision=Decimal(n["fee"]),
            disponible=bool(n["available"]),
        )
        for n in r["networks"]
    ]


def bovedas(r: dict, live: bool) -> list[Boveda]:
    return [
        Boveda(
            live=live,
            id=str(b["id"]),
            nombre=b["details"]["name"],
            moneda=moneda_desde_belo(b["currencyCode"]),
            saldo=Decimal(b["balance"]),
            rinde=bool(b.get("isYieldActive")),
        )
        for b in r["data"]
    ]
