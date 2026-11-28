# Ruta de trabajo

Qué tecnologías usamos, quién hace qué, en qué rama y en qué orden, desde el kickoff (viernes 27 de noviembre, 17:00 COL) hasta la entrega en HackRadar (domingo 29, 12:00 COL). Son unas 43 horas: cada bloque termina con algo que funciona **en el enlace público** y se puede mostrar.

> **La entrega exige un enlace para probar la aplicación de punta a punta.** Por eso el despliegue no se deja para el final: el viernes por la noche ya debe existir una URL pública, aunque solo muestre un esqueleto, y desde ahí cada merge a `main` se despliega solo.

> Las decisiones marcadas como **propuesta** se votan en los primeros 15 minutos después del kickoff y luego se pasan a [`decisiones.md`](decisiones.md).

---

## 1. Tecnologías

### Backend y agente

| Pieza | Tecnología | Por qué |
|---|---|---|
| Lenguaje | **Python 3.12** | Lo conoce todo el equipo y tiene el SDK oficial del MCP y del LLM |
| Paquetes | **uv** | Instala en segundos y fija versiones en `uv.lock` |
| API | **FastAPI** + **Pydantic v2** | Los modelos de Pydantic son a la vez el contrato del dominio y el de la API; genera OpenAPI solo |
| Base de datos | **SQLite** con **SQLModel** | Cero infraestructura (D9); SQLModel reutiliza los modelos de Pydantic |
| Dinero | **`Decimal`**, nunca `float` | Evita errores de redondeo en montos y cotizaciones |
| Orquestación del agente | **Propuesta: máquina de estados en Python puro** | Ver "Decisiones a votar" |
| Cliente MCP | **SDK oficial `mcp` para Python**, HTTP con OAuth | Para `LiveBeloMCPAdapter` contra `https://b2b.belo.app/mcp`. Hoy Cloudflare lo bloquea con 403; ver "El MCP de Belo" |
| MCP simulado | **Servidor MCP propio con FastMCP** (del mismo SDK `mcp`), en `backend/mcp_simulado/` | Imita las tools reales de Belo con los datos del mock. Lo usa la URL pública. Ver "El MCP de Belo" |
| Tests | **pytest** | Los 12 casos de seguridad corren contra el mock |
| Calidad | **ruff** (lint y formato) | Un solo comando, sin discusiones de estilo |

### LLM

| Pieza | Elección | Detalle |
|---|---|---|
| Proveedor | **Propuesta: Anthropic (Claude)**, SDK `anthropic` para Python | Ver "Decisiones a votar" |
| Modelo | `claude-opus-5-5` | USD 4 por millón de tokens de entrada y USD 20 de salida. Con unas pocas llamadas por plan, el fin de semana cuesta centavos |
| Salidas | **Structured outputs** con `client.messages.parse()` y modelos de Pydantic | Nombrar patrones e interpretar reglas devuelven JSON validado, no texto libre |
| Esfuerzo | `output_config.effort = "low"` para redactar y `"medium"` para interpretar reglas | Respuestas rápidas en la demo |
| Respaldo | `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`) | Si el modelo rechaza una solicitud, la API reintenta con otro modelo sin que la demo se caiga |
| Tools | **Ninguna de escritura** | El LLM recibe datos y devuelve texto o JSON; nunca llama a Belo (regla 3 de [`CONTRIBUTING.md`](../CONTRIBUTING.md)) |

El LLM se usa en cuatro lugares, todos de solo lectura: nombrar los patrones que encuentra el perfilador, interpretar reglas dichas en lenguaje natural, redactar la tarjeta del plan y redactar la solicitud de más autonomía. Si no hay clave o falla la red, cada uno tiene un texto de plantilla para que la demo siga.

### Frontend

| Pieza | Tecnología |
|---|---|
| Base | **React 18 + TypeScript** con **Vite** |
| Estilos | **Tailwind CSS** |
| PWA (D17) | **`vite-plugin-pwa`**: manifest, íconos y service worker. Solo la cáscara en caché; `/api` siempre por red (`NetworkOnly`); `sw.js` sin caché para que cada despliegue llegue a los celulares |
| Cliente de la API | Tipos generados desde el OpenAPI de FastAPI (`openapi-typescript`) y `fetch`, siempre con rutas relativas (`/api/...`) |
| Datos de prueba | Mientras la API no esté lista, las pantallas leen JSON de ejemplo con la misma forma |

