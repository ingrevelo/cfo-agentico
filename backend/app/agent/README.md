# agent

Orquestación del agente. Decisión pendiente del equipo: **LangGraph** (5–6 nodos) o **máquina de estados en Python puro** como plan B.

| Nodo | Qué hace | ¿Usa LLM? |
|---|---|---|
| `load_context` | Carga perfil, reglas y vencimientos | No |
| `fetch_belo` | Saldos, rendimientos, movimientos y FX vía BeloPort | No |
| `rules_engine` | Calcula el plan y corre el juez | No |
| `compose_plan` | Redacta la tarjeta y el "por qué" a partir de la salida del motor | Sí |
| `human_approval` | `interrupt()` → `transaction.approve` | No |
| `execute_and_audit` | Ejecuta lo aprobado, aplica estados e idempotencia, escribe el MCP Log | No |
| `profile_patterns` (tarea aparte, en modo sombra) | Corre el perfilador sobre `account.activity` y pide al LLM que nombre los patrones y redacte las reglas propuestas | Solo para nombrar y redactar |

El grafo orquesta, pero **no guarda estados de dinero**: las transiciones las valida `domain/estados.py`.

`prompts/` guarda los prompts del LLM: nombrar patrones del historial, interpretar reglas en lenguaje natural, redactar la tarjeta del plan y la solicitud de más autonomía. Nunca incluyen límites ni montos como instrucción.
