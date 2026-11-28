"""Respuestas de ejemplo del contrato C3, con los números de docs/caso-de-prueba.md.

Las usa `rutas_ejemplo.py` hasta que el motor, el juez y el agente estén listos.
Datos sintéticos de Sofía. Fechas fijas de la demo: lunes 30-nov y jueves 3-dic de 2026.
"""

import json
from datetime import UTC, date, datetime
from decimal import Decimal
from pathlib import Path

from .esquemas import (
    AprobacionBelo,
    Autonomia,
    Decision,
    DecisionJuez,
    EntradaLog,
    Monto,
    Movimiento,
    Plan,
    PropuestaRegla,
    Reglas,
    ResumenPlan,
    SolicitudAutonomia,
    Vencimiento,
)
from .esquemas import (
    EstadoMovimiento as E,
)

DATOS = Path(__file__).resolve().parents[3] / "data" / "sofia-demo.json"
LUNES = datetime(2026, 11, 30, 12, 0, tzinfo=UTC)
JUEVES = date(2026, 12, 3)
DOLARES = {"USD": "USDC"}  # D18: hasta que data/ pase a USDC
PEDIR = DecisionJuez(decision=Decision.PEDIR_APROBACION, motivos=["nivel 3: pide aprobación"])


def _m(valor: str, moneda: str = "USDC") -> Monto:
    return Monto(valor=valor, moneda=moneda)


def _texto(valor: object) -> str:
    """Monto como texto con dos decimales, venga como número o como texto ("1500" o "1500.00")."""
    return f"{Decimal(str(valor)):.2f}"


def reglas() -> Reglas:
    d = json.loads(DATOS.read_text(encoding="utf-8"))
    duras = {
        k: _texto(v) if isinstance(v, (int, float, str)) and not isinstance(v, bool) else v
        for k, v in d["hard_rules"].items()
    }
    return Reglas(
        user_id=d["user_id"],
        profile=d["profile"],
        balances={DOLARES.get(k, k): _texto(v) for k, v in d["balances"].items()},
        fx_usd_ars=_texto(d["fx_demo"]["USD_ARS"]),
        hard_rules=duras,
        dues=[Vencimiento(**{**v, "amount": _texto(v["amount"])}) for v in d["dues"]],
        autonomy_levels=d["autonomy_levels"],
        soft_preferences=d["soft_preferences"],
    )


def _movimientos(m1: E = E.PROPUESTO, m2: E = E.PROPUESTO, m3: E = E.PROPUESTO) -> list[Movimiento]:
    belo = {E.COMPLETADO: AprobacionBelo(transaction_id="sim-0001", estado="success")}
    return [
        Movimiento(
            paso="M1",
            clave="plan-ing01-M1",
            categoria="rendimiento_usdt",
            titulo="Dejar rindiendo en USDT",
            desde=_m("900.00"),
            hacia=_m("900.00", "USDT"),
            porque="Es el excedente del mes. El rendimiento es variable, no garantizado.",
            estado=m1,
            decision_juez=PEDIR,
            simulado=False,
            aprobacion_belo=belo.get(m1),
        ),
        Movimiento(
            paso="M2",
            clave="plan-ing01-M2",
            categoria="apartar_impuestos",
            titulo='Apartar en la alcancía "Impuestos"',
            desde=_m("120.00"),
            hacia=_m("120.00"),
            porque="El 8% del ingreso. Alcanza para el monotributo del 20.",
            estado=m2,
            decision_juez=PEDIR,
            simulado=True,
        ),
        Movimiento(
            paso="M3",
            clave="plan-ing01-M3",
            categoria="convertir_para_vencimientos",
            titulo="Cambiar a pesos el jueves",
            desde=_m("380.00"),
            hacia=_m("450300.00", "ARS"),
            porque="Solo lo que necesitas para el alquiler de 450.000 ARS, el día que vence.",
            cotizacion="1185",
            banda_fx=("1161.30", "1208.70"),
            programado_para=JUEVES,
            estado=m3,
            decision_juez=PEDIR,
            simulado=False,
        ),
    ]


def _plan(
    movs: list[Movimiento],
    mensaje: str | None = None,
    libre: str = "100.00",
    en_dolares: str = "1120.00",
) -> Plan:
    return Plan(
        plan_id="plan-ing01",
        creado=LUNES,
        ingreso=_m("1500.00"),
        titulo="Llegaron 1.500 USDC. Este es tu plan para este pago:",
        movimientos=movs,
        resumen=ResumenPlan(
            libre_usd=libre,
            en_dolares_usd=en_dolares,
            colchon_usd="500.00",
            colchon_cubierto=float(en_dolares) >= 500,
        ),
        mensaje=mensaje,
    )


def plan_propuesto() -> Plan:
    return _plan(
        _movimientos(),
        "Te quedan USD 100 libres y USD 1.120 en dólares: tu colchón de 500 está cubierto.",
    )


def plan_aprobado() -> Plan:
    return _plan(
        _movimientos(E.COMPLETADO, E.COMPLETADO, E.APROBADO),
        "Listo. Dejé USD 900 rindiendo en USDT y aparté USD 120 para impuestos. "
        "El jueves cambio USD 380 para el alquiler, si el dólar sigue cerca de 1.185.",
    )


