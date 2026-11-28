# Frontend · CFO Agéntico

React 18 + TypeScript con Vite y Tailwind CSS. Una sola app responsive, mobile-first,
con el búho CFO como guía.

> **Estado:** el flujo completo funciona de punta a punta con datos sintéticos y **sin backend**.

## Cómo correrlo

```bash
cd frontend
npm install     # la primera vez, o cuando cambien las dependencias
npm run dev     # servidor de desarrollo en http://localhost:5173/
```

```bash
npm test        # 50 tests: el plan, el juez, los estados, la idempotencia y el reducer
npm run build   # chequea los tipos y compila a frontend/dist/
npm run preview # sirve lo compilado
```

No hace falta el backend ni ninguna clave: todo corre contra `MockCfoApi`.

## El flujo: 4 toques hasta el plan aprobado

```
HOME  →  ¿Cómo vas a usar tu CFO?  →  conversación con el búho
 1 Probar la demo    2 Para mí / Para mi empresa    3 Aprobar plan    4 Confirmar en Belo
```

Son **dos aprobaciones distintas** y no se juntan (D13 y D14): la primera es tuya, en
CFO Agéntico; la segunda la pide Belo con un código que en la vida real llega por correo.
En la demo el código viene precargado: **123456**.

Todo lo demás es opcional: el Caso Rojo ("Probar qué pasa si pido de más"), las reglas, el
perfilado, Premium y los controles del jurado viven en la **hoja de ajustes (⚙)**.

| Momento | Qué hace el búho |
|---|---|
| Bienvenida | Saluda y dice cuánto entró |
| Cargando | Muestra las 4 lecturas reales del MCP Log |
| Propuesta | Presenta la tarjeta del plan |
| Caso Rojo | Frena la operación y explica el límite |
| Aprobación | Anota tu OK y pide la confirmación de Belo |
| Ejecutando | Muestra la pista: Propuesto → Aprobado → Ejecutando → Completado |
| Completado | Festeja y abre el detalle del MCP Log |

## El búho: dónde van las imágenes

Las imágenes **no están en el repo**: las guarda Brigitte a mano en `frontend/public/buho/`,
con estos nombres exactos y en minúsculas:

```
frontend/public/buho/buho-sprite.png   la hoja de 12 poses (4 columnas x 3 filas)
frontend/public/buho/buho-hero.png     opcional: el búho con los brazos cruzados, para la home
```

> Ojo con Windows: si tenés oculta la extensión, podés terminar con `buho-sprite.png.png`.
> Activá "Extensiones de nombre de archivo" en la pestaña Vista del Explorador.

**La app funciona sin las imágenes:** muestra un 🦉 en su lugar y el build nunca depende de ellas.

Para revisar que el recorte quede alineado: **http://localhost:5173/?galeria-buho** muestra las
12 poses con su nombre y su celda. Si alguna sale corrida, hay que ajustar `CELDA_RATIO` en
`src/components/buho/poses.ts` con las medidas reales del PNG.

## Qué es simulado y qué es Premium

**Todo está simulado.** La URL pública no usa el MCP real de Belo (D16), así que hay **un solo**
badge SIMULATED, en la barra de arriba, y vale para toda la app. Cada fila del MCP Log lleva
`live: false` con su motivo:

- **Las alcancías:** el MCP solo permite consultarlas, nunca moverlas. Van simuladas siempre,
  incluso con el MCP real.
- **Todo lo demás:** la URL pública no usa el MCP real.

**Premium está solo mostrado, no construido:** autonomía ganada, alertas del dólar según tu regla
(no predice), varias monedas, procesos de pyme, reportes y varios usuarios. El precio es "mensual,
con tope · a definir" y el botón dice "Próximamente". No pide ningún dato.

## Arquitectura

La interfaz **nunca** importa un JSON ni calcula dinero: solo habla con la interfaz `CfoApi`.

```
frontend/src/
├── api/                    (no cambió en esta vuelta)
│   ├── tipos.ts            Modelos tipados
│   ├── CfoApi.ts           La interfaz: un método por endpoint
│   ├── index.ts            export const api: CfoApi = new MockCfoApi()  <- ÚNICO punto de cambio
│   └── mock/               Backend de mentira: MockCfoApi, dominio espejo, registro y tests
├── data/                   Los dos JSON sintéticos, los textos por perfil y el perfilado
├── state/                  reducer (home | modo | asistente), faseDe, useAccion y el cerrojo
├── components/             Buho, barra superior, badges, tabla del log y la hoja de ajustes
└── screens/                Home, Modo y Asistente (con sus piezas en screens/asistente/)
```

### De cada método de `CfoApi` a su endpoint

