"""Reglas deterministas de banda asimétrica de FX y adelanto favorable (T09 y T11)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import ROUND_CEILING, Decimal
from enum import StrEnum


class DecisionFX(StrEnum):
    """Decisión del chequeo de tipo de cambio al momento de ejecutar."""

    EJECUTAR = "EJECUTAR"
    RETENER = "RETENER"


@dataclass(frozen=True)
class ResultadoChequeoFX:
    """Resultado determinista de verificar la tolerancia asimétrica de FX."""

    decision: DecisionFX
    desvio_pct: Decimal
    usd_a_convertir: Decimal
    usd_necesarios_actuales: Decimal
    cotizacion_actual: Decimal
    razon: str


@dataclass(frozen=True)
class PropuestaAdelantoFX:
    """Propuesta de conversión anticipada cuando el FX mejora igual o más del umbral."""

    key: str
    categoria: str
    moneda_destino: str
    monto_usd: Decimal
    ahorro_usd: Decimal
    cotizacion: Decimal
    mejora_pct: Decimal


def _validar_positivos(
    cotizacion_aprobada: Decimal,
    cotizacion_actual: Decimal,
    monto_objetivo_destino: Decimal,
    monto_usd_aprobado: Decimal,
) -> None:
    if cotizacion_aprobada <= 0 or cotizacion_actual <= 0:
        raise ValueError("Las cotizaciones de FX deben ser mayores que cero.")
    if monto_objetivo_destino <= 0 or monto_usd_aprobado <= 0:
        raise ValueError("Los montos de conversión deben ser mayores que cero.")


def _redondear_usd_techo(monto_destino: Decimal, cotizacion: Decimal) -> Decimal:
    return (monto_destino / cotizacion).to_integral_value(rounding=ROUND_CEILING)


def chequear_fx_al_ejecutar(
    monto_objetivo_destino: Decimal,
    monto_usd_aprobado: Decimal,
    cotizacion_aprobada: Decimal,
    cotizacion_actual: Decimal,
    tolerancia_pct: Decimal = Decimal("2.0"),
    moneda_destino: str = "ARS",
) -> ResultadoChequeoFX:
    """Verifica si la conversión puede ejecutarse sin violar la tolerancia de FX.

    Asimétrico: solo retiene si el dólar empeoró más de `tolerancia_pct`
    (menos moneda destino por cada USD). Si se ejecuta, cambia solo lo necesario
    y nunca más de `monto_usd_aprobado`.
    """
    _validar_positivos(
        cotizacion_aprobada,
        cotizacion_actual,
        monto_objetivo_destino,
        monto_usd_aprobado,
    )
    if tolerancia_pct < 0:
        raise ValueError("La tolerancia de FX no puede ser negativa.")

    desvio_pct = ((cotizacion_actual - cotizacion_aprobada) / cotizacion_aprobada) * Decimal("100")
    usd_necesarios = _redondear_usd_techo(monto_objetivo_destino, cotizacion_actual)

    if desvio_pct < -tolerancia_pct:
        return ResultadoChequeoFX(
            decision=DecisionFX.RETENER,
            desvio_pct=desvio_pct.quantize(Decimal("0.01")),
            usd_a_convertir=Decimal("0"),
            usd_necesarios_actuales=usd_necesarios,
            cotizacion_actual=cotizacion_actual,
            razon=(
                f"El FX para {moneda_destino} empeoró {abs(desvio_pct):.2f}% "
                f"(supera la tolerancia de {tolerancia_pct:.2f}%)."
            ),
        )

    usd_a_convertir = min(usd_necesarios, monto_usd_aprobado)
    return ResultadoChequeoFX(
        decision=DecisionFX.EJECUTAR,
        desvio_pct=desvio_pct.quantize(Decimal("0.01")),
        usd_a_convertir=usd_a_convertir,
        usd_necesarios_actuales=usd_necesarios,
        cotizacion_actual=cotizacion_actual,
        razon=(
            f"FX dentro de banda ({desvio_pct:+.2f}%): se convierten "
            f"USD {usd_a_convertir} hacia {moneda_destino}."
        ),
    )


def evaluar_oportunidad_favorable(
    key: str,
    estado: str,
    vence: datetime,
    ahora: datetime,
    monto_objetivo_destino: Decimal,
    monto_usd_aprobado: Decimal,
    cotizacion_aprobada: Decimal,
    cotizacion_actual: Decimal,
    trigger_pct: Decimal = Decimal("2.0"),
    moneda_destino: str = "ARS",
) -> PropuestaAdelantoFX | None:
    """Propone adelantar una conversión aprobada si el FX mejoró >= `trigger_pct`.

    Solo aplica a movimientos en estado `APROBADO` y antes de su fecha de vencimiento.
    Nunca propone gastar más USD que los ya aprobados.
    """
    _validar_positivos(
        cotizacion_aprobada,
        cotizacion_actual,
        monto_objetivo_destino,
        monto_usd_aprobado,
    )
    if trigger_pct <= 0:
        raise ValueError("El umbral de oportunidad de FX debe ser mayor que cero.")

    if estado != "APROBADO" or ahora >= vence:
        return None

    mejora_pct = ((cotizacion_actual - cotizacion_aprobada) / cotizacion_aprobada) * Decimal("100")
    if mejora_pct < trigger_pct:
        return None

    usd_necesarios = _redondear_usd_techo(monto_objetivo_destino, cotizacion_actual)
    if usd_necesarios > monto_usd_aprobado:
        return None

    ahorro = monto_usd_aprobado - usd_necesarios
    return PropuestaAdelantoFX(
        key=f"{key}.v2",
        categoria="adelantar_conversion_favorable",
        moneda_destino=moneda_destino,
        monto_usd=usd_necesarios,
        ahorro_usd=ahorro,
        cotizacion=cotizacion_actual,
        mejora_pct=mejora_pct.quantize(Decimal("0.01")),
    )
