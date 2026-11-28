#!/usr/bin/env bash
set -euo pipefail

# Arranca el backend en local contra SQLite en /tmp y mock de Belo por defecto.
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR/backend"

export BELO_ADAPTER="${BELO_ADAPTER:-mock}"
export DATABASE_URL="${DATABASE_URL:-sqlite:////tmp/cfo_local.db}"

uv sync
uv run uvicorn app.main:app --reload --host 127.0.0.1 --port 8080
