"""Perfilador determinista en modo sombra y confirmación explícita de reglas (T02, T08, T12)."""

from __future__ import annotations

import json
import re
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal
from enum import StrEnum
from pathlib import Path


class EstadoPropuesta(StrEnum):
    """Estados posibles de una regla propuesta por el perfilador."""

    PENDIENTE_CONFIRMACION = "PENDIENTE_CONFIRMACION"
    CONFIRMADA = "CONFIRMADA"
    DESCARTADA = "DESCARTADA"


_PATRONES_INJECTION = (
    re.compile(r"\bsistema\s*:", re.IGNORECASE),
    re.compile(r"\bsystem\s*:", re.IGNORECASE),
    re.compile(r"\bignora(r)?\b.*\b(colch[oó]n|regla|l[ií]mite|tope)\b", re.IGNORECASE),
    re.compile(r"\bignore\b.*\b(instructions?|rules?|system)\b", re.IGNORECASE),
    re.compile(r"\bconvierte\s+todo\b", re.IGNORECASE),
)


def detectar_prompt_injection(texto: str) -> bool:
    """Detecta intentos de inyección de instrucciones dentro de descripciones de movimientos."""
    if not texto:
        return False
    return any(patron.search(texto) for patron in _PATRONES_INJECTION)


@dataclass(frozen=True)
class MovimientoHistorial:
    """Movimiento histórico normalizado para el perfilador (sin floats)."""

    id: str
    fecha: date
    tipo: str
    moneda: str
    monto: Decimal
    contraparte: str
    descripcion: str = ""


@dataclass(frozen=True)
class PatronRecurrente:
    """Patrón mensual detectado en código a partir del historial."""

    contraparte: str
    moneda: str
    tipo: str
    monto_mediana: Decimal
    dia_min: int
    dia_max: int
    repeticiones: int
    meses_distintos: int
    descripciones: tuple[str, ...]


@dataclass(frozen=True)
class PropuestaRegla:
    """Propuesta de regla generada en modo sombra; nunca se aplica sin confirmación."""

    id: str
    patron: PatronRecurrente
    nombre_sugerido: str
    categoria: str
    estado: EstadoPropuesta = EstadoPropuesta.PENDIENTE_CONFIRMACION
    origen: str = "perfilado"
    confirmada_en: datetime | None = None


@dataclass(frozen=True)
class VencimientoConfirmado:
    """Obligación confirmada por la persona lista para persistirse en reglas."""

    id: str
    label: str
    amount: Decimal
    currency: str
    due_day: int
    origen: str = "perfilado"
    confirmada_en: datetime | None = None


@dataclass(frozen=True)
class ResultadoPerfilado:
    """Salida del perfilado en modo sombra con propuestas y eventos sospechosos."""

    propuestas: list[PropuestaRegla] = field(default_factory=list)
    intentos_bloqueados: list[MovimientoHistorial] = field(default_factory=list)
    llamadas_escritura_belo: int = 0


def cargar_historial_json(ruta: Path) -> list[MovimientoHistorial]:
    """Carga movimientos desde un JSON de historial aceptando texto decimal o numérico."""
    payload = json.loads(ruta.read_text(encoding="utf-8"))
    salida: list[MovimientoHistorial] = []
    for raw in payload.get("movimientos", []):
        salida.append(
            MovimientoHistorial(
                id=str(raw["id"]),
                fecha=date.fromisoformat(str(raw["fecha"])[:10]),
                tipo=str(raw["tipo"]),
                moneda=str(raw["moneda"]),
                monto=Decimal(str(raw["monto"])),
                contraparte=str(raw.get("contraparte", "")),
                descripcion=str(raw.get("descripcion", "")),
            )
        )
    return salida


def _mediana_decimal(valores: list[Decimal]) -> Decimal:
    ordenados = sorted(valores)
    n = len(ordenados)
    mitad = n // 2
    if n % 2 == 1:
        return ordenados[mitad]
    return (ordenados[mitad - 1] + ordenados[mitad]) / Decimal("2")


def _coef_variacion(valores: list[Decimal]) -> Decimal:
    n = Decimal(len(valores))
    media = sum(valores, Decimal("0")) / n
    if media == 0:
        return Decimal("0")
    varianza = sum((v - media) ** 2 for v in valores) / n
    return varianza.sqrt() / media


def _amplitud_circular_dias(dias: list[int]) -> int:
    """Calcula la dispersión mínima en un ciclo mensual de 30 días (maneja cruce 30 -> 2)."""
    unicos = sorted(set(min(d, 30) for d in dias))
    if len(unicos) <= 1:
        return 0
    brechas = [unicos[i + 1] - unicos[i] for i in range(len(unicos) - 1)]
    brechas.append(30 - unicos[-1] + unicos[0])
    return 30 - max(brechas)


