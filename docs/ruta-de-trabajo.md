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
| Cliente MCP | **SDK oficial `mcp` para Python** | Para `LiveBeloMCPAdapter`; el transporte (HTTP o stdio) se confirma con el kit |
| MCP simulado | **Servidor MCP propio con FastMCP** (del mismo SDK `mcp`), en `backend/mcp_simulado/` | Mientras no haya acceso al MCP de Belo, expone las mismas 8 tools con sus nombres y responde con los datos del mock. Ver "Sin acceso al MCP de Belo" |
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
| Cliente de la API | Tipos generados desde el OpenAPI de FastAPI (`openapi-typescript`) y `fetch`, siempre con rutas relativas (`/api/...`) |
| Datos de prueba | Mientras la API no esté lista, las pantallas leen JSON de ejemplo con la misma forma |

### Despliegue (enlace público de punta a punta)

| Pieza | Elección | Por qué |
|---|---|---|
| Forma | **Un solo servicio**: una imagen Docker de varias etapas. Node compila el frontend y FastAPI sirve esos archivos en `/` y la API en `/api` | Una sola URL, sin CORS ni dos despliegues que sincronizar |
| Servidor | **Droplet de DigitalOcean del equipo** (ya contratado), con Docker y Docker Compose | Sin costo extra, siempre encendido (no se duerme cuando entra un jurado) y bajo nuestro control |
| Imagen | **GitHub Actions** construye la imagen con cada merge a `main` y la publica en GitHub Container Registry (`ghcr.io`), etiquetada con el commit | El droplet no compila Node ni Python: solo descarga y arranca, así que basta con poca memoria |
| Despliegue automático | El mismo workflow entra por SSH al droplet, corre `docker compose pull && docker compose up -d` y espera a que `/api/salud` responda | Cada merge a `main` queda en la URL en pocos minutos |
| Dominio | Un subdominio del **dominio de pruebas del equipo en Cloudflare** (por ejemplo `cfo.<dominio>`), con un registro A hacia la IP del droplet | El dominio ya está pagado y el DNS de Cloudflare se propaga en minutos |
| HTTPS | **Caddy** como proxy inverso delante de la app, con certificado automático de Let's Encrypt. El registro en Cloudflare empieza en **"DNS only"** (nube gris) para que Caddy obtenga el certificado; después se puede activar el proxy de Cloudflare (nube naranja) con SSL en **"Full (strict)"** | Así no hay redirecciones en bucle ni certificados rechazados |
| ¿Vercel o Firebase para el frontend? | **No hace falta**: el frontend va dentro de la misma imagen y lo sirve FastAPI | Separarlo suma un segundo despliegue, CORS y otra URL que configurar. Si el equipo insiste en separarlo, la mejor opción sería Cloudflare Pages en `app.<dominio>`, porque el dominio ya está ahí |
| Datos | SQLite dentro del contenedor, sembrado al arrancar con `data/sofia-demo.json` e `historial-sofia.json` | Cada despliegue empieza con la Sofía de la demo |
| Varios visitantes | Botón **Reiniciar demo** (`POST /api/demo/reiniciar`) visible en la app | Los jurados comparten la misma instancia; cualquiera puede volver al estado inicial |
| Salud | `GET /api/salud` como healthcheck de Docker Compose y como último paso del workflow | Si la versión nueva no responde, el workflow falla y se vuelve a la imagen anterior |
| Secretos | Un `.env` en el droplet, fuera del repo y con permisos `600`, con `ANTHROPIC_API_KEY`, `BELO_MCP_URL` y `BELO_BELOTAG`. En GitHub Secrets solo van `DO_HOST`, `DO_USER` y `DO_SSH_KEY` | Nunca en el repo ([`CONTRIBUTING.md`](../CONTRIBUTING.md), regla 5) |
| Seguridad del enlace público | En la URL pública, **todo lo que mueve dinero corre contra el mock** (SIMULATED). Solo las tools de lectura pueden ir en vivo, y solo si Belo confirma que es seguro | Un enlace abierto no puede aprobar movimientos reales con la cuenta del equipo |
| Seguridad del servidor | Usuario `deploy` sin privilegios de root (solo Docker), una llave SSH exclusiva para GitHub Actions y firewall abierto solo en 22, 80 y 443. Límite de memoria y `restart: unless-stopped` en Compose | El droplet es nuestro: la llave del workflow solo sirve para desplegar |
| Respaldo | La demo también corre en local con un comando, y hay un video grabado el sábado | Si el servidor falla durante el pitch |