| Método | Endpoint real (`backend/app/api/README.md`) |
|---|---|
| `iniciarSesionDemo` | Solo del frontend. En producción: `auth.sign_in` (OAuth de Belo) |
| `obtenerReglas` / `guardarReglas` | `GET` / `PUT /api/reglas` |
| `correrPerfilado` | `POST /api/perfilado` |
| `resolverPropuesta` | `POST /api/perfilado/{propuesta_id}/confirmar` |
| `simularIngreso` | `POST /api/ingresos/simular` |
| `obtenerPlan` | `GET /api/planes/{plan_id}` |
| `editarMovimiento` | `PATCH /api/planes/{plan_id}/movimientos/{paso}` |
| `aprobarPlan` | `POST /api/planes/{plan_id}/aprobar` (idempotente) |
| `obtenerEnlaceBelo` / `confirmarEnlaceBelo` | Los genera y valida Belo; falta definirlos en la API |
| `avanzarDemo` | `POST /api/demo/avanzar` |
| `configurarDemo` | **No existe todavía:** propuesta para el escenario de FX y el timeout |
| `obtenerLog` | `GET /api/log` |
| `reiniciarDemo` | `POST /api/demo/reiniciar` |

**Pendiente:** cambiar el monto del ingreso desde la hoja de ajustes necesita un método nuevo.
Está anotado y comentado en `CfoApi.ts`, sin implementar.

### `dominio.ts` es un espejo temporal

`src/api/mock/dominio.ts` repite las reglas del backend (motor, juez y máquina de estados) para que
la demo funcione sin API. **La fuente de verdad es `backend/app/domain`.** Se borra cuando
`front/cliente-api` conecte la API real.

### Para conectar el backend

1. Escribir `src/api/CfoApiHttp.ts` con `fetch('/api/...')`, siguiendo la tabla de arriba.
2. Cambiar una línea en `src/api/index.ts`.
3. Borrar `src/api/mock/` y `src/data/*.json`.

Ninguna pantalla cambia.

## Paleta y por qué

El violeta de **Belo** (`#5300DA`) manda en todo lo interactivo; los colores de la propuesta de
identidad van en superficies, ilustración y estados.

| Token | Color | Uso |
|---|---|---|
| `fondo` | `#F5F3ED` | Calma: fondo de la app |
| `tarjeta` | `#FFFFFF` | Tarjetas |
| `tinta` | `#202127` | Profesionalismo: texto y encabezados |
| `tinta-suave` | `#5F6068` | Texto secundario (6,25:1 sobre blanco) |
| `violeta` | `#5300DA` | Botones, enlaces y foco (blanco encima: 8,8:1) |
| `violeta-medio` | `#6944D4` | Inteligencia: encabezado de la tarjeta del plan |
| `violeta-claro` | `#BBA9F4` | Cercanía: bordes e ilustración. **Nunca texto** |
| `violeta-suave` | `#EDE8FD` | Burbujas, chips y la hoja de ajustes |
| `exito` / `exito-texto` | `#34A87B` / `#1F7A57` | Progreso: el primero solo en rellenos; el segundo es el que se lee |
| `peligro` | `#B3261E` | Bloqueos |
| `aviso-texto` sobre `aviso-suave` | `#7A4E00` / `#FFF1CC` | Retenido y Desconocido |

Todos los pares de texto llegan a 4,5:1 o más (verificado con un script de contraste).

Un solo estilo de botón en toda la app: **primario** = pastilla violeta de 56 px, 17 px semibold;
**secundario** = botón de texto de 48 px. Un solo estilo de tarjeta (blanca, `rounded-3xl`, casi sin
sombra). Espaciado en múltiplos de 8. Inter, títulos 700 con `tracking -0.04em`.

## Layout: el pie siempre se lee

El layout raíz es una columna flex de `min-h-[100dvh]` con el pie en **flujo normal** (nunca
`fixed` ni `absolute`), `main` en `flex-1`, `overflow: visible` en `html`, `body` y `#root`, y
`padding-bottom: max(16px, env(safe-area-inset-bottom))`.

Probado a mano en 360, 768 y 1280 px, y en 360 px con zoom 200%: en los cuatro, el pie se lee
entero, no hay scroll horizontal y ningún botón primario queda cortado.

## Accesibilidad y copy

Foco al `h1` al cambiar de pantalla, `aria-live` en los cambios de estado, `role="alert"` en errores
y bloqueos, labels en todos los inputs, foco visible violeta y `prefers-reduced-motion` respetado en
toda animación. Los estados nunca se distinguen solo por color: todos llevan texto.

Voseo rioplatense y castellano simple. Se escribe "dinero", no "plata". Sin jerga cripto. El
rendimiento es variable: nunca se promete una tasa.

> **Para Julia y Cesar (guion de la demo):** la "pantalla 1 · Reglas" y el "Perfilado" de
> `docs/ruta-de-trabajo.md` ya no son pantallas del flujo: viven en la hoja de ajustes (⚙).
> El recorrido de la demo ahora es home → modo → conversación.
