# domain

Lógica de negocio pura, sin llamadas a red ni a base de datos. Es lo primero que se programa y lo que cubren los tests.

| Módulo previsto | Responsabilidad | Referencia en el caso de prueba |
|---|---|---|
| `reglas.py` | Modelo de las reglas duras y blandas (colchón, tope, FX, impuestos, niveles) | "Reglas duras" |
| `motor.py` | Calcula los movimientos de un plan a partir del ingreso, los vencimientos y la cotización | Fase 2.1 |
| `juez.py` | Decide EJECUTAR, PEDIR_APROBACION, OK_ADICIONAL, SOMBRA, SUGERIR o BLOQUEAR; revisa el FX al ejecutar y detecta oportunidades | Anexo A4 |
| `estados.py` | Máquina de estados de cada movimiento y transiciones permitidas | "Estados de cada movimiento" |
| `autonomia.py` | Niveles por categoría, solicitud de ascenso y descenso por reverso | Fase 5 |

Ningún monto lo calcula el LLM: todo número sale de este paquete.
