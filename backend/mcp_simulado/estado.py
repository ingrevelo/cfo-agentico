"""Estado en memoria del MCP simulado: saldos, cotizaciones y transacciones de Sofía.

Montos con `Decimal` y expuestos como texto decimal, igual que el MCP de Belo.
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
DESDE_DATOS = {"ARS": PESOS}

# Valores sintéticos de la demo (no son reglas de negocio: esas viven en backend/app/domain/).
RENDIMIENTO_ANUAL = {"USDT": Decimal("0.045")}
REDES = {
    PESOS: [{"network": "CVU/CBU/ALIAS", "min": "1000", "max": "5000000", "fee": "0"}],
    "USDT": [
        {"network": "TRON", "min": "5", "max": "10000", "fee": "1"},
        {"network": "POLYGON", "min": "1", "max": "10000", "fee": "0.5"},
    ],
    "USD": [{"network": "BELO (interna)", "min": "1", "max": "10000", "fee": "0"}],
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

    def vista(self) -> dict:
        return {
            "id": self.id,
            "type": self.tipo,
            "status": self.estado,
            "createdAt": self.creada.isoformat(),
            "expiresAt": self.vence.isoformat(),
            "debits": [{"currency": c, "amount": texto(m)} for c, m in self.debitos.items()],
            "credits": [{"currency": c, "amount": texto(m)} for c, m in self.creditos.items()],
            "fee": texto(self.comision),
            **self.detalle,
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
    def precio(self, par: str) -> Decimal:
        precios = {
            f"USD/{PESOS}": self.fx_usd_ars,
            f"USDT/{PESOS}": self.fx_usd_ars,
            "USDT/USD": Decimal("1"),
        }
        if par not in precios:
            raise ErrorSimulado(f"Par no disponible: {par}. Pares: {', '.join(precios)}")
        return precios[par]

    def movimientos(self) -> list[dict]:
        hechas = [
            self._a_movimiento(t) for t in self.transacciones.values() if t.estado == "success"
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
        return self._nueva(
            "swap", debitos, creditos, Decimal("0"), {"pairCode": par, "price": str(p)}
        )

    def cotizar_transferencia(
        self, direccion: str, tipo_dir: str, moneda: str, monto: str
    ) -> Transaccion:
        validar_moneda(moneda)
        q = dec(monto)
        if tipo_dir in INTERNAS:
            comision = Decimal("0")
        elif tipo_dir in BANCARIAS:
            if moneda != PESOS:
                raise ErrorSimulado(
                    f"Los retiros a banco solo existen para pesos argentinos ({PESOS})"
                )
            comision = Decimal("0")
        elif moneda == "USDT":
            redes = {r["network"]: Decimal(r["fee"]) for r in REDES["USDT"]}
            if tipo_dir not in redes:
                raise ErrorSimulado(f"Red no disponible para USDT: {tipo_dir}")
            comision = redes[tipo_dir]
        else:
            raise ErrorSimulado(f"Tipo de dirección no disponible: {tipo_dir}")
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
        if t.estado != "quoted":  # idempotente: confirmar dos veces devuelve el mismo estado
            return t
        if ahora() > t.vence:
            raise ErrorSimulado("La cotización venció. Pide una nueva.")
        t.estado = "awaiting_approval"
        t.detalle["approvalUrl"] = f"simulado://aprobar/{t.id}"
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
        if not aprobar:
            t.estado, t.detalle["reason"] = "failed", "rechazada por la persona"
            return t
        faltan = [c for c, m in t.debitos.items() if self.saldos.get(c, Decimal(0)) < m]
        if faltan:
            t.estado, t.detalle["reason"] = "failed", f"saldo insuficiente en {', '.join(faltan)}"
            return t
        for c, m in t.debitos.items():
            self.saldos[c] -= m
        for c, m in t.creditos.items():
            self.saldos[c] = self.saldos.get(c, Decimal(0)) + m
        t.estado = "success"
        return t

    def ingreso(self, monto: str, contraparte: str) -> dict:
        q = dec(monto)
        self.saldos["USD"] += q
        mov = {
            "id": f"dep-{uuid.uuid4().hex[:8]}",
            "type": "deposit",
            "currency": "USD",
            "amount": texto(q),
            "createdAt": ahora().isoformat(),
            "receipt": {"counterparty": contraparte},
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

    def _a_movimiento(self, t: Transaccion) -> dict:
        moneda, monto = next(iter(t.debitos.items()))
        return {
            "id": t.id,
            "type": t.tipo,
            "currency": moneda,
            "amount": texto(monto),
            "createdAt": t.creada.isoformat(),
            "receipt": t.vista(),
        }

    @staticmethod
    def _desde_historial(m: dict) -> dict:
        return {
            "id": m["id"],
            "type": TIPOS_HISTORIAL.get(m["tipo"], "transfer"),
            "currency": DESDE_DATOS.get(m["moneda"], m["moneda"]),
            "amount": texto(Decimal(str(m["monto"]))),
            "createdAt": f"{m['fecha']}T12:00:00+00:00",
            "metadata": {"tipoOriginal": m["tipo"], "description": m["descripcion"]},
            "receipt": {"counterparty": m["contraparte"]},
        }
