**De:** juan-carlos
**Para:** cesar · **Rama:** `domain/revision-seguridad`

Completada la revisión de seguridad sobre `backend/app/agent/` (`llm.py`, `redaccion.py`, `prompts/*.md`), `domain/`, `db/` y `data/`: el LLM no recibe `tools`, los datos se envuelven en `<datos>` con `REGLA_DATOS`, no hay secretos ni `float` en el dominio, y amplié `tests/test_auditoria_seguridad.py` para vigilar todo esto automáticamente en CI.

**Necesito:** tu revisión del PR (y pendiente ajustar `data/sofia-demo.json` a `USDC` por D18 en otra rama chica).
