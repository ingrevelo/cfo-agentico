# Reglas para agentes

Este archivo es el contrato de trabajo para **cualquier agente de IA** que toque este repositorio: Claude Code, Cursor, Codex, Grok Bot o el que venga después. También sirve para las personas del equipo.

Las reglas del proyecto están en [`CONTRIBUTING.md`](CONTRIBUTING.md) y el diseño en [`docs/arquitectura.md`](docs/arquitectura.md). Este archivo no las reemplaza: dice **cómo** un agente debe seguirlas. Si algo acá contradice a `CONTRIBUTING.md`, manda `CONTRIBUTING.md`.

## 1. Antes de escribir una línea

1. Leer `CONTRIBUTING.md`, `docs/arquitectura.md` y `docs/decisiones.md`.
2. Leer `docs/estado.md` para saber quién está en qué y no pisar trabajo ajeno.
3. Revisar `mensajes/` por si hay algo dirigido al área en la que se va a trabajar.
4. Si la tarea toca una decisión que está en **Pendientes** de `docs/decisiones.md`, no decidirla sola: dejar un mensaje en `mensajes/` y esperar a la persona responsable.

## 2. Reglas que no se negocian

Son las de `CONTRIBUTING.md`, escritas como las chequea un agente:

1. **Nunca commitear a `main`.** Siempre una rama con el prefijo del área (`domain/`, `adapter/`, `agent/`, `api/`, `front/`, `docs/`) y un Pull Request corto.
2. **Montos y límites viven en `backend/app/domain/`**, nunca en un prompt ni en el frontend.
3. **Toda llamada a Belo pasa por `BeloPort`.** Nada de llamadas directas desde el agente, la API o el frontend.
4. **El LLM no recibe tools de escritura.** Si una tarea parece pedir eso, está mal entendida: preguntar.
5. **Lo que no corre en vivo se marca SIMULATED.** Nunca fingir una operación real.
6. **Cero secretos.** Ninguna credencial, clave, token ni `$belotag` real en el repositorio ni en un mensaje de commit. Todo va a `.env`, que está en `.gitignore`; lo que se documenta va en `.env.example` con valores vacíos.
7. **Solo datos sintéticos.** Nada de datos reales de ninguna persona, ni propios ni de terceros, ni en código, ni en docs, ni en ejemplos.
8. **Castellano simple.** Se escribe **"dinero"**, nunca "plata". Commits en castellano, en imperativo y con el área al inicio (`docs: agrega…`, `domain: agrega…`).
9. **Archivos cortos, una responsabilidad por módulo.** Los tests del dominio se escriben primero.

## 3. Límites de un agente

Un agente **puede**: leer todo el repositorio, crear ramas, escribir código y documentación en su área, correr los tests, abrir un Pull Request.

Un agente **no debe**, sin un OK explícito de la persona responsable del área:

- Tocar `README.md`, `CONTRIBUTING.md` ni `docs/decisiones.md` (son del equipo, no de un agente).
- Modificar `data/` ni los contratos de `backend/app/ports/` (`BeloPort`).
- Cambiar los montos, el colchón, el tope o la banda de FX definidos en `docs/arquitectura.md`.
- Borrar o reescribir archivos de otra persona, ni mensajes de `mensajes/`.
- Agregar dependencias nuevas o cambiar el stack.
- Hacer `git push --force`, reescribir historia o mergear su propio Pull Request.

Si un agente cree que una de estas cosas hace falta, deja un mensaje en `mensajes/` explicando qué y por qué, y se detiene ahí.

## 4. Quién es quién · Dev IngenierIA

Cinco integrantes, cinco áreas. Un agente trabaja **para** un área y le reporta a su responsable.

