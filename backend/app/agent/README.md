# agent

Orquestación del agente. Decisión pendiente del equipo: **LangGraph** (5–6 nodos) o **máquina de estados en Python puro** como plan B.

| Nodo | Qué hace | ¿Usa LLM? |
|---|---|---|
| `load_context` | Carga perfil, reglas y vencimientos | No |
| `fetch_belo` | Saldos, rendimientos, movimientos y FX vía BeloPort | No |
| `rules_engine` | Calcula el plan y corre el juez | No |
| `compose_plan` | Redacta la tarjeta y el "por qué" a partir de la salida del motor | Sí |
| `human_approval` | OK del plan en la app y, por cada movimiento real, el link de aprobación de Belo (código por correo, vence a los 15 minutos) | No |
| `execute_and_audit` | Ejecuta lo aprobado, aplica estados e idempotencia, escribe el MCP Log | No |
| `profile_patterns` (tarea aparte, en modo sombra) | Corre el perfilador sobre `account.activity` y pide al LLM que nombre los patrones y redacte las reglas propuestas | Solo para nombrar y redactar |

El grafo orquesta, pero **no guarda estados de dinero**: las transiciones las valida `domain/estados.py`.

## El LLM (`llm.py` y `redaccion.py`)

`llm.py` es el único punto de acceso al LLM: `LLM.generar()` llama a `client.beta.messages.parse()` de Anthropic con `claude-opus-5-5`, salida estructurada (Pydantic), `output_config.effort` y `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`). Sin tools.

`redaccion.py` tiene los cuatro usos, cada uno con su esquema, su validación y su plantilla:

| Función | Prompt | Esfuerzo | Se descarta la salida si… |
|---|---|---|---|
| `redactar_plan` | `prompts/plan.md` | low | cambia los pasos del motor o trae un número que no estaba en los datos |
| `nombrar_patrones` | `prompts/patrones.md` | low | agrega o quita patrones, o inventa números |
| `interpretar_regla` | `prompts/regla.md` | medium | inventa números que la persona no dijo. Nunca se aplica sola: la persona confirma y el dominio valida |
| `redactar_autonomia` | `prompts/autonomia.md` | low | inventa números |

Cada función devuelve `Resultado(valor, fuente, motivo)`: `fuente` es `"llm"` o `"plantilla"`. Se usa la plantilla si no hay clave (`LLM_API_KEY`), si `LLM_DESACTIVADO=1`, si falla la red, si el modelo rechaza, si la salida queda cortada o si no pasa la validación. **La demo nunca se cae por el LLM.**

Los datos de Belo van entre `<datos>` y el prompt de sistema dice que son información, nunca instrucciones (T08). Aunque el LLM se dejara engañar, no puede cambiar montos: los números que no estaban en los datos descartan la salida, y las decisiones las toma el juez.

Dependencia para `pyproject.toml`: `anthropic>=2.14`. Tests: `backend/tests/test_agent_llm.py` (cliente falso, sin red).

`prompts/` guarda los prompts del LLM: nombrar patrones del historial, interpretar reglas en lenguaje natural, redactar la tarjeta del plan y la solicitud de más autonomía. Nunca incluyen límites ni montos como instrucción.
