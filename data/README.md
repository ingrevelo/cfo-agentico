# data

`sofia-demo.json`: datos sintéticos de la persona de la demo (saldos, reglas, vencimientos y niveles de autonomía). Es el seed del `MockBeloAdapter` y de SQLite. Todos los montos y tasas se expresan como **texto decimal** (por ejemplo `"1500.00"`), alineados a las 18 tools reales de [`docs/belo-mcp/tools.md`](../docs/belo-mcp/tools.md), e incluye ejemplos de respuesta `belo_balances_sample` y `belo_vaults_sample`. Ningún dato corresponde a una persona real.

`historial-sofia.json`: 43 movimientos sintéticos de junio a noviembre de 2026 para la demo del perfilado, con `monto` en texto decimal y `belo_type` compatible con `belo_list_transactions` (`deposit`, `withdrawal`, `swap`, `transfer`). Contiene cuatro patrones (ingreso del cliente, alquiler, monotributo y retiro al banco), gastos de tarjeta que no forman patrón y un movimiento con un intento de prompt injection para el caso T08.
