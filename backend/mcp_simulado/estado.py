"""Estado en memoria del MCP simulado: saldos, cotizaciones y transacciones de Sofía.

Las respuestas tienen la misma forma que los `outputSchema` reales de Belo
(`docs/belo-mcp/tools.json`). Montos con `Decimal`, expuestos como texto decimal.
Las cotizaciones vencen a los 15 minutos. Confirmar deja la transacción en
`awaiting_approval`; el modo de aprobación decide qué pasa después.
"""

from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal
from pathlib import Path

DATOS = Path(__file__).resolve().parents[2] / "data"
VENCE_EN = timedelta(minutes=15)
APROBACIONES = ("auto", "manual", "rechazo")
FALLOS = ("ninguno", "timeout")
# En Belo los pesos argentinos se llaman ARGt; los datos de Sofía y el dominio usan ARS.
PESOS = "ARGt"
DOLAR = "USDC"  # D18: los dólares de Sofía son USDC (Belo no tiene USD)
DESDE_DATOS = {"ARS": PESOS, "USD": DOLAR}

# Valores sintéticos de la demo (no son reglas de negocio: esas viven en backend/app/domain/).
MONEDAS = {
    DOLAR: ("USD Coin", "crypto", "0.00"),
    "USDT": ("Tether", "crypto", "4.50"),
    PESOS: ("Peso argentino", "fiat", "0.00"),
}
REDES = {
    PESOS: [
        ("CVU", "1000", "5000000", "0"),
        ("CBU", "1000", "5000000", "0"),
        ("ALIAS", "1000", "5000000", "0"),
    ],
    "USDT": [("BELOTAG", "", "", "0"), ("TRON", "5", "", "2"), ("POLYGON", "1", "", "1")],
    DOLAR: [("BELOTAG", "", "", "0"), ("POLYGON", "1", "", "1")],
}
INTERNAS = {"BELOTAG", "EMAIL", "USER"}
BANCARIAS = {"CVU", "CBU", "ALIAS"}
TIPOS_HISTORIAL = {
    "ingreso": "deposit",
    "pago": "transfer",
    "gasto_tarjeta": "withdrawal",
    "conversion_y_retiro": "withdrawal",
}


class ErrorSimulado(Exception):
    """Error que la tool devuelve tal cual, como lo haría el MCP de Belo."""


def ahora() -> datetime:
    return datetime.now(UTC)


def validar_moneda(codigo: str) -> str:
    """Valida el código de moneda como lo pide Belo."""
    if codigo == "USD":
        raise ErrorSimulado("Moneda desconocida: USD. En Belo los dólares son USDC o USDT.")
    if codigo == "ARS":
        raise ErrorSimulado(f"Moneda desconocida: ARS. Los pesos argentinos se llaman {PESOS}.")
    return codigo


def dec(valor: object) -> Decimal:
    try:
        d = Decimal(str(valor))
    except Exception as e:
        raise ErrorSimulado(f"Monto inválido: {valor!r}") from e
    if not d.is_finite() or d <= 0:
        raise ErrorSimulado(f"El monto debe ser mayor que cero: {valor!r}")
    return d


