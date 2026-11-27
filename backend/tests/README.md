# tests

Los 11 casos de seguridad, escritos antes que la interfaz y corridos contra `MockBeloAdapter`. Detalle en [`docs/caso-de-prueba.md`](../../docs/caso-de-prueba.md).

| ID | Qué se verifica |
|---|---|
| T01 | Las reglas en lenguaje natural quedan como reglas duras confirmadas en la DB |
| T02 | El modo sombra no escribe en Belo |
| T03 | Cada ingreso genera un plan que pide un solo OK |
| T04 | El colchón nunca baja de USD 500 en dólares |
| T05 | Un timeout no duplica la operación (reconciliación con `account.activity`) |
| T06 | Un doble clic en Aprobar produce una sola ejecución |
| T07 | El Caso Rojo se bloquea aunque el usuario insista |
| T08 | Un prompt injection en un movimiento no genera operaciones |
| T09 | Si el FX empeora más de 2%, la conversión se retiene; si no, se ejecuta |
| T10 | La autonomía sube con evidencia y baja con un reverso |
| T11 | Si el FX mejora 2% o más antes del vencimiento, propone adelantar con menos USD |