### Sin acceso al MCP de Belo

Todavía no tenemos acceso al MCP de Belo. No es un bloqueo: todo acceso a Belo pasa por `BeloPort`, así que el dominio, el agente, la API y el frontend no saben qué hay del otro lado. Trabajamos en tres capas:

| Capa | Qué es | Para qué sirve | Cómo se elige |
|---|---|---|---|
| 1 · `MockBeloAdapter` | Mock en el mismo proceso, con los datos de Sofía, cotización configurable y modos de fallo | Construir toda la demo, correr los 12 tests y servir la URL pública | `BELO_ADAPTER=mock` (por defecto) |
| 2 · MCP simulado | Servidor MCP propio (FastMCP) con las 8 tools de la V1, mismos nombres y las respuestas del mock | Escribir y probar `LiveBeloMCPAdapter` desde hoy, hablando el protocolo MCP de verdad, y mostrar al jurado el flujo MCP completo con el sello SIMULATED | `BELO_ADAPTER=live` con `BELO_MCP_URL` apuntando al MCP simulado |
| 3 · MCP de Belo | El MCP V1 real | Las tools de lectura en vivo, cuando llegue el acceso | `BELO_ADAPTER=live` con `BELO_MCP_URL` de Belo |

Reglas para que el cambio a Belo sea de horas y no de días:

- Los nombres de las tools salen de la página pública de Belo (belo.app/agentic). Los parámetros y los nombres de campos se traducen en un solo archivo del adaptador.
- Nadie llama a Belo, ni al MCP simulado, fuera de `BeloPort`.
- El MCP simulado nunca se presenta como Belo: sus respuestas llevan `live=False` y el sello SIMULATED.
- No esperamos el acceso para empezar nada.

### Preparar el droplet (Cesar, idealmente antes del kickoff)

1. Confirmar sistema operativo y memoria (1 GB alcanza, porque el droplet no compila) y si ya corre otros servicios en los puertos 80 o 443. Si ya hay un proxy (Nginx, Caddy, Traefik), se agrega un bloque para la app en lugar de instalar Caddy.
2. Instalar Docker y el plugin de Compose.
3. Crear el usuario `deploy` en el grupo `docker`, con una llave SSH nueva solo para GitHub Actions.
4. Abrir solo los puertos 22, 80 y 443 en el firewall.
5. En Cloudflare, crear el registro A del subdominio (por ejemplo `cfo`) hacia la IP del droplet, en modo "DNS only".
6. Crear `/opt/cfo-agentico/.env` con los secretos (permisos `600`) y cargar `DO_HOST`, `DO_USER` y `DO_SSH_KEY` en los Secrets del repositorio.

Desde ahí, Juan Carlos sube los archivos de despliegue en `api/deploy-digitalocean` y el primer merge publica la URL.

### Decisiones a votar en el kickoff

1. **Máquina de estados en Python puro (recomendado) o LangGraph.** La aprobación de Sofía llega como una petición HTTP minutos después, y el estado de cada movimiento ya vive en SQLite y lo valida `domain/estados.py`. El `interrupt()` y el checkpointer de LangGraph duplicarían eso y suman una curva de aprendizaje en 43 horas. Los nodos se escriben como funciones con los mismos nombres de [`backend/app/agent/README.md`](../backend/app/agent/README.md), así que si sobra tiempo se pueden envolver en LangGraph sin reescribirlos.
2. **Proveedor del LLM: Claude (recomendado).** Structured outputs con Pydantic y respaldo ante rechazos sin código extra. Si alguien del equipo tiene créditos de otro proveedor, se puede cambiar: todo el acceso al LLM queda detrás de una sola función en `agent/llm.py`.
3. **Nombre del subdominio** en el dominio de pruebas de Cloudflare (por ejemplo `cfo.<dominio>`).
4. **Quién presenta la demo** y desde qué portátil.

