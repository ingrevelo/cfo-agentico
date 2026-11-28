"""Motor y sesiones de SQLite para SQLModel."""

from __future__ import annotations

import os
from collections.abc import Generator
from pathlib import Path

from sqlalchemy import event
from sqlalchemy.engine import Engine
from sqlmodel import Session, SQLModel, create_engine

import app.db.modelos  # noqa: F401


def obtener_database_url(database_url: str | None = None) -> str:
    """Obtiene la URL de SQLite (por defecto en /tmp/cfo.db para contenedor read-only)."""
    return database_url or os.getenv("DATABASE_URL", "sqlite:////tmp/cfo.db")


def crear_engine(database_url: str | None = None) -> Engine:
    """Crea el engine SQLAlchemy/SQLModel asegurando el directorio padre si es archivo."""
    url = obtener_database_url(database_url)
    if url.startswith("sqlite:///") and not url.startswith("sqlite:///:memory:"):
        ruta_archivo = Path(url.removeprefix("sqlite:///"))
        ruta_archivo.parent.mkdir(parents=True, exist_ok=True)
    connect_args = (
        {"check_same_thread": False, "timeout": 15.0} if url.startswith("sqlite") else {}
    )
    engine = create_engine(url, connect_args=connect_args)
    if url.startswith("sqlite") and not url.startswith("sqlite:///:memory:"):

        @event.listens_for(engine, "connect")
        def _configurar_sqlite(dbapi_conn, _connection_record) -> None:
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA busy_timeout=15000")
            cursor.execute("PRAGMA synchronous=NORMAL")
            cursor.close()

    return engine


def init_db(engine: Engine) -> None:
    """Crea todas las tablas definidas en SQLModel si no existen."""
    SQLModel.metadata.create_all(engine)


def get_session(engine: Engine) -> Generator[Session, None, None]:
    """Generador de sesiones SQLModel."""
    with Session(engine) as session:
        yield session
