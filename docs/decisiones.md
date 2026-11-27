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

## Pendientes

Propuestas y recomendaciones en [`ruta-de-trabajo.md`](ruta-de-trabajo.md#decisiones-a-votar-en-el-kickoff); se votan en el kickoff.

- [ ] **LangGraph o máquina de estados en Python puro** para el grafo del agente.
- [ ] **Proveedor del LLM.**
- [ ] **$belotag de los 5 integrantes**, registrados en Equipos de HackRadar.
- [ ] **Hacer público el repositorio** antes de entregar en HackRadar.

## Preguntas para los mentores de Belo

Las cuatro primeras son urgentes: todavía no tenemos acceso al MCP.

1. ¿Cuándo y cómo recibimos el acceso al MCP V1 (URL, credenciales, $belotag)?
2. ¿El MCP usa transporte HTTP o stdio, y cómo se autentica?
3. ¿Pueden compartir respuestas de ejemplo de cada tool, aunque sea en JSON, para ajustar nuestro MCP simulado?
4. ¿Podemos llamar al MCP desde un servidor público (nuestra URL de la demo), o solo desde equipos locales?
5. ¿Qué herramientas expone el MCP V1? ¿Cuáles son de solo lectura y cuáles mueven dinero?
6. ¿Hay sandbox o saldo de prueba, o las operaciones son reales?
7. ¿`ramp.fiat_crypto` acepta una referencia o clave de idempotencia?
8. ¿`transaction.approve` permite aprobar un plan con varios movimientos de una vez?
9. ¿`account.activity` permite detectar ingresos nuevos casi en tiempo real, o hay webhooks?
10. ¿Cómo funcionan las comisiones o spreads entre monedas latinoamericanas y dólares digitales en la API?
11. ¿Qué métrica les importaría más ver en una demo: retención de saldo, cantidad de operaciones o confianza declarada?
