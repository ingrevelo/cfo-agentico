"""Dependencias de FastAPI: la sesión de SQLite y el LLM.

Si la app ya creó el engine al arrancar (`app.state.db_engine`, ver `api/arranque-demo`), se usa
ese. Si no, se crea la primera vez, se crean las tablas y se siembra a Sofía.
"""

from collections.abc import Generator
from functools import lru_cache

from fastapi import Request
from sqlmodel import Session

from app.agent.llm import LLM
from app.db import crear_engine, init_db, sembrar_sofia

USUARIO = "sofia-demo"  # la demo tiene una sola persona (datos sintéticos)


def _engine(request: Request):
    estado = request.app.state
    engine = getattr(estado, "db_engine", None)
    if engine is None:
        engine = crear_engine(getattr(estado, "database_url", None))
        init_db(engine)
        with Session(engine) as s:
            sembrar_sofia(s)
        estado.db_engine = engine
    return engine


def sesion(request: Request) -> Generator[Session, None, None]:
    with Session(_engine(request)) as s:
        yield s


@lru_cache
def llm() -> LLM:
    """Un solo cliente del LLM por proceso. Sin clave, usa plantillas."""
    return LLM()
