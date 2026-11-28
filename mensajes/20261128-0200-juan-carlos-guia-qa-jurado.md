**De:** juan-carlos
**Para:** brigitte y equipo · **Rama:** `domain/auditoria-entrega-qa`

Guía rápida de respuestas técnicas (30 segundos) para las 7 preguntas más difíciles del jurado de Belo, respaldadas por código y tests del repositorio:

1. **¿Qué pasa si llega un pago con prompt injection en la descripción o contraparte?**
   El perfilador determinista (`backend/app/domain/perfilador.py`) detecta patrones de inyección (`T08`), los bloquea en `intentos_bloqueados` y los registra en `MCP Log` como `INTENTO_BLOQUEADO`. Además, el LLM nunca recibe tools de escritura, los datos van aislados entre `<datos>` y `</datos>`, y `numeros_ajenos` (`backend/app/agent/redaccion.py`) descarta cualquier salida que invente o altere números, cayendo a plantilla segura (`test_redteam_injection.py`).

2. **¿Qué pasa si la persona hace doble clic o hay timeout de red al aprobar un plan?**
   Cada movimiento usa `clave_idempotencia` única en SQLite (`backend/app/db/repositorio.py`) y `POST /api/planes/{id}/aprobar` es idempotente (`T09`). Las pruebas de concurrencia (`test_concurrencia_api.py`) y WAL + reinicio atómico (`sesion.py`, `semilla.py`) verifican que no se duplican órdenes ni hay `database is locked`.

3. **¿Qué pasa si el dólar cae más de 2% antes del vencimiento?**
   La banda de FX (`backend/app/domain/fx.py`, `T05`) compara la cotización actual contra la tolerancia configurada (`fx_tolerance_pct`). Si supera el límite, el plan retiene la conversión y pide decisión explícita en lugar de ejecutar a pérdida.

4. **¿Por qué el agente no mueve dinero sin aprobación del usuario?**
   Por `D14` y `autonomy_levels`: las salidas a terceros quedan fijas en nivel `1` y las conversiones a pesos en nivel `3` (`rutas_reales.py`, `test_endpoints_reales.py`). Incluso en acciones de nivel `4` dentro de dólares, Belo exige confirmación con código de aprobación del usuario.

5. **¿Por qué usan `USDC` y `ARGt` y cómo validaron el MCP real de Belo?**
   Por `D18`, los dólares de Sofía se operan en `USDC` y los pesos en `ARGt`. El esquema completo de las 18 tools reales está capturado en `docs/belo-mcp/tools.json`, y `test_paridad_mcp.py` verifica que `mcp_simulado` coincide en nombres, propiedades, requeridos y anotaciones de seguridad.

6. **¿Qué corre en vivo y qué está simulado?**
   Por `D11`–`D13`, nunca fingimos operaciones reales: lo que corre contra el MCP simulado o bolsillos internos sin endpoint propio se marca explícitamente como `SIMULATED` en la respuesta y en el `MCP Log`.

7. **¿Cómo garantizan privacidad, cero secretos y datos sintéticos?**
   Todo el repositorio usa datos 100% sintéticos (`data/sofia-demo.json`, `data/historial-sofia.json`), sin credenciales ni `$belotag` reales. Antes de hacer público el repo ejecutamos `backend/scripts/auditar_entrega.py`, que escanea árbol de trabajo, historial git, `$belotag`, vocabulario, `ruff` y `pytest`.

**Necesito:** nada, solo aviso para el pitch del domingo.
