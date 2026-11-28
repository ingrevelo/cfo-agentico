"""Los cuatro usos del LLM, cada uno con su esquema de salida, su validación y su plantilla.

El LLM solo redacta o interpreta. Los números salen del motor o de la persona: si el texto del LLM
trae un número que no estaba en los datos, se descarta y se usa la plantilla.
"""

from __future__ import annotations

import json
import re
from decimal import Decimal, InvalidOperation
from typing import Literal

from pydantic import BaseModel, Field

from .llm import LLM, Resultado

# ---------------------------------------------------------------------- validación de números
_NUMERO = re.compile(r"\d[\d.,]*\d|\d")


def _normalizar(token: str) -> Decimal | None:
    t = token
    if "," in t:  # 450.300,50 → 450300.50
        t = t.replace(".", "").replace(",", ".")
    elif re.fullmatch(r"\d{1,3}(\.\d{3})+", t):  # 450.300 → 450300
        t = t.replace(".", "")
    try:
        return Decimal(t).normalize()
    except InvalidOperation:
        return None


def numeros(texto: str) -> set[Decimal]:
    return {n for n in (_normalizar(t) for t in _NUMERO.findall(texto)) if n is not None}


def numeros_ajenos(salida: BaseModel, datos: dict) -> str | None:
    """Motivo para descartar la salida si trae números que no están en los datos."""
    ajenos = numeros(salida.model_dump_json()) - numeros(json.dumps(datos, ensure_ascii=False, default=str))
    return f"números que no están en los datos: {sorted(f'{n:f}' for n in ajenos)}" if ajenos else None


# ---------------------------------------------------------------------- 1. tarjeta del plan
class PasoPlan(BaseModel):
    paso: str
    categoria: str
    desde: str = Field(description='Ej. "USD 900"')
    hacia: str = Field(description='Ej. "900 USDT"')
    cuando: str | None = None
    simulado: bool = False


class HechosPlan(BaseModel):
    ingreso: str
    pasos: list[PasoPlan]
    libre: str
    en_dolares: str
    colchon: str
    impuestos_pct: str | None = Field(None, examples=["8"])
    tolerancia_fx_pct: str | None = Field(None, examples=["2"])
    tono: str = "claro, cercano, sin jerga cripto"


class PorQue(BaseModel):
    paso: str
    texto: str


class TarjetaPlan(BaseModel):
    titulo: str
    porques: list[PorQue]
    cierre: str


_PORQUE = {
    "rendimiento_usdt": "Es el excedente del mes. El rendimiento es variable, no garantizado.",
    "apartar_impuestos": "Queda guardado para tus impuestos y el monotributo.",
    "convertir_para_vencimientos": "Solo lo que necesitas para lo que vence, el día que vence.",
}


def plantilla_plan(h: HechosPlan) -> TarjetaPlan:
    return TarjetaPlan(
        titulo=f"Llegaron {h.ingreso}. Este es tu plan para este pago:",
        porques=[PorQue(paso=p.paso, texto=_PORQUE.get(p.categoria, "Sigue tus reglas.")) for p in h.pasos],
        cierre=f"Te quedan {h.libre} libres y {h.en_dolares} en dólares: tu colchón de {h.colchon} está cubierto.",
    )


def redactar_plan(llm: LLM, h: HechosPlan) -> Resultado[TarjetaPlan]:
    datos = h.model_dump()

    def validar(t: TarjetaPlan) -> str | None:
        if [p.paso for p in t.porques] != [p.paso for p in h.pasos]:
            return "los pasos no coinciden con los del motor"
        return numeros_ajenos(t, datos)

    return llm.generar(prompt="plan", datos=datos, esquema=TarjetaPlan,
                       plantilla=lambda: plantilla_plan(h), validar=validar)


# ---------------------------------------------------------------------- 2. nombrar patrones
class Patron(BaseModel):
    id: str
    tipo: Literal["ingreso", "pago"]
    contraparte: str
    descripciones: list[str]
    monto: str
    moneda: str
    dias: str = Field(description='Ej. "1 a 5"')
    repeticiones: int


