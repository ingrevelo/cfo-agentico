# CFO Agéntico · una sola imagen: Node compila el frontend y FastAPI lo sirve en / y la API en /api.
# Supone backend/pyproject.toml (uv), la app en app.main:app y frontend/ con `npm run build` → dist/.
# La app debe montar FRONTEND_DIST como archivos estáticos y escribir SQLite en /tmp (el contenedor es de solo lectura).

FROM node:22-alpine AS frontend
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.12-slim AS app
COPY --from=ghcr.io/astral-sh/uv:0.9.5 /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH=/opt/venv/bin:$PATH PYTHONUNBUFFERED=1 \
    FRONTEND_DIST=/app/static DATABASE_URL=sqlite:////tmp/cfo.db
WORKDIR /app
COPY backend/pyproject.toml backend/uv.lock* ./
RUN uv sync --no-dev --no-install-project
COPY backend/ ./
COPY data/ /app/data/
COPY --from=frontend /frontend/dist /app/static
RUN useradd --system --uid 10001 cfo
USER cfo
EXPOSE 8080
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
