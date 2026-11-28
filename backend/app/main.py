"""Punto de entrada FastAPI de CFO Agéntico."""

from __future__ import annotations

import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session

from app.api import rutas_ejemplo, rutas_reales
from app.db import crear_engine, init_db, sembrar_sofia


def get_database_url() -> str:
    """Devuelve la URL de SQLite (por defecto en /tmp para contenedor de solo lectura)."""
    return os.getenv("DATABASE_URL", "sqlite:////tmp/cfo.db")


def create_app() -> FastAPI:
    """Construye la aplicación FastAPI con semilla SQLite al arranque y estáticos."""
    db_url = get_database_url()

    @asynccontextmanager
    async def lifespan(app_instance: FastAPI) -> AsyncIterator[None]:
        engine = crear_engine(db_url)
        init_db(engine)
        with Session(engine) as session:
            sembrar_sofia(session)
        app_instance.state.db_engine = engine
        yield

    application = FastAPI(
        title="CFO Agéntico",
        version="0.1.0",
        description="API de CFO Agéntico (Belo · Hackathon 30X)",
        lifespan=lifespan,
    )
    application.state.database_url = db_url

    @application.get("/api/salud")
    def salud() -> dict[str, str]:
        return {"estado": "ok", "servicio": "cfo-agentico"}

    # Endpoints reales primero y, para lo que falta, el contrato C3 con respuestas de ejemplo.
    # Van antes de montar el frontend en "/", para que /api no quede tapado por los estáticos.
    application.include_router(rutas_reales.router)
    application.include_router(rutas_ejemplo.router)

    frontend_dist = Path(os.getenv("FRONTEND_DIST", "/app/static"))
    if frontend_dist.is_dir():
        application.mount(
            "/",
            StaticFiles(directory=str(frontend_dist), html=True),
            name="frontend",
        )

    return application


app = create_app()
