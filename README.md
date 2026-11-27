# CFO Agéntico

**El CFO que se gana tu confianza.** Un agente dentro de Belo que organiza el dinero de freelancers y pymes cada vez que les entra un pago: cambia a pesos solo lo que vence, deja el resto en dólares rindiendo y aparta los impuestos. La persona aprueba, el código pone los límites y, con el tiempo, el agente se gana el permiso para hacer solo lo rutinario.

> Proyecto de **Dev IngenierIA** para el **Reto 1 · Banca agéntica (Belo)** del Hackathon 30X, del 27 al 29 de noviembre de 2026.
>
> **Estado:** especificación y estructura listas. El código se escribe durante el hackathon.

---

## El problema

Muchas personas en Latinoamérica cobran en una moneda y pagan en otra. Sin un plan, una devaluación las encuentra con todo el dinero en la moneda equivocada, y decidir cada semana cuánto cambiar, cuándo y qué apartar es estresante. Por eso mucha gente usa Belo de **"pasamanos"**: le entra el dinero y lo saca al banco a los dos días.

Belo nombró dos dolores que queremos resolver:
1. **El pasamanos:** el dinero entra y se va, en lugar de quedarse en Belo.
2. **La confianza:** no hay referentes de cómo confiarle el dinero a un agente.

## Cómo lo resolvemos

Cuando entra un pago, CFO Agéntico arma un plan, lo explica en lenguaje simple y lo ejecuta solo con la aprobación de la persona.

| Principio | Qué significa |
|---|---|
| **La IA propone y explica** | El LLM interpreta reglas dichas en lenguaje natural, redacta el plan y explica qué, por qué y con cuánto dinero. No calcula montos ni mueve fondos. |
| **El código frena** | Colchón, topes, tolerancia de FX e idempotencia viven en código. Si alguien intenta una excepción, el motor la bloquea aunque el modelo "quiera" autorizarla. |
| **La persona aprueba** | Ningún movimiento sale sin un OK explícito, con la aprobación nativa de Belo (`transaction.approve`). |
| **La autonomía se gana** | Cada tipo de movimiento empieza pidiendo permiso. Con evidencia, el agente pide hacer solo lo rutinario; con un reverso, pierde ese permiso. |
| **Transparencia total** | Cada paso queda en un MCP Log con la tool, el ID y el estado. Lo que no corre en vivo lleva el badge **SIMULATED**. |

### Ejemplo: Sofía (datos sintéticos)

Sofía es diseñadora freelance en Buenos Aires. Cobra USD 1.500 de un cliente en EE. UU. y el jueves paga 450.000 ARS de alquiler. Sus reglas: nunca bajar de USD 500 en dólares, no cambiar más de USD 400 a pesos sin preguntar y frenar si el dólar se mueve más de 2%.

Cuando entra el pago, el plan es:

| Movimiento | Monto | Por qué |
|---|---|---|
| Dejar rindiendo en USDT | USD 900 | Es el excedente; el rendimiento es variable, no garantizado |
| Apartar en la alcancía "Impuestos" | USD 120 | 8% del ingreso; cubre el monotributo del día 20 |
| Cambiar a pesos el jueves | USD 380 → 450.300 ARS | Solo lo que vence, a 1.185 ARS por dólar |
| Libre | USD 100 | Para el día a día |

En dólares quedan **USD 1.120**, así que el colchón está cubierto. Si el jueves el dólar empeoró más de 2%, la conversión se retiene y vuelve a preguntar. Si antes del jueves mejora 2% o más, el agente propone adelantarla gastando menos dólares.

## La demo en 50 segundos

| Pantalla | Qué se ve |
|---|---|
| 1 · Reglas | Las reglas de Sofía, editables. El control lo pone la persona, no el modelo. |
| 2 · Plan del ingreso | Entra un pago y aparece la tarjeta con los 3 movimientos y su explicación. |
| 3 · Caso Rojo + aprobación | Sofía pide cambiar USD 1.100 a pesos y el motor lo bloquea, porque le quedarían USD 400 en dólares. Luego aprueba el plan válido y se ven los estados: propuesto → aprobado → ejecutando → completado. |
| 4 · Resumen y MCP Log | Qué se hizo, por qué y con cuánto dinero, y cada tool del MCP con su ID y estado. |

## Arquitectura

![Arquitectura de CFO Agéntico](docs/diagramas/arquitectura.png)

- **Arquitectura hexagonal:** todo acceso a Belo pasa por el puerto `BeloPort`, con dos adaptadores: `MockBeloAdapter` (desde el inicio) y `LiveBeloMCPAdapter` (con el kit oficial). Cambiar de uno a otro no toca la lógica de negocio.
- **El motor de reglas calcula y el juez decide** ejecutar, pedir aprobación o bloquear. El LLM solo redacta.
- **Máquina de estados con idempotencia:** la misma aprobación nunca ejecuta dos veces, y un timeout se reconcilia con `account.activity` en vez de reintentar a ciegas.

