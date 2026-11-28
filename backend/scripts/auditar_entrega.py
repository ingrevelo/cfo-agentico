"""Auditoría pre-entrega para verificar secretos, vocabulario y calidad antes de abrir el repo."""

from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
BACKEND = RAIZ / "backend"

ARCHIVOS_PROHIBIDOS = (
    re.compile(r"(^|/)\.env$"),
    re.compile(r"\.(pem|key|db|sqlite|sqlite3)$", re.IGNORECASE),
    re.compile(r"(^|/)credentials\.json$"),
    re.compile(r"(^|/)\.mcp_tokens"),
)

PATRONES_SECRETOS = (
    re.compile(r"sk-ant-[A-Za-z0-9_-]{12,}"),
    re.compile(r"sk-proj-[A-Za-z0-9_-]{12,}"),
    re.compile(r"ghp_[A-Za-z0-9]{20,}"),
    re.compile(r"github_pat_[A-Za-z0-9_]{20,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
    re.compile(r"eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}"),
)

BELOTAG_RE = re.compile(r"\$([a-zA-Z][a-zA-Z0-9_-]{2,})")
TAGS_PERMITIDOS = {
    "belotag",
    "belotag-sintetico",
    "sofia",
    "sofia-demo",
    "atacante",
    "schema",
    "ref",
    "id",
    "defs",
    "HOME",
    "PATH",
    "PWD",
    "USER",
    "env",
    "perfil",
}

EXTENSIONES_TEXTO = {
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".json",
    ".md",
    ".yml",
    ".yaml",
    ".toml",
    ".sh",
    ".txt",
}

PALABRA_PROHIBIDA = re.compile(r"\b" + "pla" + "ta" + r"\b", re.IGNORECASE)


def _git(args: list[str]) -> str:
    res = subprocess.run(
        ["git", *args],
        cwd=RAIZ,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=True,
    )
    return res.stdout


def _chequear_archivos_prohibidos(archivos: list[str]) -> list[str]:
    hallazgos = []
    for ruta in archivos:
        if any(p.search(ruta) for p in ARCHIVOS_PROHIBIDOS):
            hallazgos.append(f"Archivo prohibido rastreado: {ruta}")
    return hallazgos


def _chequear_secretos_en_texto(texto: str, origen: str) -> list[str]:
    hallazgos = []
    for patron in PATRONES_SECRETOS:
        if patron.search(texto):
            hallazgos.append(f"Posible secreto ({patron.pattern}) en {origen}")
    return hallazgos


def _chequear_belotags(archivos: list[str]) -> list[str]:
    hallazgos = []
    for ruta in archivos:
        if ruta.endswith("auditar_entrega.py"):
            continue
        if Path(ruta).suffix.lower() not in EXTENSIONES_TEXTO:
            continue
        contenido = (RAIZ / ruta).read_text(encoding="utf-8", errors="replace")
        for match in BELOTAG_RE.finditer(contenido):
            tag = match.group(1)
            if tag not in TAGS_PERMITIDOS and not tag.isupper():
                hallazgos.append(f"Posible $belotag real (${tag}) en {ruta}")
    return hallazgos


def _chequear_vocabulario(archivos: list[str]) -> list[str]:
    hallazgos = []
    for ruta in archivos:
        if ruta.startswith("backend/app/agent/prompts/"):
            continue
        if not (ruta.startswith("backend/app/") or ruta.startswith("frontend/src/")):
            continue
        contenido = (RAIZ / ruta).read_text(encoding="utf-8", errors="replace")
        if PALABRA_PROHIBIDA.search(contenido):
            hallazgos.append(f"Vocabulario no permitido en {ruta}")
    return hallazgos


def _correr_comando(cmd: list[str], cwd: Path) -> bool:
    res = subprocess.run(cmd, cwd=cwd, check=False)
    return res.returncode == 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Auditoría pre-entrega de CFO Agéntico.")
    parser.add_argument(
        "--solo-seguridad",
        action="store_true",
        help="Omite ruff y pytest y ejecuta solo los chequeos de seguridad.",
    )
    args = parser.parse_args()

    archivos = [a for a in _git(["ls-files"]).splitlines() if a.strip()]
    errores: list[str] = []

    errores.extend(_chequear_archivos_prohibidos(archivos))
    for ruta in archivos:
        if ruta.endswith("auditar_entrega.py"):
            continue
        texto = (RAIZ / ruta).read_text(encoding="utf-8", errors="replace")
        errores.extend(_chequear_secretos_en_texto(texto, ruta))

    historial = _git(["log", "-p", "--all"])
    errores.extend(_chequear_secretos_en_texto(historial, "historial git"))
    errores.extend(_chequear_belotags(archivos))
    errores.extend(_chequear_vocabulario(archivos))

    if errores:
        print("[FALLO] Hallazgos de seguridad/higiene:")
        for err in errores:
            print(f"  - {err}")
    else:
        print("[OK] Sin archivos prohibidos, secretos, $belotag reales ni vocabulario inválido.")

    calidad_ok = True
    if not args.solo_seguridad:
        ruff_ok = _correr_comando([sys.executable, "-m", "ruff", "check", "."], BACKEND)
        pytest_ok = _correr_comando([sys.executable, "-m", "pytest", "-q"], BACKEND)
        calidad_ok = ruff_ok and pytest_ok
        print(f"[{'OK' if ruff_ok else 'FALLO'}] ruff check .")
        print(f"[{'OK' if pytest_ok else 'FALLO'}] pytest -q")

    aprobado = (not errores) and calidad_ok
    print("\nAUDITORIA APROBADA" if aprobado else "\nAUDITORIA CON HALLAZGOS")
    return 0 if aprobado else 1


if __name__ == "__main__":
    raise SystemExit(main())