def detectar_recurrentes(
    movimientos: list[MovimientoHistorial],
    min_rep: int = 3,
    tolerancia_dias: int = 3,
    var_max: Decimal = Decimal("0.05"),
) -> tuple[list[PatronRecurrente], list[MovimientoHistorial]]:
    """Detecta patrones recurrentes mensuales y separa posibles prompt injections."""
    grupos: dict[tuple[str, str, str], list[MovimientoHistorial]] = defaultdict(list)
    sospechosos: list[MovimientoHistorial] = []

    for mov in movimientos:
        if detectar_prompt_injection(mov.descripcion):
            sospechosos.append(mov)
            continue
        if mov.monto <= 0 or not mov.contraparte:
            continue
        grupos[(mov.contraparte, mov.moneda, mov.tipo)].append(mov)

    patrones: list[PatronRecurrente] = []
    for (contraparte, moneda, tipo), ms in grupos.items():
        if len(ms) < min_rep:
            continue
        meses_distintos = len({(m.fecha.year, m.fecha.month) for m in ms})
        if meses_distintos < min_rep:
            continue
        dias = [m.fecha.day for m in ms]
        montos = [m.monto for m in ms]
        if (
            _amplitud_circular_dias(dias) <= 2 * tolerancia_dias
            and _coef_variacion(montos) <= var_max
        ):
            patrones.append(
                PatronRecurrente(
                    contraparte=contraparte,
                    moneda=moneda,
                    tipo=tipo,
                    monto_mediana=_mediana_decimal(montos).quantize(Decimal("0.01")),
                    dia_min=min(dias),
                    dia_max=max(dias),
                    repeticiones=len(ms),
                    meses_distintos=meses_distintos,
                    descripciones=tuple(m.descripcion for m in ms),
                )
            )

    return patrones, sospechosos


def perfilar_en_modo_sombra(
    movimientos: list[MovimientoHistorial],
    nombres_por_contraparte: dict[str, tuple[str, str]] | None = None,
) -> ResultadoPerfilado:
    """Genera propuestas en estado PENDIENTE_CONFIRMACION sin efectuar escrituras."""
    patrones, sospechosos = detectar_recurrentes(movimientos)
    mapa = nombres_por_contraparte or {}
    propuestas: list[PropuestaRegla] = []
    for idx, patron in enumerate(patrones, start=1):
        nombre, categoria = mapa.get(patron.contraparte, (patron.contraparte, patron.tipo))
        propuestas.append(
            PropuestaRegla(
                id=f"prop-{idx:03d}",
                patron=patron,
                nombre_sugerido=nombre,
                categoria=categoria,
                estado=EstadoPropuesta.PENDIENTE_CONFIRMACION,
            )
        )
    return ResultadoPerfilado(
        propuestas=propuestas,
        intentos_bloqueados=sospechosos,
        llamadas_escritura_belo=0,
    )


def confirmar_propuesta(
    propuesta: PropuestaRegla,
    ahora: datetime,
) -> tuple[PropuestaRegla, VencimientoConfirmado]:
    """Confirma una propuesta pendiente y devuelve el vencimiento con origen='perfilado'."""
    confirmada = PropuestaRegla(
        id=propuesta.id,
        patron=propuesta.patron,
        nombre_sugerido=propuesta.nombre_sugerido,
        categoria=propuesta.categoria,
        estado=EstadoPropuesta.CONFIRMADA,
        origen="perfilado",
        confirmada_en=ahora,
    )
    vencimiento = VencimientoConfirmado(
        id=f"perfilado-{propuesta.id}",
        label=propuesta.nombre_sugerido,
        amount=propuesta.patron.monto_mediana,
        currency=propuesta.patron.moneda,
        due_day=propuesta.patron.dia_max,
        origen="perfilado",
        confirmada_en=ahora,
    )
    return confirmada, vencimiento


def descartar_propuesta(propuesta: PropuestaRegla) -> PropuestaRegla:
    """Descarta una propuesta para que nunca se aplique a las reglas activas."""
    return PropuestaRegla(
        id=propuesta.id,
        patron=propuesta.patron,
        nombre_sugerido=propuesta.nombre_sugerido,
        categoria=propuesta.categoria,
        estado=EstadoPropuesta.DESCARTADA,
        origen=propuesta.origen,
        confirmada_en=None,
    )
