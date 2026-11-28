"""Auditoría automatizada de seguridad, cero secretos, Decimal y frontera hexagonal."""

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
