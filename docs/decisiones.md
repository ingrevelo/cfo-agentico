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
| D13 | **Dos aprobaciones:** la persona aprueba el plan en CFO Agéntico, y cada movimiento real se aprueba en el link de Belo con el código que llega por correo | Así funciona el MCP de Belo: sin ese código no se ejecuta nada. El link vence a los 15 minutos |
| D14 | **La autonomía ganada nunca salta el código de Belo:** subir de nivel significa que el agente prepara y envía la operación sin preguntar en nuestra app | Belo exige el código en toda operación que mueve dinero; el pitch no puede prometer que el agente mueve dinero solo |
| D15 | **El alquiler se puede pagar con una transferencia real** (CBU o alias); **apartar en alcancías sigue SIMULATED** | El MCP permite transferir a terceros, pero las alcancías solo se consultan |
| D16 | **La URL pública no usa el MCP real.** Lo en vivo se muestra desde el portátil de quien presenta, con un solo movimiento de monto chico | El login es interactivo y con una cuenta real, Belo pide montos chicos y las llamadas desde servidores no conectan |

## Pendientes

Propuestas y recomendaciones en [`ruta-de-trabajo.md`](ruta-de-trabajo.md#decisiones-a-votar-en-el-kickoff); se votan en el kickoff.

- [ ] **LangGraph o máquina de estados en Python puro** para el grafo del agente.
- [ ] **Proveedor del LLM.**
- [ ] **$belotag de los 5 integrantes**, registrados en Equipos de HackRadar. Para el MCP, además, cuenta con identidad verificada y el correo dado de alta por Belo.
- [ ] **Actualizar `BeloPort`, el MCP simulado y el anexo A1 de `caso-de-prueba.md`** con los nombres reales de las tools, cuando tengamos la lista.
- [ ] **Hacer público el repositorio** antes de entregar en HackRadar.

## Preguntas para los mentores de Belo

Actualizadas el 27-nov con la [guía de conexión del MCP](https://app.notion.com/p/belo/belo-para-agentes-c-mo-conectar-el-MCP-hackathon-27-11-424b23cb6b46819cb3b9edbc2057bb49). Las cinco primeras son urgentes.

1. **Cloudflare responde 403 a nuestro cliente MCP en Python** (SDK oficial `mcp`), incluso en el descubrimiento de OAuth. ¿Pueden habilitar clientes propios, o el MCP solo admite Claude, Cursor, VS Code, Codex y ChatGPT de escritorio?
2. ¿Cuáles son los nombres y parámetros exactos de las tools? ¿Pueden compartir respuestas de ejemplo?
3. ¿Hay alguna tool de rendimiento (por ejemplo, USDT rindiendo)? Nuestro plan deja el excedente "rindiendo en USDT".
4. ¿Se puede mover dinero a una alcancía desde el MCP, o solo consultarlas?
5. ¿Cómo se entera el agente de que la persona aprobó el link: la tool espera, hay que consultar el estado, o aparece en los movimientos?
6. ¿Las operaciones son siempre reales, o hay saldo de prueba? ¿Qué monto mínimo recomiendan?
7. ¿La conversión o la transferencia aceptan una referencia o clave de idempotencia?
8. ¿Se puede aprobar un plan con varios movimientos en un solo link?
9. ¿Los movimientos permiten detectar ingresos nuevos casi en tiempo real, o hay webhooks?
10. ¿Cómo funcionan las comisiones o spreads entre monedas latinoamericanas y dólares digitales?
11. ¿Qué métrica les importaría más ver en una demo: retención de saldo, cantidad de operaciones o confianza declarada?
