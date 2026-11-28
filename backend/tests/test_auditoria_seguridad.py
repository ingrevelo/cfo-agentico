"""Auditoría automatizada de seguridad, cero secretos, Decimal, LLM y frontera hexagonal."""

from __future__ import annotations

import ast
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BACKEND_APP = ROOT / "backend" / "app"

_PATRONES_SECRETOS = (
    re.compile(r"sk-ant-[A-Za-z0-9_-]{10,}"),
    re.compile(r"sk-[A-Za-z0-9]{20,}"),
    re.compile(r"ghp_[A-Za-z0-9]{20,}"),
    re.compile(r"AIza[0-9A-Za-z_-]{20,}"),
)

_TOOLS_ESCRITURA_PROHIBIDAS = (
    "belo_confirm_swap",
    "belo_confirm_transfer",
    "belo_confirm_pix_payout",
    "belo_accept_pix_payout_terms",
)


def test_sin_secretos_hardcodeados_en_codigo_ni_datos() -> None:
    rutas = [
        *list((ROOT / "backend" / "app").rglob("*.py")),
        *list((ROOT / "backend" / "tests").rglob("*.py")),
        *list((ROOT / "data").glob("*.json")),
    ]
    for ruta in rutas:
        texto = ruta.read_text(encoding="utf-8")
        for patron in _PATRONES_SECRETOS:
            assert patron.search(texto) is None, f"Posible secreto en {ruta}"


def test_agent_no_expone_tools_de_escritura_al_llm() -> None:
    agent_dir = BACKEND_APP / "agent"
    assert agent_dir.exists()

    for md in (agent_dir / "prompts").glob("*.md"):
        contenido = md.read_text(encoding="utf-8")
        for tool in _TOOLS_ESCRITURA_PROHIBIDAS:
            assert tool not in contenido, f"Tool de escritura '{tool}' referenciada en {md}"

    llm_source = (agent_dir / "llm.py").read_text(encoding="utf-8")
    tree = ast.parse(llm_source, filename="llm.py")
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            for kw in node.keywords:
                assert kw.arg != "tools", "El LLM en agent/llm.py no debe recibir tools"
        if isinstance(node, ast.Constant) and isinstance(node.value, str):
            for tool in _TOOLS_ESCRITURA_PROHIBIDAS:
                assert tool not in node.value, f"Tool de escritura '{tool}' encontrada en llm.py"


def test_domain_no_usa_floats_ni_importa_capas_externas() -> None:
    domain_dir = BACKEND_APP / "domain"
    if not domain_dir.exists():
        return
    for py_file in domain_dir.glob("*.py"):
        source = py_file.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(py_file))
        for node in ast.walk(tree):
            if isinstance(node, ast.Constant) and isinstance(node.value, float):
                raise AssertionError(f"Literal float prohibido en dominio: {py_file}:{node.lineno}")
            if isinstance(node, ast.Name) and node.id == "float":
                raise AssertionError(f"Uso de float prohibido en dominio: {py_file}:{node.lineno}")
            if isinstance(node, ast.ImportFrom) and node.module:
                assert not node.module.startswith(("app.adapters", "app.api", "app.agent")), (
                    f"Violación hexagonal en {py_file}: importa {node.module}"
                )
