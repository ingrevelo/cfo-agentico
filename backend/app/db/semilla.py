"""Siembra inicial idempotente y reinicio limpio de la demo desde data/sofia-demo.json."""

from __future__ import annotations

import json
from decimal import Decimal
from pathlib import Path

from sqlmodel import Session, delete

from app.db.modelos import (
    McpLogDB,
    MovimientoDB,
    NivelAutonomiaDB,
    PerfilDB,
    PlanDB,
    ReglaDB,
    VencimientoDB,
)

DEFAULT_DATA_DIR = Path(__file__).resolve().parents[3] / "data"


def _dec_str(valor: object) -> str:
    return format(Decimal(str(valor)).quantize(Decimal("0.01")), "f")


def sembrar_sofia(session: Session, data_dir: Path | None = None) -> PerfilDB:
    """Siembra perfil, reglas, vencimientos y niveles de Sofía de forma idempotente."""
    ruta = (data_dir or DEFAULT_DATA_DIR) / "sofia-demo.json"
    datos = json.loads(ruta.read_text(encoding="utf-8"))
    user_id: str = datos["user_id"]

    perfil = session.get(PerfilDB, user_id)
    if perfil is not None:
        return perfil

    prof = datos["profile"]
    perfil = PerfilDB(
        user_id=user_id,
        nombre=prof["name"],
        ciudad=prof["city"],
        ocupacion=prof["occupation"],
        moneda_ingreso=prof.get("income_currency", "USD"),
    )
    session.add(perfil)

    hr = datos["hard_rules"]
    regla = ReglaDB(
        user_id=user_id,
        min_cushion_usd=_dec_str(hr["min_cushion_usd"]),
        cushion_scope_json=json.dumps(hr["cushion_scope"], ensure_ascii=False),
        max_conversion_usd=_dec_str(hr["max_conversion_usd"]),
        fx_tolerance_pct=_dec_str(hr["fx_tolerance_pct"]),
        fx_advance_trigger_pct=_dec_str(hr["fx_advance_trigger_pct"]),
        tax_pct_of_income=_dec_str(hr["tax_pct_of_income"]),
        min_liquid_usd=_dec_str(hr["min_liquid_usd"]),
        min_income_trigger_usd=_dec_str(hr["min_income_trigger_usd"]),
        allowed_currencies_json=json.dumps(hr["allowed_currencies"], ensure_ascii=False),
        idempotency_required=bool(hr.get("idempotency_required", True)),
        soft_preferences_json=json.dumps(datos.get("soft_preferences", {}), ensure_ascii=False),
    )
    session.add(regla)

    for due in datos.get("dues", []):
        session.add(
            VencimientoDB(
                id=due["id"],
                user_id=user_id,
                label=due["label"],
                amount=_dec_str(due["amount"]),
                currency=due["currency"],
                due_weekday=due.get("due"),
                due_day=due.get("due_day"),
                origen="seed",
            )
        )

    for categoria, nivel in datos.get("autonomy_levels", {}).items():
        session.add(
            NivelAutonomiaDB(
                user_id=user_id,
                categoria=categoria,
                nivel=int(nivel),
            )
        )

    session.commit()
    session.refresh(perfil)
    return perfil


def reiniciar_demo(session: Session, data_dir: Path | None = None) -> PerfilDB:
    """Limpia todas las tablas y vuelve a sembrar el estado inicial de la demo."""
    for tabla in (
        McpLogDB,
        MovimientoDB,
        PlanDB,
        NivelAutonomiaDB,
        VencimientoDB,
        ReglaDB,
        PerfilDB,
    ):
        session.exec(delete(tabla))  # type: ignore[arg-type]
    session.commit()
    return sembrar_sofia(session, data_dir=data_dir)