### Despliegue (enlace público de punta a punta)

| Pieza | Elección | Por qué |
|---|---|---|
| Forma | **Un solo servicio**: una imagen Docker de varias etapas. Node compila el frontend y FastAPI sirve esos archivos en `/` y la API en `/api` | Una sola URL, sin CORS ni dos despliegues que sincronizar |
| Servidor | **Droplet de DigitalOcean de Cesar** (ya contratado, compartido con otros servicios), con Docker y Docker Compose | Sin costo extra, siempre encendido (no se duerme cuando entra un jurado) y con memoria de sobra (2,9 GB libres) |
| Imagen | **GitHub Actions** construye la imagen con cada merge a `main` y la publica en GitHub Container Registry (`ghcr.io`), etiquetada con el commit | El droplet no compila Node ni Python: solo descarga y arranca, así que basta con poca memoria |
| Despliegue automático | **El servidor trae la imagen solo:** un temporizador de systemd corre `docker compose pull && docker compose up -d` cada 2 minutos y reinicia solo si la imagen cambió | Cada merge a `main` queda en la URL en pocos minutos, y no hay llaves del servidor en GitHub ni entrada por SSH desde Actions |
| Dominio | **<https://cfo.pruebassite.com>**, en el dominio de pruebas de Cesar en Cloudflare | Ya está publicado, con una página provisional |
| HTTPS | **Cloudflare Tunnel** propio (`cfo-agentico`): la app escucha en `127.0.0.1:8095` y el túnel abre la conexión desde adentro. Cloudflare pone el certificado | El servidor no abre los puertos 80 ni 443, así que no cambia la seguridad de los otros servicios |
| ¿Vercel o Firebase para el frontend? | **No hace falta**: el frontend va dentro de la misma imagen y lo sirve FastAPI | Separarlo suma un segundo despliegue, CORS y otra URL que configurar. Si el equipo insiste en separarlo, la mejor opción sería Cloudflare Pages en `app.<dominio>`, porque el dominio ya está ahí |
| Datos | SQLite dentro del contenedor, sembrado al arrancar con `data/sofia-demo.json` e `historial-sofia.json` | Cada despliegue empieza con la Sofía de la demo |
| Varios visitantes | Botón **Reiniciar demo** (`POST /api/demo/reiniciar`) visible en la app | Los jurados comparten la misma instancia; cualquiera puede volver al estado inicial |
| Salud | `GET /api/salud` como healthcheck de Docker Compose | Si algo falla, se vuelve a la imagen anterior fijando su etiqueta (ver [`deploy/README.md`](../deploy/README.md)) |
| Secretos | Un `.env` en el droplet, fuera del repo y con permisos `600`, con `ANTHROPIC_API_KEY` y `BELO_MCP_URL` (que en el droplet apunta al MCP simulado). GitHub no guarda ningún secreto del servidor | Nunca en el repo ([`CONTRIBUTING.md`](../CONTRIBUTING.md), regla 5) |
| Seguridad del enlace público | En la URL pública, **todo lo que mueve dinero corre contra el mock** (SIMULATED). Solo las tools de lectura pueden ir en vivo, y solo si Belo confirma que es seguro | Un enlace abierto no puede aprobar movimientos reales con la cuenta del equipo |
| Seguridad del servidor | Solo SSH abierto. Contenedor aislado: red propia, solo lectura, usuario no root, sin capacidades, 512 MB y 1 CPU como máximo. Solo Cesar entra al servidor | El droplet tiene datos de otros proyectos |
| Respaldo | La demo también corre en local con un comando, y hay un video grabado el sábado | Si el servidor falla durante el pitch |

### El MCP de Belo

