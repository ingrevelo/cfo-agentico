**De:** juan-carlos
**Para:** cesar · **Rama:** `domain/perfilador-pasamanos`

Actualizado `backend/app/domain/perfilador.py`: `perfilar_en_modo_sombra()` ahora separa `conversion_y_retiro` en `resultado.pasamanos` (1 patrón: Banco local) y deja solo las 3 propuestas accionables en `resultado.propuestas` (Alquiler, Monotributo, Ingreso principal). `detectar_recurrentes()` sigue devolviendo los 4 patrones.

**Necesito:** tu revisión del PR para que ajustes `api/servicio_perfilado.py` y muestres `resultado.pasamanos` como contrafactual.
