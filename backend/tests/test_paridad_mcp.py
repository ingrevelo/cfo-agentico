"""Prueba de paridad de contrato entre `docs/belo-mcp/tools.json` y `mcp_simulado` (HU #6)."""

from __future__ import annotations

import json
from pathlib import Path

from mcp_simulado.servidor import mcp

TOOLS_JSON = Path(__file__).resolve().parents[2] / "docs" / "belo-mcp" / "tools.json"


def _tools_reales() -> dict[str, dict]:
    data = json.loads(TOOLS_JSON.read_text(encoding="utf-8"))
    return {t["name"]: t for t in data["tools"]}


def _tools_simuladas() -> dict[str, object]:
    return {t.name: t for t in mcp._tool_manager.list_tools()}


def test_todas_las_tools_belo_simuladas_existen_en_tools_json() -> None:
    reales = _tools_reales()
    simuladas = _tools_simuladas()
    belo_sim = [nombre for nombre in simuladas if nombre.startswith("belo_")]

    assert len(belo_sim) >= 10
    for nombre in belo_sim:
        assert nombre in reales, f"{nombre} no existe en docs/belo-mcp/tools.json"


def test_propiedades_y_requeridos_coinciden_con_tools_json() -> None:
    reales = _tools_reales()
    simuladas = _tools_simuladas()

    for nombre, tool in simuladas.items():
        if not nombre.startswith("belo_"):
            continue
        esquema_real = reales[nombre]["inputSchema"]
        esquema_sim = tool.parameters

        props_reales = sorted(esquema_real.get("properties", {}).keys())
        props_sim = sorted(esquema_sim.get("properties", {}).keys())
        req_reales = sorted(esquema_real.get("required", []))
        req_sim = sorted(esquema_sim.get("required", []))

        assert props_sim == props_reales, f"Propiedades distintas en {nombre}"
        assert req_sim == req_reales, f"Requeridos distintos en {nombre}"


def test_anotaciones_de_seguridad_coinciden_con_tools_json() -> None:
    reales = _tools_reales()
    simuladas = _tools_simuladas()

    for nombre, tool in simuladas.items():
        if not nombre.startswith("belo_"):
            continue
        ann_real = reales[nombre].get("annotations", {})
        ann_sim = tool.annotations
        assert ann_sim is not None, f"Faltan annotations en {nombre}"
        assert ann_sim.read_only_hint == ann_real.get("readOnlyHint"), nombre
        assert ann_sim.destructive_hint == ann_real.get("destructiveHint"), nombre


def test_tools_de_control_usan_prefijo_simulado_sin_colision() -> None:
    reales = _tools_reales()
    simuladas = _tools_simuladas()
    extras = [nombre for nombre in simuladas if not nombre.startswith("belo_")]

    assert len(extras) >= 4
    for nombre in extras:
        assert nombre.startswith("simulado_")
        assert nombre not in reales
