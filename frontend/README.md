# Frontend · CFO Agéntico

React 18 + TypeScript con Vite y Tailwind CSS. Una sola app responsive, mobile-first:
en celular una columna, en escritorio un contenedor centrado.

> **Estado:** el flujo completo funciona de punta a punta con datos sintéticos y **sin backend**.

## Cómo correrlo

```bash
cd frontend
npm install     # la primera vez, o cuando cambien las dependencias
npm run dev     # servidor de desarrollo en http://localhost:5173/
```

```bash
npm test        # los tests del plan, el juez, los estados y la idempotencia
npm run build   # chequea los tipos y compila a frontend/dist/
npm run preview # sirve lo compilado, para verlo como va a quedar
```

No hace falta el backend ni ninguna clave: todo corre contra `MockCfoApi`.

## El flujo

```
Landing → Login demo → Perfilado → Reglas → Plan → Caso Rojo + Aprobación → Resumen y MCP Log
```

| Pantalla | Qué se hace |
|---|---|
| **Landing** | El problema, cómo funciona en 3 pasos y por qué se le puede confiar el dinero |
| **Login demo** | Se elige un perfil: Sofía (freelance) o Nodo Consultora (pyme). Sin correo ni contraseña |
| **Perfilado** | El agente muestra los patrones que encontró. Hasta que se confirman, las reglas no cambian |
| **Reglas** | Las reglas duras y los vencimientos, editables y validados |
| **Plan** | "Simular ingreso" arma el plan del pago con sus 3 movimientos y las reglas verificadas |
| **Caso Rojo + Aprobación** | Se intenta forzar al agente (el motor bloquea) y se aprueba en dos pasos |
| **Resumen** | Qué se hizo, los saldos finales, el MCP Log y "Reiniciar demo" |

**Las dos aprobaciones (D13 y D14).** Primero se aprueba el plan en CFO Agéntico. Después, cada
movimiento real se aprueba otra vez en el link de Belo, con un código. El código de la demo es
**123456**. La alcancía no pasa por Belo: se completa sola y siempre va SIMULATED.

**Controles de demo.** En la pantalla de aprobación hay un panel plegable para el jurado: elegir si
el dólar se mantiene o empeora, inyectar un timeout en la primera conversión y avanzar al día del
vencimiento.

## Qué es simulado

**Todo.** La URL pública no usa el MCP real (D16), así que cada fila del MCP Log tiene `live: false`
y su motivo:

- **Las alcancías:** no se pueden mover desde el MCP, solo consultar. Van SIMULATED siempre, incluso
  con el MCP real.
- **Todo lo demás:** la URL pública no usa el MCP real.

Los datos de los dos perfiles son sintéticos: no son de ninguna persona ni empresa real.

## Arquitectura

La interfaz **nunca** importa un JSON ni calcula dinero: solo habla con la interfaz `CfoApi`.

```
frontend/src/
├── api/
│   ├── tipos.ts            Modelos tipados (los reemplazan los generados del OpenAPI)
│   ├── CfoApi.ts           La interfaz: un método por endpoint
│   ├── index.ts            export const api: CfoApi = new MockCfoApi()  <- ÚNICO punto de cambio
│   └── mock/
│       ├── MockCfoApi.ts   Backend de mentira: estado en memoria, latencia, idempotencia y log
│       ├── dominio.ts      ESPEJO TEMPORAL del backend: plan, juez y estados (funciones puras)
│       ├── registro.ts     El MCP Log en memoria
│       └── *.test.ts       Tests de vitest
├── data/                   Los dos JSON sintéticos, los textos por perfil y el perfilado
├── state/                  useReducer + Context, y el hook useAccion
├── components/             Piezas compartidas
├── screens/                Una carpeta por pantalla
└── formato.ts              El único lugar donde se formatean montos (Intl es-AR)
```

### De cada método de `CfoApi` a su endpoint

| Método | Endpoint real (`backend/app/api/README.md`) |
|---|---|
| `iniciarSesionDemo` | Solo del frontend. En producción: `auth.sign_in` (OAuth de Belo) |
| `obtenerReglas` | `GET /api/reglas` |
| `guardarReglas` | `PUT /api/reglas` |
| `correrPerfilado` | `POST /api/perfilado` |
| `resolverPropuesta` | `POST /api/perfilado/{propuesta_id}/confirmar` |
| `simularIngreso` | `POST /api/ingresos/simular` |
| `obtenerPlan` | `GET /api/planes/{plan_id}` |
| `editarMovimiento` | `PATCH /api/planes/{plan_id}/movimientos/{paso}` |
| `aprobarPlan` | `POST /api/planes/{plan_id}/aprobar` (idempotente) |
| `obtenerEnlaceBelo` | Lo genera el MCP de Belo al pedir una cotización |
| `confirmarEnlaceBelo` | Lo hace Belo con el código por correo; el agente se entera después |
| `avanzarDemo` | `POST /api/demo/avanzar` |
| `configurarDemo` | **No existe todavía:** propuesta para configurar el escenario de FX y el timeout |
| `obtenerLog` | `GET /api/log` |
| `reiniciarDemo` | `POST /api/demo/reiniciar` |

### `dominio.ts` es un espejo temporal

`src/api/mock/dominio.ts` repite las reglas del backend (el motor, el juez y la máquina de estados)
para que la demo funcione sin API. **La fuente de verdad es `backend/app/domain`.** Ese archivo se
borra cuando `front/cliente-api` conecte la API real.

### Para conectar el backend

1. Escribir `src/api/CfoApiHttp.ts` con `fetch('/api/...')`, siguiendo la tabla de arriba.
2. Cambiar una línea en `src/api/index.ts`.
3. Borrar `src/api/mock/` y `src/data/*.json`.

Ninguna pantalla cambia.

## Estética y accesibilidad

| Token | Color | Uso |
|---|---|---|
| `fog` | `#FAFAFA` | Fondo de la página |
| `card` | `#FFFFFF` | Tarjetas |
| `ink` | `#000000` | Texto principal y botón primario |
| `ash` | `#999999` | **Solo decoración:** sobre blanco da 2,8:1 y no pasa WCAG AA |
| `ash-texto` | `#6B6B6B` | Todo texto que haya que leer (alrededor de 5:1) |
| `mint` | `#00FFB2` | Estados completados |
| `violeta` | `#5300DA` | Badge SIMULATED y foco del teclado |

Inter. Títulos en 700, `letter-spacing: -0.04em`. Una sola acción primaria por pantalla: pastilla
negra de 40 px, fija abajo en celular. Cada input con su `label`, errores con `aria-invalid` y
`aria-describedby`, foco visible, y al cambiar de pantalla el foco va al `h1`. Los estados nunca se
distinguen solo por color: todos llevan texto.

Textos en castellano simple y voseo rioplatense. Se escribe "dinero", no "plata". Sin jerga cripto:
"rindiendo", "apartar", "cambiar a pesos". El rendimiento es variable: nunca se promete una tasa.
