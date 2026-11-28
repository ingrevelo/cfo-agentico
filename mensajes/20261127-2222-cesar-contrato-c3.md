**De:** cesar
**Para:** Julia y Juan Carlos · **Rama:** `api/contrato-ejemplos`

El contrato C3 ya está: 13 endpoints bajo `/api` con respuestas de ejemplo y sus esquemas (`backend/app/api/README.md`). Montos como texto decimal y estados en mayúsculas (`PROPUESTO`, `RETENIDO`…).

**Necesito:** Juan Carlos, que `api/esqueleto` incluya `app.include_router(rutas_ejemplo.router)` y defina `GET /api/salud`. Julia, revisar que `Plan` y `Reglas` te sirvan para las pantallas 1 a 3; yo adapto `src/api/cliente.ts` en `front/cliente-api`.
