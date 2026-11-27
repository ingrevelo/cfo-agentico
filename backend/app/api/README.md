# api

Endpoints FastAPI que usa el frontend (previstos):

| Método | Ruta | Para qué |
|---|---|---|
| `GET` | `/reglas` | Pantalla 1: leer las reglas de la persona |
| `PUT` | `/reglas` | Pantalla 1: confirmar o editar reglas |
| `POST` | `/ingresos/simular` | Demo: simular la llegada de un pago |
| `GET` | `/planes/{plan_id}` | Pantalla 2: plan propuesto y explicación |
| `PATCH` | `/planes/{plan_id}/movimientos/{paso}` | Caso Rojo: editar un movimiento (pasa por el juez) |
| `POST` | `/planes/{plan_id}/aprobar` | Pantalla 3: OK de la persona (idempotente) |
| `GET` | `/log` | Pantalla 4: MCP Log |
| `POST` | `/demo/avanzar` | Demo: avanzar el reloj (martes, jueves) para probar FX y vencimientos |