Detalle completo en [`docs/arquitectura.md`](docs/arquitectura.md).

### Tools del MCP V1 de Belo

| Tool | Uso | En vivo o simulado |
|---|---|---|
| `auth.sign_in` | Sesión con el $belotag del equipo | En vivo |
| `account.balances` | Saldos y verificación del colchón | En vivo |
| `account.yields` | Rendimiento disponible en USDT | En vivo |
| `account.activity` | Detectar ingresos, evitar duplicados y reconciliar | En vivo |
| `exchange.fx` | Cotización al proponer, cada hora y al ejecutar | En vivo |
| `ramp.fiat_crypto` | Ejecutar USD→USDT y USD→ARS | En vivo, si la V1 lo permite para el par |
| `transaction.approve` | El OK de la persona | En vivo |
| Alcancías y pago de servicios | Apartar impuestos y pagar el alquiler | **SIMULATED** (no están en la V1) |

Los parámetros exactos de cada tool se confirman con el kit del kickoff.

## Stack

| Capa | Tecnología |
|---|---|
| Backend y agente | Python, FastAPI, LangGraph (o máquina de estados en Python puro) |
| Frontend | React + TypeScript |
| Datos | SQLite |
| Integración | MCP V1 de Belo detrás de `BeloPort` |

## Estructura del repositorio

```
cfo-agentico/
├── README.md
├── CONTRIBUTING.md          Cómo trabajamos: ramas, commits y reglas del código
├── .env.example             Variables de entorno (sin secretos)
├── docs/
│   ├── arquitectura.md      Piezas, estados, autonomía, juez y disparadores
│   ├── caso-de-prueba.md    Especificación de punta a punta con Sofía y los 11 casos de seguridad
│   ├── decisiones.md        Decisiones tomadas, pendientes y preguntas para Belo
│   └── diagramas/           Imágenes de la arquitectura, los estados y la autonomía
├── data/
│   └── sofia-demo.json      Datos sintéticos de la demo
├── backend/                 Python + FastAPI (arquitectura hexagonal)
│   ├── app/
│   │   ├── domain/          Motor de reglas, juez, estados y autonomía (sin I/O)
│   │   ├── ports/           BeloPort
│   │   ├── adapters/        MockBeloAdapter y LiveBeloMCPAdapter
│   │   ├── agent/           Grafo del agente y prompts
│   │   ├── api/             Endpoints para el frontend
│   │   └── db/              Esquema SQLite
│   └── tests/               Casos de seguridad T01–T11
└── frontend/                React + TypeScript (las 4 pantallas)
```

Cada carpeta tiene un `README.md` con su responsabilidad y lo que se va a construir ahí.

## Cómo correrlo

> Se completa durante el hackathon. El flujo previsto es:

```bash
cp .env.example .env

# Backend
cd backend
uv sync
uv run pytest                              # los 11 casos de seguridad
uv run uvicorn app.api.main:app --reload

# Frontend
cd ../frontend
npm install
npm run dev
```

Por defecto corre contra el mock (`BELO_ADAPTER=mock`), así que no hace falta acceso al MCP para probarlo.

## Qué es simulado

- **Los datos de Sofía son sintéticos.** El proyecto no usa datos reales de ninguna persona.
- **Las alcancías y el pago de servicios** no están en la V1 del MCP: se ejecutan contra el mock con el badge SIMULATED.
- **Cualquier operación que la V1 no permita** para un par de monedas cae al mock y se marca como SIMULATED. Nunca se finge una operación en vivo.

## Casos de seguridad

Once pruebas escritas antes de la interfaz. Entre otras: el colchón nunca se rompe, un doble clic no ejecuta dos veces, un timeout no duplica la operación, un prompt injection no genera movimientos y la conversión se retiene si el dólar empeora más de 2%. La lista completa está en [`backend/tests/README.md`](backend/tests/README.md).

## Hacia dónde puede crecer

- Cobros entrantes automáticos desde Upwork, Deel o Payoneer.
- Pago real de servicios y monotributo cuando estén disponibles en el MCP.
- Otros corredores, por ejemplo cobrar en reales y pagar en Colombia.
- Un segundo OK familiar para remesas o finanzas compartidas.

## Equipo · Dev IngenierIA

| Integrante | Rol |
|---|---|
| Julia Arizbeth Gómez Gámez | AI Product Builder / UX |
| Cesar David Revelo Apraez | AI/ML y orquestación |
| Vanessa Yareli Hernández Cázares | Backend |
| Juan Carlos Pastas Valencia | Validaciones y datos |
| Brigitte Aponte | Producto, negocio y pitch |
