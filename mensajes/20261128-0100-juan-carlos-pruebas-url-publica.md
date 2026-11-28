**De:** juan-carlos
**Para:** brigitte y cesar · **Rama:** `domain/pruebas-url-publica`

Agregado `backend/scripts/probar_url_publica.py` y ejecutadas **5 corridas seguidas** de punta a punta contra `https://cfo.pruebassite.com` (`/api/salud`, `/api/reglas`, `/api/ingresos/simular`, Caso Rojo, `/api/planes/{id}/aprobar`, `/api/log` y `/api/demo/reiniciar`): **5/5 OK** (promedio `0.94s`).

**Necesito:** revisión de Brigitte para cerrar `domain/pruebas-url-publica`.