Belo publicó el MCP el 27 de noviembre ([guía de conexión](https://app.notion.com/p/belo/belo-para-agentes-c-mo-conectar-el-MCP-hackathon-27-11-424b23cb6b46819cb3b9edbc2057bb49)). Lo que sabemos:

| Tema | Qué dice Belo | Qué significa para nosotros |
|---|---|---|
| Conexión | `https://b2b.belo.app/mcp`, HTTP, OAuth con registro dinámico (sin client ID ni secreto) | El login es interactivo, con la cuenta de Belo de una persona del equipo (Google o código por correo). Requiere identidad verificada y el correo dado de alta para la hackathon |
| Permisos | En el login se elige "Consultar" (marcado) y "Operar" (desmarcado: transferir, convertir y retirar por pix) | Para mover dinero hay que marcar "Operar". Para leer basta "Consultar" |
| Consultas | Saldos, direcciones de depósito, movimientos, contactos y alcancías | Saldos y movimientos alimentan el plan y el perfilador |
| Operaciones | Transferir a otra cuenta de Belo (belotag o correo), a CVU, CBU o alias, o a una dirección cripto; convertir monedas; retirar por pix | **Hay transferencias a terceros**: el alquiler se puede pagar de verdad. **No hay operación para mover a alcancías**: apartar impuestos sigue SIMULATED |
| Aprobación | Dos pasos: el agente pide una cotización y entrega un link de Belo; la persona ve destino, monto y comisión y confirma con un código que llega por correo. El agente se entera solo | La aprobación final de cada movimiento real es de Belo, no de nuestra app (D13). EJECUTANDO significa "esperando la aprobación en Belo" |
| Vencimientos | El link vence a los 15 minutos y la cotización se actualiza sola; al desconectar, el acceso vence en 15 minutos | Si el link vence, se pide otra cotización y el juez vuelve a revisar la banda de FX (RETENIDO) |
| Límites | "Montos chicos"; tope de pedidos de código; 429 si hay mucha gente en la misma red | En vivo se mueve **un solo movimiento de monto chico** |
| Desde servidores | ChatGPT web y Grok no conectan porque "llaman desde sus servidores" | La URL pública no usa el MCP real (D16) |
| Nombres de las tools | La guía no los lista | Se obtienen con `backend/scripts/listar_tools_belo.py` o desde un cliente MCP (ver abajo) |

**Conexión resuelta el 28-nov.** El 403 de Cloudflare era solo en el registro automático del cliente (`/.well-known/...` y el registro dinámico). El servidor OAuth real es `https://bifrost.belo.app` y acepta registrar un cliente a mano. Con ese `client_id`, Claude Code quedó **Connected** y `backend/scripts/listar_tools_belo.py` obtuvo las 18 tools con el SDK oficial de Python, sin saltar ningún bloqueo. Cada persona que quiera conectarse en vivo hace esto una vez:

```powershell
# 1. Registrar un cliente público (una sola vez por persona):
curl.exe -s -X POST https://bifrost.belo.app/oauth/register -H "content-type: application/json" -d '{\"client_name\":\"CFO Agentico\",\"redirect_uris\":[\"http://localhost:33418/callback\"],\"grant_types\":[\"authorization_code\",\"refresh_token\"],\"response_types\":[\"code\"],\"token_endpoint_auth_method\":\"none\"}'
# 2. Claude Code con ese client_id:
claude mcp add --transport http --client-id <client_id> --callback-port 33418 belo https://b2b.belo.app/mcp
# 3. Nuestro cliente en Python (lista las tools; deja los tokens en ~/.cfo-agentico/):
$env:BELO_CLIENT_ID = "<client_id>"; uv run backend/scripts/listar_tools_belo.py
```

El `client_id` no es secreto (el cliente es público y no tiene contraseña), pero los tokens sí: viven en `~/.cfo-agentico/` y nunca entran al repositorio ni al droplet. En el login de Belo se deja marcado solo "Consultar", salvo para el único movimiento real de la demo.

Las capas detrás de `BeloPort` quedan así:

| Capa | Qué es | Para qué sirve | Cómo se elige |
|---|---|---|---|
| 1 · `MockBeloAdapter` | Mock en el mismo proceso, con los datos de Sofía, cotización configurable y modos de fallo | Construir toda la demo, correr los 12 tests y servir la URL pública | `BELO_ADAPTER=mock` (por defecto) |
| 2 · MCP simulado | Servidor MCP propio (FastMCP) que imita las tools reales de Belo con las respuestas del mock, incluido el link de aprobación | Probar `LiveBeloMCPAdapter` hablando MCP de verdad, y mostrar el flujo completo en la URL pública con el sello SIMULATED | `BELO_ADAPTER=live` con `BELO_MCP_URL` apuntando al MCP simulado |
| 3 · MCP de Belo | `https://b2b.belo.app/mcp` | Lecturas en vivo y un movimiento real de monto chico, **solo desde el portátil de quien presenta** | `BELO_ADAPTER=live` con `BELO_MCP_URL=https://b2b.belo.app/mcp`, si Belo habilita nuestro cliente |

Reglas:

- Nadie llama a Belo, ni al MCP simulado, fuera de `BeloPort`.
- Los nombres de las tools y de sus campos se traducen en un solo archivo del adaptador.
- El MCP simulado nunca se presenta como Belo: sus respuestas llevan `live=False` y el sello SIMULATED.
- Los tokens de OAuth viven en `~/.cfo-agentico/`, nunca en el repositorio ni en el droplet.

### El droplet (listo el 27-nov)

Ya está preparado y publicado en **<https://cfo.pruebassite.com>** (por ahora con una página provisional). El detalle está en [`deploy/README.md`](../deploy/README.md):

- Túnel de Cloudflare `cfo-agentico` hacia `127.0.0.1:8095`, con su propio servicio (`cloudflared-cfo`).
- `~/srv/cfo-agentico` con el `docker-compose.yml` y el `.env` (permisos `600`).
- Temporizador `cfo-actualizar` que trae la imagen de `ghcr.io` cada 2 minutos.

Falta que existan `api/esqueleto` y `front/esqueleto`. Con ellos, el workflow publica la primera imagen y Cesar cambia la página provisional por la app (pasos en `deploy/README.md`).

### Decisiones a votar en el kickoff

1. **Máquina de estados en Python puro (recomendado) o LangGraph.** La aprobación de Sofía llega como una petición HTTP minutos después, y el estado de cada movimiento ya vive en SQLite y lo valida `domain/estados.py`. El `interrupt()` y el checkpointer de LangGraph duplicarían eso y suman una curva de aprendizaje en 43 horas. Los nodos se escriben como funciones con los mismos nombres de [`backend/app/agent/README.md`](../backend/app/agent/README.md), así que si sobra tiempo se pueden envolver en LangGraph sin reescribirlos.
2. **Proveedor del LLM: Claude (recomendado).** Structured outputs con Pydantic y respaldo ante rechazos sin código extra. Si alguien del equipo tiene créditos de otro proveedor, se puede cambiar: todo el acceso al LLM queda detrás de una sola función en `agent/llm.py`.
3. **Quién presenta la demo** y desde qué portátil.

---

## 2. Roles, dueños y ramas

El reparto es el de [`AGENTS.md`](../AGENTS.md), sección 4. Cada persona es dueña de carpetas distintas y trabaja con los prefijos de rama de [`CONTRIBUTING.md`](../CONTRIBUTING.md). Cualquiera puede abrir un PR en una carpeta ajena, pero la persona dueña lo revisa.

| Integrante | Área | Es dueño de | Prefijos de rama |
|---|---|---|---|
| **Brigitte** | Producto, negocio, pitch y agentes | `README.md`, `docs/investigacion/`, `AGENTS.md`, `CLAUDE.md`, el guion de la demo, la coordinación entre agentes, el deck, el video y HackRadar | `docs/…` |
| **Cesar** | AI/ML, orquestación, FastAPI y React | `backend/app/agent/`, `backend/app/api/`, `backend/mcp_simulado/`, la integración con `frontend/` y el despliegue (`Dockerfile`, `deploy/`, `.github/workflows/`) | `agent/…`, `api/…`, `adapter/…` (MCP) |
| **Juan Carlos** | Software, IA aplicada, datos y ciberseguridad | `backend/tests/` (T01–T12), `data/`, `backend/app/db/`, la revisión de seguridad y de prompt injection | `domain/…` (tests y datos), `api/…` (persistencia) |
| **Julia** | AI Product Builder y UX | `frontend/src/screens/`, `frontend/src/components/` y los textos que ve la persona | `front/…` |
| **Vanessa** | Backend, fullstack y reglas de negocio | `backend/app/domain/`, `backend/app/ports/`, `backend/app/adapters/` | `domain/…`, `adapter/…` |

> **Cambio del 27-nov:** el equipo confirmó el reparto de `AGENTS.md`. Para equilibrar la carga, Juan Carlos escribe `domain/fx-banda` y `domain/perfilador` (sus tests son T09, T11, T01, T02 y T12) y Cesar escribe `adapter/live-belo` (ya tiene el login OAuth). Vanessa revisa esas tres ramas porque son de sus carpetas.

### Ramas de cada persona

Una rama por tarea, creada desde `main` actualizado justo antes de empezarla, con un PR corto y una revisión. Nadie hace commit directo en `main`. La columna "Revisa" indica quién aprueba el PR.

#### Brigitte · Producto, negocio, pitch y agentes

| Rama | Qué entrega | Bloque | Revisa |
|---|---|---|---|
| `docs/respuestas-mentores` | Respuestas de Belo a las preguntas abiertas de `decisiones.md` (la 1 y de la 6 a la 11), anotadas en el mismo archivo | 0 | Cesar |
| `docs/investigacion-negocio` | `docs/investigacion/negocio.md` y `pitch.md`, con fuentes | 1–2 | Julia |
| `docs/guion-demo` | Texto de cada pantalla de la demo, cronometrado a 50 segundos | 3 | Julia |
| `docs/readme-entrega` | README final: enlace público, cómo probarlo, capturas, cifra real de tests y qué es SIMULATED | 5 | Cesar |

Fuera del repo: deck, video de respaldo, publicaciones de Construye en Público y el formulario de HackRadar.

#### Cesar · AI/ML, orquestación, FastAPI y React

| Rama | Qué entrega | Bloque | Tests | Revisa |
|---|---|---|---|---|
| `api/contrato-ejemplos` | Endpoints con respuestas de ejemplo, para que el frontend arranque (C3) | 1 | — | Julia |
| `api/deploy-digitalocean` | `Dockerfile` de varias etapas (compila el frontend y lo sirve FastAPI), `deploy/docker-compose.yml`, el temporizador y el túnel de `deploy/`, y `.github/workflows/deploy.yml`; la URL pública funcionando | 1 | `/api/salud` responde en la URL | Juan Carlos |
| `adapter/mcp-simulado` | Servidor MCP propio (FastMCP) que imita las tools `belo_*` que usamos ([`belo-mcp/tools.md`](belo-mcp/tools.md)) con las respuestas del mock, incluido `awaiting_approval` | 1 | Prueba de humo: cada tool responde por MCP | Vanessa |
| `agent/llm-cliente` | `agent/llm.py`: cliente de Claude, structured outputs, respaldo ante rechazos y textos de plantilla | 2 | — | Juan Carlos |
| `agent/orquestador-plan` | `load_context → fetch_belo → rules_engine → compose_plan` | 2 | T08 | Vanessa |
| `agent/aprobacion-ejecucion` | `human_approval → execute_and_audit`: OK del plan, cotizar y confirmar en Belo, esperar `success` o `failed` con `belo_get_transaction`, y MCP Log | 3 | T03, T06 (de punta a punta) | Juan Carlos |
| `api/endpoints-reales` | Reglas, planes, aprobar, log, avanzar reloj y `POST /api/demo/reiniciar` | 3 | — | Juan Carlos |
| `front/cliente-api` | Tipos generados del OpenAPI y conexión de las pantallas a la API real | 3 | — | Julia |
| `adapter/live-belo` | `LiveBeloMCPAdapter` contra `https://b2b.belo.app/mcp`: OAuth (reutiliza el login de `listar_tools_belo.py`), lecturas y un movimiento de monto chico | 3 (la conexión ya funciona) | Prueba manual desde el portátil | Vanessa |
| `agent/perfilado` | `profile_patterns`: el LLM nombra los patrones y redacta las reglas propuestas | 4 | T12 (con Juan Carlos) | Juan Carlos |

#### Juan Carlos · Software, IA aplicada, datos y ciberseguridad

| Rama | Qué entrega | Bloque | Tests | Revisa |
|---|---|---|---|---|
| `api/esqueleto` | Proyecto con uv, FastAPI, ruff y pytest; `GET /api/salud` | 0 | — | Cesar |
| `domain/datos-kit` | Ajustar `sofia-demo.json` e `historial-sofia.json` a los campos reales de Belo (montos como texto decimal) | 0 | — | Vanessa |
| `domain/tests-seguridad` | T01–T12 escritos como tests que fallan (`xfail`) sobre C1 y C2 | 1 | T01–T12 | Vanessa |
| `domain/fx-banda` | `fx.py`: retener si empeora más de 2%, proponer adelantar si mejora 2% o más | 2 | T09, T11 | Vanessa |
| `api/persistencia` | `db/`: SQLite con SQLModel para reglas, planes, movimientos y MCP Log | 2 | — | Cesar |
| `domain/perfilador` | Recurrencias en el historial (≥3 repeticiones, ±3 días, CV ≤5%): deben salir 4 patrones | 3 | T01, T02, T12 | Vanessa |
| `domain/revision-seguridad` | Revisión de prompt injection y de que el LLM no reciba tools de escritura; hallazgos en `mensajes/` | 4 | — | Cesar |
| `api/arranque-demo` | Siembra de datos al arrancar y script de un comando para correr en local | 4 | — | Cesar |
| `domain/pruebas-url-publica` | Lista de comprobación y 5 corridas seguidas de la demo en la URL pública | 4 | — | Brigitte |

#### Julia · AI Product Builder y UX

| Rama | Qué entrega | Bloque | Revisa |
|---|---|---|---|
| `front/esqueleto` | Vite, React, TypeScript y Tailwind; navegación de las 4 pantallas | 0 | Cesar |
| `front/pantalla-reglas` | Pantalla 1: reglas de Sofía editables | 1 | Brigitte |
| `front/pantalla-plan` | Pantalla 2: tarjeta del plan con sus 3 movimientos y la explicación | 1 | Brigitte |
| `front/pantalla-aprobacion` | Pantalla 3: Caso Rojo bloqueado, OK del plan y espera de la aprobación en Belo con los 4 estados | 2 | Cesar |
| `front/pantalla-resumen-log` | Pantalla 4: resumen, MCP Log y badge SIMULATED | 3 | Cesar |
| `front/pwa` | PWA (D17): manifest, íconos, service worker sin datos de dinero en caché, pantalla "Sin conexión" que bloquea la aprobación, y prueba de instalación en Android y iPhone | 3 | Cesar |
| `front/reiniciar-demo` | Botón visible de **Reiniciar demo** y aviso de datos sintéticos | 3 | Juan Carlos |
| `front/perfilado` | Reglas propuestas que Sofía confirma o descarta | 4 | Cesar |
| `front/pulido` | Textos, estados de carga, vista en celular y accesibilidad básica | 4 | Brigitte |

#### Vanessa · Backend, fullstack y reglas de negocio

| Rama | Qué entrega | Bloque | Tests | Revisa |
|---|---|---|---|---|
| `domain/modelos` | `Regla`, `Vencimiento`, `Plan`, `Movimiento`, `EstadoMovimiento`, `DecisionJuez` (C1) | 1 | — | Cesar |
| `adapter/belo-port` | Contrato `BeloPort` con las tools reales de [`belo-mcp/tools.md`](belo-mcp/tools.md) más `move_to_pocket` (C2) | 1 | — | Cesar |
| `adapter/mock-belo` | `MockBeloAdapter` con los datos de Sofía, cotización configurable y modos de fallo (timeout, FX fuera de banda, aprobación rechazada) (C2) | 1 | Base de T05 y T09 | Juan Carlos |
| `domain/motor-juez` | Motor (1.500 → 900 / 120 / 380 / 100) y juez (colchón, tope, Caso Rojo) | 2 | T03, T04, T07 | Juan Carlos |
| `domain/estados-idempotencia` | Máquina de estados y clave `plan_id` + paso | 2 | T06 | Juan Carlos |
| `domain/reconciliacion` | Reconciliar un timeout con `belo_get_transaction` y `belo_list_transactions` (máximo 2 reintentos) | 3 | T05 | Juan Carlos |
| `domain/autonomia` | Niveles por categoría, ascenso con evidencia y descenso con un reverso | 3 | T10 | Cesar |

---

## 3. Contratos que se congelan primero

Para trabajar en paralelo desde el viernes, tres contratos se acuerdan antes que cualquier lógica. Después de congelarlos, cambiarlos requiere avisar en el canal del equipo.

| # | Contrato | Dueño | Rama | Hora límite |
|---|---|---|---|---|
| C1 | Modelos del dominio | Vanessa con Cesar | `domain/modelos` | Viernes 20:00 |
| C2 | `BeloPort` y `MockBeloAdapter` con `data/sofia-demo.json` | Vanessa | `adapter/belo-port`, `adapter/mock-belo` | Viernes 21:00 |
| C3 | Endpoints con respuestas de ejemplo (sin lógica todavía) | Cesar | `api/contrato-ejemplos` | Viernes 22:00 |

El anexo A1 de [`caso-de-prueba.md`](caso-de-prueba.md) ya trae un borrador de C2, y la tabla de [`backend/app/api/README.md`](../backend/app/api/README.md) uno de C3 (todas las rutas van bajo `/api`).

---

## 4. Plan por bloques

Horas en hora de Colombia. Cada bloque cierra con un **checkpoint** de 10 minutos: qué funciona **en la URL pública**, qué está bloqueado y qué se recorta.

### Bloque 0 · Viernes 17:00–18:30 · Kickoff y arranque

- **Todos:** escuchar el kickoff, leer el kit del MCP y las bases de entrega, y votar las 3 decisiones de la sección 1.
- **Brigitte:** hacer a los mentores las preguntas abiertas de [`decisiones.md`](decisiones.md). La urgente es la 1: el 403 de Cloudflare a nuestro cliente.
- **Cesar:** el droplet ya está listo en <https://cfo.pruebassite.com> y la lista de tools de Belo en [`belo-mcp/tools.md`](belo-mcp/tools.md). Sigue con `api/contrato-ejemplos` apenas exista `api/esqueleto`.
- **Juan Carlos:** `api/esqueleto` y `domain/datos-kit`. **Julia:** `front/esqueleto`. **Vanessa:** empezar `domain/modelos`.

### Bloque 1 · Viernes 18:30–23:30 · Contratos, esqueleto y URL pública

- **Vanessa:** `domain/modelos` (C1), y `adapter/belo-port` y `adapter/mock-belo` (C2).
- **Cesar:** `api/contrato-ejemplos` (C3) y `api/deploy-digitalocean`: la URL pública muestra el frontend y responde `/api/salud`. Después, `adapter/mcp-simulado`.
- **Juan Carlos:** `domain/tests-seguridad`.
- **Julia:** `front/pantalla-reglas` y `front/pantalla-plan` con los JSON de ejemplo.
- **Brigitte:** primera publicación de Construye en Público y `docs/investigacion-negocio`.

**Checkpoint 23:30:** **la URL pública existe** y muestra las pantallas 1 y 2 con datos de ejemplo; el mock responde y los 12 tests existen (fallando).

### Bloque 2 · Sábado 08:00–13:00 · El núcleo que frena

- **Vanessa:** `domain/motor-juez` y `domain/estados-idempotencia`.
- **Juan Carlos:** `domain/fx-banda` y `api/persistencia`.
- **Cesar:** `agent/llm-cliente` y `agent/orquestador-plan`.
- **Julia:** `front/pantalla-aprobacion`.
- **Brigitte:** borrador del deck con capturas de la URL pública.

**Checkpoint 13:00:** en la URL pública, simular un ingreso devuelve el plan correcto y el Caso Rojo se bloquea. Al menos 8 de 12 tests pasan.

### Bloque 3 · Sábado 14:00–19:00 · De punta a punta

- **Cesar:** `agent/aprobacion-ejecucion`, `api/endpoints-reales`, `front/cliente-api` y `adapter/live-belo`.
- **Vanessa:** `domain/reconciliacion` y `domain/autonomia`.
- **Juan Carlos:** `domain/perfilador`.
- **Julia:** `front/pantalla-resumen-log`, `front/reiniciar-demo` y `front/pwa`.
- **Brigitte:** `docs/guion-demo`.

**Checkpoint 19:00:** **la demo completa corre de punta a punta en la URL pública**, incluido Reiniciar demo. 12 de 12 tests pasan o se sabe exactamente cuáles no.

### Bloque 4 · Sábado 19:00–23:00 · Congelar y ensayar

- **22:00: congelamiento de funciones.** Desde aquí solo se corrigen errores.
- **Cesar + Julia:** `agent/perfilado` y `front/perfilado`, solo si los bloques anteriores están en verde. Julia también `front/pulido`.
- **Juan Carlos:** `domain/revision-seguridad`, `api/arranque-demo` y `domain/pruebas-url-publica`: 5 corridas seguidas en la URL, desde otro computador y desde un celular.
- **Vanessa:** corregir lo que salga de las pruebas en el dominio y los adaptadores.
- **Brigitte + quien presenta:** ensayar el pitch con la URL pública y **grabar el video de respaldo**.

### Bloque 5 · Domingo 08:00–12:00 · Entrega

| Hora | Qué |
|---|---|
| 08:00–09:30 | Correcciones finales. Brigitte: `docs/readme-entrega` |
| 09:30–10:30 | Tres ensayos del pitch con cronómetro |
| 10:30 | Hacer público el repositorio, revisar que no haya secretos y **probar la URL en una ventana de incógnito** |
| **11:00** | **Entregar en HackRadar** con el enlace del repo y el de la app (una hora de margen) |
| 11:00–12:00 | Margen para problemas de carga o de enlaces. No se hacen merges a `main` |

---

## 5. Qué se recorta si no alcanza el tiempo

En este orden, de lo primero que se sacrifica a lo último:

1. Notificaciones push de la PWA (`front/push`, solo si sobra tiempo): se muestra el aviso "llegó tu pago" dentro de la app.
2. `adapter/mcp-simulado`: el mock en proceso alcanza para la demo; solo se pierde mostrar el protocolo MCP de punta a punta.
3. `LiveBeloMCPAdapter` para mover dinero: todo lo que mueve dinero queda en el mock con SIMULATED (en la URL pública es así de todos modos).
4. `LiveBeloMCPAdapter` para leer: la URL pública corre entera contra el mock.
5. Perfilado en la interfaz: se muestra como un paso ya confirmado y el test T12 lo respalda.
6. Autonomía en vivo: queda solo la tarjeta del cierre.
7. **Nunca se recortan:** la URL pública, el plan del ingreso, el Caso Rojo, la aprobación idempotente y el MCP Log. Son lo que se entrega.

## 6. Riesgos y qué hacemos

| Riesgo | Plan |
|---|---|
| El despliegue falla a última hora | La URL existe desde el viernes y cada merge se despliega. Cada imagen queda etiquetada con su commit: volver atrás es cambiar la etiqueta y correr `docker compose up -d` |
| El droplet se cae o se queda sin memoria | Reinicio automático y límite de memoria en Compose; demo local y video de respaldo. Cesar tiene acceso a la consola de DigitalOcean |
| Dos jurados prueban al mismo tiempo | Botón Reiniciar demo y estado inicial sembrado en cada arranque |
| Belo vuelve a bloquear el registro o cambia el OAuth | Todo corre contra el mock y el MCP simulado. Lo en vivo se muestra desde Claude Code o el conector de claude.ai, y lo demás lleva el sello SIMULATED (D10) |
| El link de aprobación vence o el código tarda en la demo | Un solo movimiento real, de monto chico; el resto en el mock |
| El LLM falla o tarda | Textos de plantilla por cada uso del LLM y video de respaldo |
| Dos personas tocan el mismo archivo | Dueños por carpeta, una rama por tarea y PR cortos |
| Se rompe `main` el sábado por la noche | Congelamiento a las 22:00; Cesar revisa cada merge |
| Cansancio | Dormir de 00:00 a 07:30 el viernes y de 23:30 a 07:30 el sábado |

## 7. Cómo nos coordinamos

- **Canal del equipo:** bloqueos y cambios de contrato, apenas aparecen.
- **Checkpoints:** viernes 23:30, sábado 13:00, 19:00 y 22:00, y domingo 09:30. Diez minutos, de pie, mirando la URL pública.
- **Tablero:** un issue de GitHub por rama de la sección 2, con su dueño asignado.