def texto(d: Decimal) -> str:
    return str(d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _recibo(
    debitos: dict,
    contraparte: str | None = None,
    conversion: dict | None = None,
    comision: Decimal | None = None,
    moneda_comision: str | None = None,
) -> dict:
    """`receipt` con la forma real de Belo."""
    return {
        "counterparty": None
        if contraparte is None
        else {
            "name": contraparte,
            "bank": None,
            "belotag": None,
            "account": None,
            "accountType": None,
        },
        "debits": [{"currency": c, "amount": texto(m)} for c, m in debitos.items()],
        "netAmount": None,
        "netCurrency": None,
        "fee": None if comision is None else texto(comision),
        "feeCurrency": moneda_comision,
        "taxes": None,
        "taxCurrency": None,
        "conversion": conversion,
        "network": None,
        "transactionHash": None,
        "explorerUrl": None,
        "bankReference": None,
    }


@dataclass
class Transaccion:
    id: str
    tipo: str  # swap | transfer
    estado: str  # quoted | awaiting_approval | pending | success | failed
    creada: datetime
    vence: datetime
    debitos: dict[str, Decimal]
    creditos: dict[str, Decimal]
    comision: Decimal
    detalle: dict = field(default_factory=dict)
    aprobacion: dict | None = None
    actualizada: datetime | None = None

    # -------------------------------------------------------------- vistas con forma real
    def vista_cotizacion(self) -> dict:
        if self.tipo == "swap":
            d = self.detalle
            return {
                "id": self.id,
                "status": self.estado,
                "pairCode": d["pairCode"],
                "type": d["type"],
                "price": d["price"],
                "baseAmount": d["baseAmount"],
                "quoteAmount": d["quoteAmount"],
                "expiresAt": self.vence.isoformat(),
            }
        d = self.detalle
        return {
            "id": self.id,
            "status": self.estado,
            "address": d["address"],
            "addressType": d["addressType"],
            "currency": d["currency"],
            "amount": d["amount"],
            "fee": texto(self.comision),
            "exchangeRate": None,
            "expiresAt": self.vence.isoformat(),
            "debits": [{"currency": c, "amount": texto(m)} for c, m in self.debitos.items()],
        }

    def vista_confirmacion(self) -> dict:
        vence = (self.aprobacion or {}).get("expiresAt")
        return {"id": self.id, "status": self.estado, "approvalExpiresAt": vence}

    def vista_transaccion(self) -> dict:
        moneda, monto = next(iter(self.debitos.items()))
        d = self.detalle
        conversion = None
        if self.tipo == "swap":
            conversion = {
                "pairCode": d["pairCode"],
                "type": d["type"],
                "price": d["price"],
                "baseAmount": d["baseAmount"],
                "quoteAmount": d["quoteAmount"],
            }
        contraparte = d.get("address") if self.tipo == "transfer" else None
        return {
            "id": self.id,
            "type": self.tipo,
            "status": self.estado,
            "amount": texto(monto),
            "currency": moneda,
            "metadata": {"simulado": True},
            "receipt": _recibo(self.debitos, contraparte, conversion, self.comision, moneda),
            "approval": self.aprobacion,
            "createdAt": self.creada.isoformat(),
            "updatedAt": (self.actualizada or self.creada).isoformat(),
        }


class Estado:
    def __init__(self) -> None:
        self.reiniciar()

    def reiniciar(self) -> None:
        sofia = json.loads((DATOS / "sofia-demo.json").read_text(encoding="utf-8"))
        hist = json.loads((DATOS / "historial-sofia.json").read_text(encoding="utf-8"))
        b = sofia["balances"]
        self.saldos = {
            DESDE_DATOS.get(m, m): Decimal(str(b.get(m, 0))) for m in ("USD", "USDT", "ARS")
        }
        self.boveda_impuestos = Decimal(str(b.get("alcancia_impuestos_usd", 0)))
        self.fx_usd_ars = Decimal(str(sofia["fx_demo"]["USD_ARS"]))
        self.aprobacion = "auto"
        self.fallo = "ninguno"
        self.transacciones: dict[str, Transaccion] = {}
        self.historial = [self._desde_historial(m) for m in hist["movimientos"]]

    # ------------------------------------------------------------------ lecturas
    def saldos_vista(self) -> dict:
        data = []
        for moneda, monto in self.saldos.items():
            nombre, tipo, tasa = MONEDAS[moneda]
            data.append(
                {
                    "currencyCode": moneda,
                    "name": nombre,
                    "type": tipo,
                    "decimals": 2,
                    "available": texto(monto),
                    "earned": {"total": "0.00", "today": "0.00", "month": "0.00"},
                    "yield": {"rate": tasa},
                }
            )
        return {"data": data}

    def redes(self, moneda: str) -> dict:
        validar_moneda(moneda)
        if moneda not in REDES:
            raise ErrorSimulado(f"Moneda sin redes de envío: {moneda}")
        return {
            "currency": moneda,
            "networks": [
                {"addressType": t, "minAmount": mn, "maxAmount": mx, "fee": f, "available": True}
                for t, mn, mx, f in REDES[moneda]
            ],
        }

    def boveda(self) -> dict:
        return {
            "id": "1",
            "currencyCode": DOLAR,
            "details": {
                "name": "Impuestos",
                "icon": None,
                "cover": None,
                "description": None,
                "goalAmount": None,
            },
            "balance": texto(self.boveda_impuestos),
            "isYieldActive": False,
            "rate": "0.00",
        }

    def precio(self, par: str) -> Decimal:
        precios = {
            f"{DOLAR}/{PESOS}": self.fx_usd_ars,
            f"USDT/{PESOS}": self.fx_usd_ars,
            f"USDT/{DOLAR}": Decimal("1"),
        }
        if par not in precios:
            raise ErrorSimulado(f"Par no disponible: {par}. Pares: {', '.join(precios)}")
        return precios[par]

    def movimientos(self) -> list[dict]:
        hechas = [
            t.vista_transaccion()
            for t in self.transacciones.values()
            if t.estado in ("success", "pending", "awaiting_approval", "failed")
        ]
        return sorted(self.historial + hechas, key=lambda m: m["createdAt"], reverse=True)

    def buscar(self, transaction_id: str) -> Transaccion:
        if transaction_id not in self.transacciones:
            raise ErrorSimulado(f"No existe la transacción {transaction_id}")
        return self.transacciones[transaction_id]

    # ------------------------------------------------------------------ cotizar
    def cotizar_swap(self, par: str, monto: str, moneda: str, tipo: str) -> Transaccion:
        base, _, cotizada = par.partition("/")
        for codigo in (base, cotizada, moneda):
            validar_moneda(codigo)
        p, q = self.precio(par), dec(monto)
        if moneda == base:
            monto_base, monto_cot = q, q * p
        elif moneda == cotizada:
            monto_base, monto_cot = q / p, q
        else:
            raise ErrorSimulado(f"quoteCurrency debe ser {base} o {cotizada}")
        if tipo == "BUY":
            debitos, creditos = {cotizada: monto_cot}, {base: monto_base}
        elif tipo == "SELL":
            debitos, creditos = {base: monto_base}, {cotizada: monto_cot}
        else:
            raise ErrorSimulado("type debe ser BUY o SELL")
        detalle = {
            "pairCode": par,
            "type": tipo,
            "price": str(p),
            "baseAmount": texto(monto_base),
            "quoteAmount": texto(monto_cot),
        }
        return self._nueva("swap", debitos, creditos, Decimal("0"), detalle)

    def cotizar_transferencia(
        self, direccion: str, tipo_dir: str, moneda: str, monto: str
    ) -> Transaccion:
        validar_moneda(moneda)
        q = dec(monto)
        redes = {t: Decimal(f) for t, _, _, f in REDES.get(moneda, [])}
        if tipo_dir in INTERNAS:
            comision = Decimal("0")
        elif tipo_dir in BANCARIAS:
            if moneda != PESOS:
                raise ErrorSimulado(
                    f"Los retiros a banco solo existen para pesos argentinos ({PESOS})"
                )
            comision = Decimal("0")
        elif tipo_dir in redes:
            comision = redes[tipo_dir]
        else:
            raise ErrorSimulado(f"Red no disponible para {moneda}: {tipo_dir}")
        detalle = {
            "address": direccion,
            "addressType": tipo_dir,
            "amount": texto(q),
            "currency": moneda,
        }
        return self._nueva("transfer", {moneda: q + comision}, {}, comision, detalle)

    # ------------------------------------------------------------------ confirmar y aprobar
    def confirmar(self, transaction_id: str, tipo: str) -> Transaccion:
        t = self.buscar(transaction_id)
        if t.tipo != tipo:
            raise ErrorSimulado(f"La transacción {transaction_id} es de tipo {t.tipo}, no {tipo}")
        if t.estado != "quoted":  # idempotente: repetir devuelve la misma transacción
            return t
        if ahora() > t.vence:
            raise ErrorSimulado("La cotización venció. Pide una nueva.")
        t.estado = "awaiting_approval"
        t.aprobacion = {"status": "pending", "expiresAt": (ahora() + VENCE_EN).isoformat()}
        t.actualizada = ahora()
        if self.aprobacion == "auto":
            self.resolver(t.id, aprobar=True)
        elif self.aprobacion == "rechazo":
            self.resolver(t.id, aprobar=False)
        if self.fallo == "timeout":
            raise ErrorSimulado(
                "Tiempo de espera agotado (simulado). Consulta belo_get_transaction."
            )
        return t

    def resolver(self, transaction_id: str, aprobar: bool) -> Transaccion:
        t = self.buscar(transaction_id)
        if t.estado != "awaiting_approval":
            return t
        t.actualizada = ahora()
        if not aprobar:
            t.estado = "failed"
            t.aprobacion = {**(t.aprobacion or {}), "status": "rejected"}
            return t
        t.aprobacion = {**(t.aprobacion or {}), "status": "approved"}
        faltan = [c for c, m in t.debitos.items() if self.saldos.get(c, Decimal(0)) < m]
        if faltan:
            t.estado = "failed"
            t.detalle["reason"] = f"saldo insuficiente en {', '.join(faltan)}"
            return t
        for c, m in t.debitos.items():
            self.saldos[c] -= m
        for c, m in t.creditos.items():
            self.saldos[c] = self.saldos.get(c, Decimal(0)) + m
        t.estado = "success"
        return t

    def ingreso(self, monto: str, contraparte: str) -> dict:
        q = dec(monto)
        self.saldos[DOLAR] += q
        momento = ahora().isoformat()
        mov = {
            "id": f"dep-{uuid.uuid4().hex[:8]}",
            "type": "deposit",
            "status": "success",
            "amount": texto(q),
            "currency": DOLAR,
            "metadata": {"simulado": True},
            "receipt": _recibo({}, contraparte),
            "approval": None,
            "createdAt": momento,
            "updatedAt": momento,
        }
        self.historial.append(mov)
        return mov

    # ------------------------------------------------------------------ internos
    def _nueva(
        self, tipo: str, debitos: dict, creditos: dict, comision: Decimal, detalle: dict
    ) -> Transaccion:
        t = Transaccion(
            str(uuid.uuid4()),
            tipo,
            "quoted",
            ahora(),
            ahora() + VENCE_EN,
            debitos,
            creditos,
            comision,
            detalle,
        )
        self.transacciones[t.id] = t
        return t

    @staticmethod
    def _desde_historial(m: dict) -> dict:
        momento = f"{m['fecha']}T12:00:00+00:00"
        moneda = DESDE_DATOS.get(m["moneda"], m["moneda"])
        return {
            "id": m["id"],
            "type": TIPOS_HISTORIAL.get(m["tipo"], "transfer"),
            "status": "success",
            "amount": texto(Decimal(str(m["monto"]))),
            "currency": moneda,
            "metadata": {"tipoOriginal": m["tipo"], "description": m["descripcion"]},
            "receipt": _recibo({}, m["contraparte"]),
            "approval": None,
            "createdAt": momento,
            "updatedAt": momento,
        }