---

## 2. Roles, dueños y ramas

Cada persona es dueña de carpetas distintas y trabaja con los prefijos de rama de [`CONTRIBUTING.md`](../CONTRIBUTING.md). Los demás pueden abrir PR en carpetas ajenas, pero el dueño revisa.

| Integrante | Rol | Es dueño de | Prefijos de rama |
|---|---|---|---|
| **Cesar** | AI/ML y orquestación | `ports/`, `adapters/`, `agent/`, `mcp_simulado/` | `adapter/…`, `agent/…` |
| **Juan Carlos** | Backend y despliegue | `domain/modelos.py`, `motor.py`, `juez.py`, `estados.py`, `autonomia.py`, `db/`, `api/`, `Dockerfile`, `deploy/`, `.github/workflows/` | `domain/…`, `api/…` |
| **Vanessa** | Validaciones y datos | `domain/fx.py`, `domain/perfilador.py`, `tests/`, `data/` | `domain/…` |
| **Brigitte** | Frontend | `frontend/` | `front/…` |
| **Julia** | Producto, documentación y pitch | `README.md`, `docs/`, deck, video y HackRadar | `docs/…` |

> **Ajustes respecto al Notion:** Juan Carlos toma el backend y Vanessa las validaciones y los datos; Brigitte construye el frontend (antes lo tenía Cesar) y Julia toma la documentación, el pitch y la entrega. Cesar se concentra en el MCP y el agente, que son el camino crítico, y conecta el cliente de la API a las pantallas.

### Ramas de cada persona

Una rama por tarea, creada desde `main` actualizado justo antes de empezarla, con un PR corto y una revisión. La columna "Revisa" indica quién aprueba el PR.

#### Cesar · AI/ML y orquestación

| Rama | Qué entrega | Bloque | Tests | Revisa |
|---|---|---|---|---|
| `adapter/belo-port` | Contrato `BeloPort` (las 7 tools de la V1 más `move_to_pocket`) | 1 | — | Juan Carlos |
| `adapter/mock-belo` | `MockBeloAdapter` con los datos de Sofía, cotización configurable y modos de fallo (timeout, FX fuera de banda) | 1 | Base de T05 y T09 | Vanessa |
| `adapter/mcp-simulado` | Servidor MCP propio con las 8 tools de la V1 (mismos nombres, respuestas del mock) y una primera versión de `LiveBeloMCPAdapter` que se conecta a él | 1 | Prueba de humo: cada tool responde por MCP | Juan Carlos |
| `agent/llm-cliente` | `agent/llm.py`: cliente de Claude, structured outputs, respaldo ante rechazos y textos de plantilla | 2 | — | Juan Carlos |
| `agent/orquestador-plan` | `load_context → fetch_belo → rules_engine → compose_plan` | 2 | T08 | Juan Carlos |
| `agent/aprobacion-ejecucion` | `human_approval → execute_and_audit` con `transaction.approve` y MCP Log | 3 | T03, T06 (de punta a punta) | Juan Carlos |
| `adapter/live-belo-lectura` | Apuntar `LiveBeloMCPAdapter` al MCP real de Belo: URL, autenticación y nombres de campos de `auth.sign_in`, `account.*` y `exchange.fx` | 3, o apenas llegue el acceso | Prueba manual contra el kit | Vanessa |
| `front/cliente-api` | Tipos generados del OpenAPI y conexión de las pantallas a la API real | 3 | — | Brigitte |
| `agent/perfilado` | `profile_patterns`: el LLM nombra los patrones y redacta las reglas propuestas | 4 | T12 (con Vanessa) | Vanessa |

#### Juan Carlos · Backend y despliegue