def plan_caso_rojo(monto_usd: str) -> Plan:
    movs = _movimientos()
    quedan = 1500 - float(monto_usd)
    movs[2] = movs[2].model_copy(
        update={
            "desde": _m(f"{float(monto_usd):.2f}"),
            "estado": E.BLOQUEADO,
            "decision_juez": DecisionJuez(
                decision=Decision.BLOQUEAR,
                motivos=[f"quedarían USD {quedan:.0f} en dólares; mínimo 500"],
            ),
        }
    )
    return _plan(
        movs,
        f"No puedo cambiar USD {float(monto_usd):.0f}: te quedarían USD {quedan:.0f} en dólares "
        "y tu mínimo es 500. Puedo cambiar hasta USD 1.000 si me lo confirmas, o mantener el plan.",
    )


def plan_jueves(fx: str) -> Plan:
    movs = _movimientos(E.COMPLETADO, E.COMPLETADO, E.APROBADO)
    if float(fx) < 1161.30:
        movs[2] = movs[2].model_copy(
            update={
                "estado": E.RETENIDO,
                "cotizacion": fx,
                "decision_juez": DecisionJuez(
                    decision=Decision.RETENER, motivos=["el dólar empeoró más de 2%"]
                ),
            }
        )
        return _plan(
            movs,
            f"Hoy el dólar está a {fx}, más de 2% por debajo de lo que aprobaste. "
            "Te propongo cambiar USD 392 → 450.800 ARS. Sigue dentro de tu tope de 400.",
        )
    usd = -(-450000 // int(float(fx)))  # redondeo hacia arriba
    movs[2] = movs[2].model_copy(
        update={
            "estado": E.COMPLETADO,
            "cotizacion": fx,
            "desde": _m(f"{usd:.2f}"),
            "hacia": _m(f"{usd * float(fx):.2f}", "ARS"),
            "aprobacion_belo": AprobacionBelo(transaction_id="sim-0003", estado="success"),
        }
    )
    return _plan(
        movs,
        f"Cambié USD {usd} para el alquiler a {fx}.",
        libre=f"{100 + 380 - usd:.2f}",
        en_dolares=f"{1500 - usd:.2f}",
    )


def plan_martes(fx: str) -> Plan:
    usd = -(-450000 // int(float(fx)))
    return _plan(
        _movimientos(E.COMPLETADO, E.COMPLETADO, E.APROBADO),
        f"El dólar subió a {fx}. Si cambio hoy, el alquiler del jueves te cuesta USD {usd} "
        "en vez de 380. "
        "No sé si mañana sube más o baja; esto solo asegura el alquiler a mejor precio.",
    )


def propuestas() -> list[PropuestaRegla]:
    return [
        PropuestaRegla(
            id="P1",
            patron="450.000 ARS a Inmobiliaria Palermo SRL, días 1 a 5, 6 meses",
            interpretacion="Alquiler (vivienda)",
            propuesta="¿Lo agrego como vencimiento?",
            vencimiento=Vencimiento(
                id="rent",
                label="Alquiler",
                amount="450000.00",
                currency="ARS",
                due_day=5,
                origen="perfilado",
            ),
        ),
        PropuestaRegla(
            id="P2",
            patron="65.000 ARS a ARCA, días 18 a 20, 6 meses",
            interpretacion="Monotributo (impuestos)",
            propuesta="¿Lo agrego como vencimiento?",
            vencimiento=Vencimiento(
                id="monotributo",
                label="Monotributo",
                amount="65000.00",
                currency="ARS",
                due_day=20,
                origen="perfilado",
            ),
        ),
        PropuestaRegla(
            id="P3",
            patron="Unos USD 1.500 de Northwind Studio LLC, días 1 a 3",
            interpretacion="Ingreso principal",
            propuesta="Cuando entre, te armo el plan.",
        ),
    ]


def log() -> list[EntradaLog]:
    h = LUNES.replace(hour=12, minute=2)
    return [
        EntradaLog(
            hora=h,
            plan_id="plan-ing01",
            paso=None,
            tool=None,
            regla="OK de Sofía",
            estado="APROBADO",
            monto="plan completo",
            live=False,
        ),
        EntradaLog(
            hora=h,
            plan_id="plan-ing01",
            paso="M1",
            tool="belo_confirm_swap",
            regla="excedente a rendimiento",
            estado="DESCONOCIDO → COMPLETADO",
            monto="USD 900 → 900 USDT",
            live=False,
        ),
        EntradaLog(
            hora=h,
            plan_id="plan-ing01",
            paso="M2",
            tool=None,
            regla="8% impuestos",
            estado="COMPLETADO",
            monto="USD 120",
            live=False,
        ),
        EntradaLog(
            hora=h,
            plan_id="plan-ing01",
            paso="M3",
            tool="belo_preview_swap",
            regla="alquiler del jueves",
            estado="APROBADO (programado)",
            monto="USD 380 @ 1.185",
            live=False,
        ),
        EntradaLog(
            hora=h,
            plan_id=None,
            paso=None,
            tool="belo_list_transactions",
            regla="dato con instrucciones (prompt injection)",
            estado="INTENTO_BLOQUEADO",
            live=False,
        ),
    ]


def autonomia() -> Autonomia:
    return Autonomia(
        niveles=reglas().autonomy_levels,
        solicitud=SolicitudAutonomia(
            categoria="apartar_impuestos",
            nivel_actual=3,
            nivel_propuesto=4,
            evidencia="6 de 6 planes aprobados sin cambios",
            texto="Cada vez que entre un pago, aparto lo de impuestos y dejo rindiendo el "
            "excedente yo solo, sin tocar tu colchón. Los cambios a pesos te los sigo "
            "preguntando. En Belo igual confirmas cada movimiento con tu código.",
        ),
    )
