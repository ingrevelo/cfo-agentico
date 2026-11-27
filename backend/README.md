# Backend · CFO Agéntico

Python + FastAPI. Contiene el motor de reglas, la máquina de estados, el puerto hacia Belo y la orquestación del agente.

> **Estado:** estructura documentada. El código se escribe durante el hackathon, a partir de [`docs/caso-de-prueba.md`](../docs/caso-de-prueba.md).

## Arquitectura hexagonal

```
app/
├── domain/     Reglas de negocio puras: motor de reglas, juez, máquina de estados, autonomía. Sin I/O.
├── ports/      Contratos hacia afuera. El principal es BeloPort.
├── adapters/   Implementaciones de los puertos: MockBeloAdapter y LiveBeloMCPAdapter.
├── agent/      Grafo del agente (LangGraph o máquina de estados en Python) y prompts del LLM.
├── api/        Endpoints FastAPI que consume el frontend.
└── db/         Esquema SQLite: reglas, planes, movimientos, claves de idempotencia y MCP Log.
tests/          Los 11 casos de seguridad (T01–T11) contra MockBeloAdapter.
```

**Regla de dependencias:** `domain` no importa nada de `adapters`, `api` ni `agent`. Todo acceso a Belo pasa por `ports/BeloPort`.

## Cómo se va a correr (previsto)

```bash
cd backend
uv sync                      # o: pip install -e .
uv run uvicorn app.api.main:app --reload
uv run pytest
```

Variables de entorno: ver [`.env.example`](../.env.example).
