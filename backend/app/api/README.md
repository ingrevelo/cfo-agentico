# api

Endpoints FastAPI que usa el frontend. Todas las rutas van bajo `/api`, porque FastAPI sirve el frontend en `/` y la API en el mismo dominio.

## Contrato C3 (congelado)

Los esquemas están en [`esquemas.py`](esquemas.py) y cada endpoint responde hoy con un ejemplo fijo ([`ejemplos.py`](ejemplos.py), con los números de [`docs/caso-de-prueba.md`](../../../docs/caso-de-prueba.md)). En `api/endpoints-reales` cada respuesta pasa a salir del motor, el juez y el agente **sin cambiar la ruta ni el esquema**. Cambiar el contrato requiere avisar en `mensajes/`.

| Método | Ruta | Para qué | Responde |
|---|---|---|---|
| `GET` | `/api/reglas` | Pantalla 1: leer las reglas de la persona | `Reglas` |
| `PUT` | `/api/reglas` | Pantalla 1: confirmar o editar reglas y vencimientos | `Reglas` |
| `POST` | `/api/ingresos/simular` | Demo: llega un pago (`{"monto_usd": "1500"}`) | `Plan` (201) |
| `GET` | `/api/planes/{plan_id}` | Pantalla 2: plan propuesto y explicación | `Plan` |
| `PATCH` | `/api/planes/{plan_id}/movimientos/{paso}` | Caso Rojo: editar un monto (pasa por el juez) | `Plan` con el paso `BLOQUEADO` si rompe una regla |
| `POST` | `/api/planes/{plan_id}/aprobar` | Pantalla 3: OK del plan. Idempotente: dos llamadas, un solo resultado | `Plan` |
| `POST` | `/api/perfilado` | Modo sombra: reglas propuestas | `list[PropuestaRegla]` |
| `POST` | `/api/perfilado/{propuesta_id}/confirmar` | Confirmar o descartar (`{"confirmar": false}`) | `PropuestaRegla` |
| `GET` | `/api/log` | Pantalla 4: MCP Log | `list[EntradaLog]` |
| `GET` | `/api/autonomia` | Niveles y solicitud de más autonomía | `Autonomia` |
| `POST` | `/api/autonomia/{categoria}` | Aceptar o rechazar (`{"aceptar": true}`) | `Autonomia` |
| `POST` | `/api/demo/avanzar` | Demo: `{"dia": "martes" \| "jueves", "fx_usd_ars": "1150"}` | `Plan` |
| `POST` | `/api/demo/reiniciar` | Demo: volver al estado inicial | `{"ok": true}` |

`GET /api/salud` lo define `api/esqueleto`.

## Reglas del contrato

- **Montos como texto decimal** (`"900.00"`), nunca números de punto flotante. En el backend son `Decimal`.
- **Estados de un movimiento:** `PROPUESTO`, `APROBADO`, `EJECUTANDO` (esperando la aprobación en Belo o la respuesta del MCP), `COMPLETADO`, `RETENIDO`, `DESCONOCIDO`, `FALLIDO`, `BLOQUEADO` y `RECHAZADO`. El frontend los muestra con sus etiquetas (`Propuesto`, `Retenido`…).
- **`simulado: true`** en un movimiento obliga a mostrar el badge SIMULATED.
- **`aprobacion_belo`** trae el estado de la segunda aprobación (D13): `awaiting_approval`, `success` o `failed`.
- **`clave`** es la de idempotencia: `plan_id` + paso (`plan-ing01-M1`).

## Ejemplos que se pueden pedir

| Petición | Qué devuelve |
|---|---|
| `POST /api/ingresos/simular` | Plan `plan-ing01`: M1 USD 900 → USDT, M2 USD 120 → Impuestos (SIMULATED), M3 USD 380 → 450.300 ARS el jueves |
| `PATCH …/movimientos/M3` con `"1100"` | Caso Rojo: M3 `BLOQUEADO`, "te quedarían USD 400 en dólares" |
| `POST …/aprobar` | M1 y M2 `COMPLETADO`, M3 `APROBADO` (programado) |
| `POST /api/demo/avanzar` jueves a `1150` | M3 `RETENIDO` y propuesta de USD 392 |
| `POST /api/demo/avanzar` jueves a `1190` | M3 `COMPLETADO` con USD 379 |
| `POST /api/demo/avanzar` martes a `1220` | Propuesta de adelantar con USD 369 |

## Cómo se incluye en la app

```python
from app.api import rutas_ejemplo

app.include_router(rutas_ejemplo.router)
```

El OpenAPI queda en `/openapi.json` y `/docs`. Con él, `front/cliente-api` genera los tipos de TypeScript (`openapi-typescript`).