| Integrante | Área | Qué le pertenece en el repositorio |
|---|---|---|
| **Brigitte Aponte** | Producto, negocio, pitch y agentes | `README.md`, `docs/investigacion/`, `AGENTS.md`, `CLAUDE.md`, el guion de la demo y la coordinación entre agentes |
| **Cesar David Revelo Apraez** (`@ingrevelo`) | AI/ML, orquestación, FastAPI y React | `backend/app/agent/`, `backend/app/api/`, integración con `frontend/` |
| **Juan Carlos Pastas Valencia** | Software, IA aplicada, datos y ciberseguridad | `backend/tests/` (T01–T12), `data/`, `backend/app/db/`, revisión de seguridad y prompt injection |
| **Julia Arizbeth Gómez Gámez** | AI Product Builder y UX | `frontend/src/screens/`, `frontend/src/components/`, los textos que ve la persona |
| **Vanessa Yareli Hernández Cázares** | Backend, fullstack y reglas de negocio | `backend/app/domain/`, `backend/app/ports/`, `backend/app/adapters/` |

Reglas de convivencia:

- Cada agente se queda en las carpetas de su área. Para tocar otra, pide por `mensajes/`.
- Las revisiones cruzadas las hacen personas: todo Pull Request necesita el OK de alguien que no sea quien lo abrió.
- El dominio es de Vanessa, los tests de Juan Carlos y el producto de Brigitte. Un agente propone; esas personas deciden.

## 5. Las cuatro carpetas de coordinación

### `mensajes/` · hablar entre agentes y personas

Un archivo por mensaje, nunca se edita el de otro. Formato y ejemplos en [`mensajes/README.md`](mensajes/README.md).

Se usa para: avisar que se tomó una tarea, pedir permiso para tocar otra área, dejar un bloqueo, o entregar un resultado que otra área necesita.

### `docs/estado.md` · quién está en qué

Tabla compartida con una fila por integrante: Área, Qué está haciendo, Bloqueos, Próximo paso. Se lee **antes** de empezar y se actualiza **al terminar** cualquier tarea.

Un agente edita solo la fila del área para la que trabaja, en un commit chico y aparte (`docs: actualiza estado de <área>`).

### `docs/investigacion/` · negocio, Belo, MCP y pitch

La investigación de producto y negocio, a cargo de Brigitte. Índice en [`docs/investigacion/README.md`](docs/investigacion/README.md).

Un agente que investiga deja ahí sus hallazgos **con la fuente**, sin inventar datos ni cifras. Si un dato no se pudo verificar, se escribe que no se pudo verificar.

### `docs/bitacora/` · cortes cada 6 horas

Un corte cada 6 horas durante el hackathon: qué se cerró, qué quedó abierto, qué se decidió. Plantilla en [`docs/bitacora/README.md`](docs/bitacora/README.md). Sirve para retomar el hilo y para el pitch del domingo.

## 6. Cómo trabaja un agente, de principio a fin

1. **Lee** `CONTRIBUTING.md`, `docs/arquitectura.md`, `docs/decisiones.md`, `docs/estado.md` y `mensajes/`.
2. **Avisa** en `mensajes/` qué tarea toma y en qué rama.
3. **Rama** desde `main`, con el prefijo de su área.
4. **Tests primero** si la tarea toca el dominio.
5. **Cambios chicos**, archivos cortos, castellano simple.
6. **Corre los tests** y, si algo falla, lo dice; no se desactiva un test para que pase.
7. **Commit** en imperativo con el área al inicio y Pull Request corto usando la plantilla del repositorio.
8. **Actualiza** su fila en `docs/estado.md` y, si corresponde, deja el corte en `docs/bitacora/`.
9. **No mergea.** Espera la revisión de otra persona del equipo.

## 7. Qué reportar siempre

- Si una regla de seguridad del juez no se puede cumplir con el diseño actual.
- Si una tarea exigiría un secreto, un dato real o un `$belotag` para funcionar.
- Si un test de T01–T12 queda en rojo.
- Si el trabajo quedó a medias: se dice qué falta, en `docs/estado.md` y en el Pull Request.

Un agente que no está seguro pregunta en `mensajes/`. Nunca adivina sobre dinero.
