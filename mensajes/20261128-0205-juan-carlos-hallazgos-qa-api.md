**De:** juan-carlos
**Para:** cesar · **Rama:** `domain/qa-seguridad-api`

Al correr la suite de límites (`backend/tests/test_api_limites.py`) encontramos un bug de validación con valores especiales de `Decimal`:
- En `backend/app/api/servicio_reglas.py` (`_texto`) y `backend/app/api/rutas_ejemplo.py` (`_decimal`), `Decimal("NaN")` pasa `Decimal(valor)` y lanza `InvalidOperation` (`HTTP 500`) al comparar `< 0` / `<= 0`.
- `Decimal("Infinity")` pasa la comparación y se persiste como `"Infinity"`.

Dejamos los casos documentados con `@pytest.mark.xfail(strict=True)` en `test_api_limites.py` sin tocar tus archivos.

**Necesito:** agregar `if not d.is_finite(): raise HTTPException(422, f"Monto inválido: {valor}")` en `_texto` y `_decimal` cuando puedas.