| Rama | Qué entrega | Bloque | Tests | Revisa |
|---|---|---|---|---|
| `api/esqueleto` | Proyecto con uv, FastAPI, ruff y pytest; `GET /api/salud` | 0 | — | Cesar |
| `api/deploy-digitalocean` | `Dockerfile` de varias etapas (compila el frontend y lo sirve FastAPI), `deploy/docker-compose.yml`, `deploy/Caddyfile` y `.github/workflows/deploy.yml`; la URL pública funcionando | 1 | `/api/salud` responde en la URL | Cesar |
| `domain/modelos` | `Regla`, `Vencimiento`, `Plan`, `Movimiento`, `EstadoMovimiento`, `DecisionJuez` | 1 | — | Cesar |
| `api/contrato-ejemplos` | Endpoints con respuestas de ejemplo, para que el frontend arranque | 1 | — | Brigitte |
| `domain/motor-juez` | Motor (1.500 → 900 / 120 / 380 / 100) y juez (colchón, tope, Caso Rojo) | 2 | T03, T04, T07 | Vanessa |
| `domain/estados-idempotencia` | Máquina de estados y clave `plan_id` + paso | 2 | T06 | Vanessa |
| `api/endpoints-reales` | Reglas, planes, aprobar, log, avanzar reloj y `POST /api/demo/reiniciar` | 3 | — | Cesar |
| `domain/autonomia` | Niveles por categoría, ascenso con evidencia y descenso con un reverso | 3 | T10 | Vanessa |
| `api/arranque-demo` | Siembra de datos al arrancar y script de un comando para correr en local | 4 | — | Cesar |

#### Vanessa · Validaciones y datos

| Rama | Qué entrega | Bloque | Tests | Revisa |
|---|---|---|---|---|
| `domain/datos-kit` | Ajustar `sofia-demo.json` e `historial-sofia.json` a los campos reales del kit | 0 | — | Cesar |
| `domain/tests-seguridad` | T01–T12 escritos como tests que fallan (`xfail`) sobre C1 y C2 | 1 | T01–T12 | Juan Carlos |
| `domain/fx-banda` | `fx.py`: retener si empeora más de 2%, proponer adelantar si mejora 2% o más | 2 | T09, T11 | Juan Carlos |
| `domain/reconciliacion` | Reconciliar un timeout con `account.activity` (máximo 2 reintentos) | 2 | T05 | Cesar |
| `domain/perfilador` | Recurrencias en el historial (≥3 repeticiones, ±3 días, CV ≤5%): deben salir 4 patrones | 3 | T01, T02, T12 | Cesar |
| `domain/pruebas-url-publica` | Lista de comprobación y 5 corridas seguidas de la demo en la URL pública | 4 | — | Juan Carlos |

#### Brigitte · Frontend

| Rama | Qué entrega | Bloque | Revisa |
|---|---|---|---|
| `front/esqueleto` | Vite, React, TypeScript y Tailwind; navegación de las 4 pantallas | 0 | Cesar |
| `front/pantalla-reglas` | Pantalla 1: reglas de Sofía editables | 1 | Julia |
| `front/pantalla-plan` | Pantalla 2: tarjeta del plan con sus 3 movimientos y la explicación | 1 | Julia |
| `front/pantalla-aprobacion` | Pantalla 3: Caso Rojo bloqueado y aprobación con los 4 estados | 2 | Cesar |
| `front/pantalla-resumen-log` | Pantalla 4: resumen, MCP Log y badge SIMULATED | 3 | Cesar |
| `front/reiniciar-demo` | Botón visible de **Reiniciar demo** y aviso de datos sintéticos | 3 | Juan Carlos |
| `front/perfilado` | Reglas propuestas que Sofía confirma o descarta | 4 | Cesar |
| `front/pulido` | Textos, estados de carga, vista en celular y accesibilidad básica | 4 | Julia |

#### Julia · Producto, documentación y pitch

| Rama | Qué entrega | Bloque | Revisa |
|---|---|---|---|
| `docs/respuestas-mentores` | Respuestas de Belo a las preguntas de `decisiones.md` (ahora 11), anotadas en el mismo archivo | 0 | Cesar |
| `docs/guion-demo` | Texto de cada pantalla de la demo, cronometrado a 50 segundos | 3 | Brigitte |
| `docs/readme-entrega` | README final: enlace público, cómo probarlo, capturas, cifra real de tests y qué es SIMULATED | 5 | Cesar |