class PatronNombrado(BaseModel):
    id: str
    nombre: str
    categoria: Literal["vivienda", "impuestos", "servicios", "ingreso", "otro"]
    pregunta: str


class Patrones(BaseModel):
    patrones: list[PatronNombrado]


def plantilla_patrones(ps: list[Patron]) -> Patrones:
    def uno(p: Patron) -> PatronNombrado:
        if p.tipo == "ingreso":
            return PatronNombrado(id=p.id, nombre=f"Ingreso de {p.contraparte}", categoria="ingreso",
                                  pregunta=f"Tu pago de {p.contraparte} llega entre los días {p.dias}. "
                                           "Cuando entre, te armo el plan.")
        return PatronNombrado(id=p.id, nombre=f"Pago a {p.contraparte}", categoria="otro",
                              pregunta=f"Todos los meses, entre los días {p.dias}, pagas {p.monto} {p.moneda} "
                                       f"a {p.contraparte}. ¿Lo agrego como vencimiento?")

    return Patrones(patrones=[uno(p) for p in ps])


def nombrar_patrones(llm: LLM, ps: list[Patron]) -> Resultado[Patrones]:
    datos = {"patrones": [p.model_dump() for p in ps]}

    def validar(r: Patrones) -> str | None:
        if sorted(x.id for x in r.patrones) != sorted(p.id for p in ps):
            return "los patrones no coinciden con los del perfilador"
        return numeros_ajenos(r, datos)

    return llm.generar(prompt="patrones", datos=datos, esquema=Patrones,
                       plantilla=lambda: plantilla_patrones(ps), validar=validar)


# ---------------------------------------------------------------------- 3. interpretar una regla
CampoRegla = Literal["min_cushion_usd", "max_conversion_usd", "fx_tolerance_pct", "tax_pct_of_income",
                     "min_liquid_usd", "vencimiento", "ninguno"]


class ReglaInterpretada(BaseModel):
    campo: CampoRegla
    valor: str | None = Field(None, description="Texto decimal, tal como lo dijo la persona")
    etiqueta_vencimiento: str | None = None
    moneda: str | None = None
    dia: int | None = Field(None, ge=1, le=31)
    explicacion: str = Field(description="Cómo quedaría la regla, en una frase, para que la persona confirme")


def plantilla_regla(texto: str) -> ReglaInterpretada:
    return ReglaInterpretada(campo="ninguno", explicacion="No pude interpretarla. Puedes cargarla en el formulario.")


def interpretar_regla(llm: LLM, texto: str) -> Resultado[ReglaInterpretada]:
    """La regla interpretada nunca se aplica sola: la persona la confirma y el dominio la valida."""
    datos = {"texto_de_la_persona": texto}
    return llm.generar(prompt="regla", datos=datos, esquema=ReglaInterpretada, esfuerzo="medium",
                       plantilla=lambda: plantilla_regla(texto), validar=lambda r: numeros_ajenos(r, datos))


# ---------------------------------------------------------------------- 4. pedir más autonomía
class HechosAutonomia(BaseModel):
    categoria: str
    descripcion: str = Field(description='Ej. "apartar lo de impuestos y dejar rindiendo el excedente"')
    aprobados: int
    total: int


class Solicitud(BaseModel):
    titulo: str
    texto: str


def plantilla_autonomia(h: HechosAutonomia) -> Solicitud:
    return Solicitud(
        titulo="¿Me das más autonomía?",
        texto=f"Aprobaste mis últimos {h.aprobados} planes de {h.total} sin cambios. Te propongo {h.descripcion} "
              "sin preguntarte en la app, siempre en dólares y sin tocar tu colchón. En Belo igual confirmas "
              "cada movimiento con tu código. Los cambios a pesos te los sigo preguntando.",
    )


def redactar_autonomia(llm: LLM, h: HechosAutonomia) -> Resultado[Solicitud]:
    datos = h.model_dump()
    return llm.generar(prompt="autonomia", datos=datos, esquema=Solicitud,
                       plantilla=lambda: plantilla_autonomia(h), validar=lambda s: numeros_ajenos(s, datos))
