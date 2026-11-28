# Decisiones

Registro corto de lo que decidimos, lo que falta decidir y lo que hay que preguntarle a Belo.

## Tomadas

| # | Decisión | Por qué |
|---|---|---|
| D1 | **Reto 1 · Banca agéntica** (no "Plata sin fronteras") | El agente mueve dinero por la persona, que es justo el foco de este reto; el otro reto lo excluye |
| D2 | **Persona de la demo: Sofía** (Buenos Aires, cobra en USD y paga en ARS) | Es el mercado más fuerte de Belo y conecta con el dolor del pasamanos que nombró el equipo de Belo |
| D3 | **El plan se dispara con cada ingreso**, no una vez por semana | El momento en que entra el dinero es cuando la gente lo saca. Los lunes queda un resumen que no mueve dinero |
| D4 | **Los montos los calcula el código**; el LLM solo interpreta y redacta | Un error del modelo no puede convertirse en un movimiento de dinero |
| D5 | **Arquitectura hexagonal con `BeloPort`** (mock y live) | Permite construir antes de tener acceso al MCP y cambiar de adaptador sin reescribir |
| D6 | **Colchón = todo lo que queda en dólares** (USD + USDT + alcancías); **tope de USD 400 solo para cambios a pesos** | Con esas definiciones el plan de la demo y el Caso Rojo son coherentes |
| D7 | **Banda de FX asimétrica:** se retiene si el dólar empeora más de 2%; se propone adelantar si mejora 2% o más antes del vencimiento | Protege sin especular: solo se adelanta dinero que ya tiene un vencimiento |
| D8 | **Autonomía ganada por categoría**, empezando por lo que no sale de dólares | Responde al dolor de confianza de Belo y es el diferenciador del proyecto |
| D9 | **SQLite**, sin bases de grafos | Una usuaria y pocas reglas no justifican más infraestructura en 48 horas |
| D10 | **Badge SIMULATED** para todo lo que no corra en vivo | Nunca fingir una operación real |
| D11 | **Perfilado en modo sombra:** el código detecta patrones, el LLM los interpreta y la persona confirma | Le da al agente un rol que no se resuelve con un `if` y convierte el onboarding en confirmar en lugar de escribir reglas |
| D12 | **Monedas genéricas:** cada obligación se convierte a la moneda en que vence | El producto sirve para ARS, BRL, COP, CLP o MXN; la demo usa USD→ARS |
| D13 | **Dos aprobaciones:** la persona aprueba el plan en CFO Agéntico, y cada movimiento real se aprueba en Belo: en su cuenta propia, con la notificación de la app de Belo; si no, en un enlace de Belo | Así funciona el MCP de Belo: `belo_confirm_*` no ejecuta nada hasta esa aprobación. El enlace vence a los 15 minutos |
| D14 | **La autonomía ganada nunca salta el código de Belo:** subir de nivel significa que el agente prepara y envía la operación sin preguntar en nuestra app | Belo exige el código en toda operación que mueve dinero; el pitch no puede prometer que el agente mueve dinero solo |
| D15 | **El alquiler se puede pagar con una transferencia real** (CBU o alias); **apartar en alcancías sigue SIMULATED** | El MCP permite transferir a terceros, pero las alcancías solo se consultan |
| D16 | **La URL pública no usa el MCP real.** Lo en vivo se muestra desde el portátil de quien presenta, con un solo movimiento de monto chico | El login es interactivo y con una cuenta real, Belo pide montos chicos y las llamadas desde servidores no conectan |
| D17 | **La app es una PWA:** instalable en el celular, con `vite-plugin-pwa`. El service worker guarda solo la cáscara de la app; todo `/api` va siempre a la red y, sin conexión, no se puede aprobar nada. Las notificaciones push son opcionales y están en la lista de recortes | La historia ocurre en el celular de Sofía cuando le llega un pago, y la demo se ve mejor en un teléfono. Un plan o un saldo guardado en caché podría mostrar dinero que ya no está |

## Pendientes

Propuestas y recomendaciones en [`ruta-de-trabajo.md`](ruta-de-trabajo.md#decisiones-a-votar-en-el-kickoff); se votan en el kickoff.

- [ ] **LangGraph o máquina de estados en Python puro** para el grafo del agente.
- [ ] **Proveedor del LLM.**
- [ ] **$belotag de los 5 integrantes**, registrados en Equipos de HackRadar. Para el MCP, además, cuenta con identidad verificada y el correo dado de alta por Belo.
- [x] **Lista de tools reales** en [`belo-mcp/tools.md`](belo-mcp/tools.md) (18 tools, 27-nov).
- [ ] **Actualizar `BeloPort`, el MCP simulado y el anexo A1 de `caso-de-prueba.md`** con esos nombres.
- [ ] **Hacer público el repositorio** antes de entregar en HackRadar.

## Preguntas para los mentores de Belo

Actualizadas el 27-nov con la [guía de conexión del MCP](https://app.notion.com/p/belo/belo-para-agentes-c-mo-conectar-el-MCP-hackathon-27-11-424b23cb6b46819cb3b9edbc2057bb49). Las preguntas 1 a 5 y la 7 ya tienen respuesta con la [lista de tools](belo-mcp/tools.md) y la conexión real del 28-nov.

1. ~~¿Cloudflare bloquea nuestro cliente MCP en Python?~~ **Resuelta el 28-nov:** el 403 era solo en el registro automático del cliente. Registrando un cliente a mano en `https://bifrost.belo.app/oauth/register` (dato que compartió otro equipo), Claude Code y nuestro script en Python se conectan y listan las 18 tools. Detalle en [`ruta-de-trabajo.md`](ruta-de-trabajo.md#el-mcp-de-belo).
2. ~~¿Nombres y parámetros de las tools?~~ **Respondida:** 18 tools `belo_*` en [`belo-mcp/tools.md`](belo-mcp/tools.md). Sigue abierto: ¿pueden compartir respuestas de ejemplo?
3. ~~¿Tool de rendimiento?~~ **Respondida:** no hay una tool aparte; `belo_get_balances` trae `yield.rate` y lo ganado por moneda. El excedente queda en USDT y mostramos su rendimiento con ese dato.
4. ~~¿Mover dinero a una alcancía?~~ **Respondida:** no; las bóvedas solo se consultan (`belo_list_vaults`, `belo_get_vault`). Confirma D15.
5. ~~¿Cómo se entera el agente de la aprobación?~~ **Respondida:** `belo_confirm_*` deja la transacción en `awaiting_approval` (notificación en la app de Belo, o un enlace). Con `waitForApproval` la tool espera; si no, se consulta `belo_get_transaction` hasta `success` o `failed`.
6. ¿Las operaciones son siempre reales, o hay saldo de prueba? ¿Qué monto mínimo recomiendan?
7. ~~¿Clave de idempotencia?~~ **Respondida:** no se pasa ninguna; confirmar la deriva de la transacción. Repetir un confirm es seguro, pero devuelve la respuesta original: después de un timeout se consulta `belo_get_transaction`.
8. ¿Se puede aprobar un plan con varios movimientos en un solo link?
9. ¿Los movimientos permiten detectar ingresos nuevos casi en tiempo real, o hay webhooks?
10. ¿Cómo funcionan las comisiones o spreads entre monedas latinoamericanas y dólares digitales?
11. ¿Qué métrica les importaría más ver en una demo: retención de saldo, cantidad de operaciones o confianza declarada?