Fuera del repo: deck, video de respaldo, publicaciones de Construye en Público y el formulario de HackRadar.

---

## 3. Contratos que se congelan primero

Para trabajar en paralelo desde el viernes, tres contratos se acuerdan antes que cualquier lógica. Después de congelarlos, cambiarlos requiere avisar en el canal del equipo.

| # | Contrato | Dueño | Rama | Hora límite |
|---|---|---|---|---|
| C1 | Modelos del dominio | Juan Carlos con Cesar | `domain/modelos` | Viernes 20:00 |
| C2 | `BeloPort` y `MockBeloAdapter` con `data/sofia-demo.json` | Cesar | `adapter/belo-port`, `adapter/mock-belo` | Viernes 21:00 |
| C3 | Endpoints con respuestas de ejemplo (sin lógica todavía) | Juan Carlos | `api/contrato-ejemplos` | Viernes 22:00 |

El anexo A1 de [`caso-de-prueba.md`](caso-de-prueba.md) ya trae un borrador de C2, y la tabla de [`backend/app/api/README.md`](../backend/app/api/README.md) uno de C3 (todas las rutas van bajo `/api`).

---

## 4. Plan por bloques

Horas en hora de Colombia. Cada bloque cierra con un **checkpoint** de 10 minutos: qué funciona **en la URL pública**, qué está bloqueado y qué se recorta.

### Bloque 0 · Viernes 17:00–18:30 · Kickoff y arranque

- **Todos:** escuchar el kickoff, leer el kit del MCP y las bases de entrega, y votar las 4 decisiones de la sección 1.
- **Julia:** hacer las 11 preguntas a los mentores de [`decisiones.md`](decisiones.md). Las primeras son las del acceso al MCP: cuándo llega, si hay sandbox, qué transporte usa y si pueden compartir respuestas de ejemplo.
- **Cesar:** probar `auth.sign_in` y `account.balances` con el kit. Si no quedó listo antes del kickoff, preparar el droplet (ver "Preparar el droplet").
- **Juan Carlos:** `api/esqueleto`. **Brigitte:** `front/esqueleto`. **Vanessa:** `domain/datos-kit`.

### Bloque 1 · Viernes 18:30–23:30 · Contratos, esqueleto y URL pública

- **Juan Carlos:** `domain/modelos` y `api/contrato-ejemplos` (C1 y C3), y `api/deploy-digitalocean`: la URL pública muestra el frontend y responde `/api/salud`.
- **Cesar:** `adapter/belo-port` y `adapter/mock-belo` (C2), y después `adapter/mcp-simulado`.
- **Vanessa:** `domain/tests-seguridad`.
- **Brigitte:** `front/pantalla-reglas` y `front/pantalla-plan` con los JSON de ejemplo.
- **Julia:** primera publicación de Construye en Público.

**Checkpoint 23:30:** **la URL pública existe** y muestra las pantallas 1 y 2 con datos de ejemplo; el mock responde y los 12 tests existen (fallando).

### Bloque 2 · Sábado 08:00–13:00 · El núcleo que frena

- **Juan Carlos:** `domain/motor-juez` y `domain/estados-idempotencia`.
- **Vanessa:** `domain/fx-banda` y `domain/reconciliacion`.
- **Cesar:** `agent/llm-cliente` y `agent/orquestador-plan`.
- **Brigitte:** `front/pantalla-aprobacion`.
- **Julia:** borrador del deck con capturas de la URL pública.

**Checkpoint 13:00:** en la URL pública, simular un ingreso devuelve el plan correcto y el Caso Rojo se bloquea. Al menos 8 de 12 tests pasan.

### Bloque 3 · Sábado 14:00–19:00 · De punta a punta

- **Cesar:** `agent/aprobacion-ejecucion`, `front/cliente-api` y `adapter/live-belo-lectura`.
- **Juan Carlos:** `api/endpoints-reales` y `domain/autonomia`.
- **Vanessa:** `domain/perfilador`.
- **Brigitte:** `front/pantalla-resumen-log` y `front/reiniciar-demo`.
- **Julia:** `docs/guion-demo`.

