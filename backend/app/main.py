"""Punto de entrada FastAPI de CFO Agéntico."""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api import rutas_ejemplo


def get_database_url() -> str:
    """Devuelve la URL de SQLite (por defecto en /tmp para contenedor de solo lectura)."""
    return os.getenv("DATABASE_URL", "sqlite:////tmp/cfo.db")


def create_app() -> FastAPI:
    """Construye la aplicación FastAPI con el endpoint de salud y estáticos opcionales."""
    application = FastAPI(
        title="CFO Agéntico",
        version="0.1.0",
        description="API de CFO Agéntico (Belo · Hackathon 30X)",
    )
    application.state.database_url = get_database_url()

    @application.get("/api/salud")
    def salud() -> dict[str, str]:
        return {"estado": "ok", "servicio": "cfo-agentico"}

    # Contrato C3 con respuestas de ejemplo; api/endpoints-reales lo reemplaza sin cambiar rutas.
    # Va antes de montar el frontend en "/", para que /api no quede tapado por los estáticos.
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