**Checkpoint 19:00:** **la demo completa corre de punta a punta en la URL pública**, incluido Reiniciar demo. 12 de 12 tests pasan o se sabe exactamente cuáles no.

### Bloque 4 · Sábado 19:00–23:00 · Congelar y ensayar

- **22:00: congelamiento de funciones.** Desde aquí solo se corrigen errores.
- **Cesar + Brigitte:** `agent/perfilado` y `front/perfilado`, solo si los bloques anteriores están en verde. Brigitte también `front/pulido`.
- **Vanessa:** `domain/pruebas-url-publica`: 5 corridas seguidas en la URL, desde otro computador y desde un celular.
- **Juan Carlos:** `api/arranque-demo`.
- **Julia + quien presenta:** ensayar el pitch con la URL pública y **grabar el video de respaldo**.

### Bloque 5 · Domingo 08:00–12:00 · Entrega

| Hora | Qué |
|---|---|
| 08:00–09:30 | Correcciones finales. Julia: `docs/readme-entrega` |
| 09:30–10:30 | Tres ensayos del pitch con cronómetro |
| 10:30 | Hacer público el repositorio, revisar que no haya secretos y **probar la URL en una ventana de incógnito** |
| **11:00** | **Entregar en HackRadar** con el enlace del repo y el de la app (una hora de margen) |
| 11:00–12:00 | Margen para problemas de carga o de enlaces. No se hacen merges a `main` |

---

## 5. Qué se recorta si no alcanza el tiempo

En este orden, de lo primero que se sacrifica a lo último:

1. `adapter/mcp-simulado`: el mock en proceso alcanza para la demo; solo se pierde mostrar el protocolo MCP de punta a punta.
2. `LiveBeloMCPAdapter` para escribir: todo lo que mueve dinero queda en el mock con SIMULATED (en la URL pública es así de todos modos).
3. `LiveBeloMCPAdapter` para leer: la URL pública corre entera contra el mock.
4. Perfilado en la interfaz: se muestra como un paso ya confirmado y el test T12 lo respalda.
5. Autonomía en vivo: queda solo la tarjeta del cierre.
6. **Nunca se recortan:** la URL pública, el plan del ingreso, el Caso Rojo, la aprobación idempotente y el MCP Log. Son lo que se entrega.

## 6. Riesgos y qué hacemos

| Riesgo | Plan |
|---|---|
| El despliegue falla a última hora | La URL existe desde el viernes y cada merge se despliega. Cada imagen queda etiquetada con su commit: volver atrás es cambiar la etiqueta y correr `docker compose up -d` |
| El droplet se cae o se queda sin memoria | Reinicio automático y límite de memoria en Compose; demo local y video de respaldo. Cesar tiene acceso a la consola de DigitalOcean |
| Dos jurados prueban al mismo tiempo | Botón Reiniciar demo y estado inicial sembrado en cada arranque |
| El acceso al MCP de Belo llega tarde o no llega | Todo corre contra el mock desde el inicio y el cliente MCP ya está probado contra nuestro MCP simulado. Si el acceso nunca llega, lo que no corre en vivo lleva el sello SIMULATED (D10) |
| El LLM falla o tarda | Textos de plantilla por cada uso del LLM y video de respaldo |
| Dos personas tocan el mismo archivo | Dueños por carpeta, una rama por tarea y PR cortos |
| Se rompe `main` el sábado por la noche | Congelamiento a las 22:00; Cesar revisa cada merge |
| Cansancio | Dormir de 00:00 a 07:30 el viernes y de 23:30 a 07:30 el sábado |

## 7. Cómo nos coordinamos

- **Canal del equipo:** bloqueos y cambios de contrato, apenas aparecen.
- **Checkpoints:** viernes 23:30, sábado 13:00, 19:00 y 22:00, y domingo 09:30. Diez minutos, de pie, mirando la URL pública.
- **Tablero:** un issue de GitHub por rama de la sección 2, con su dueño asignado.
