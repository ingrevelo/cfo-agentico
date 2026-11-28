# Estado

Dónde está cada integrante de Dev IngenierIA. Se lee **antes** de empezar una tarea y se actualiza **al terminarla**.

Cada persona (o el agente que trabaja para su área) edita **solo su fila**, en un commit chico y aparte: `docs: actualiza estado de <área>`. Las reglas están en [`../AGENTS.md`](../AGENTS.md).

**Última actualización:** 2026-11-28 01:00, fila de Cesar.

| Integrante | Área | Qué está haciendo | Bloqueos | Próximo paso |
|---|---|---|---|---|
| **Brigitte Aponte** | Producto, negocio, pitch y agentes | Cerró `README.md`, `docs/arquitectura.md`, `docs/decisiones.md` y `docs/caso-de-prueba.md`. Montando la coordinación de agentes (`AGENTS.md`, `mensajes/`, `docs/estado.md`, `docs/bitacora/`) y el índice de `docs/investigacion/` | Faltan los `$belotag` de los 5 integrantes y hacer público el repositorio antes de entregar en HackRadar | Escribir `docs/investigacion/negocio.md` y `docs/investigacion/pitch.md`, y preparar las preguntas para los mentores de Belo |
| **Vanessa Yareli Hernández Cázares** | Backend, fullstack y reglas de negocio | Sin empezar. Le toca el primer paso del orden de trabajo: congelar el contrato de `BeloPort` y el `MockBeloAdapter` con `data/sofia-demo.json` | Ninguno | Congelar `BeloPort` y el `MockBeloAdapter`, y avisar en `mensajes/` cuando el contrato esté fijo |
| **Juan Carlos Pastas Valencia** | Software, IA aplicada, datos y ciberseguridad | Cerró `api/esqueleto`, `domain/datos-kit`, `domain/tests-seguridad`, `domain/fx-banda`, `api/persistencia`, `domain/perfilador`, `domain/activar-tests-verdes`, `api/arranque-demo`, `domain/revision-seguridad`, `domain/pruebas-url-publica`, y abrió PR #30 (`domain/perfilador-pasamanos`), PR #31 (`domain/qa-seguridad-api`: concurrencia SQLite WAL, red-team, límites API, paridad MCP y rendimiento) y `domain/auditoria-entrega-qa` (auditor pre-entrega y Q&A jurado) | `T02–T05, T07, T10` en `xfail` esperando el dominio de Vanessa; D18 `USDC` en `data/sofia-demo.json` esperando ajuste de `mcp_simulado/estado.py`; `NaN`/`Infinity` reportados en `mensajes/` para `api/` | Activar `T02–T05, T07, T10` y correr auditoría final pre-entrega antes de hacer público el repo |
| **Cesar David Revelo Apraez** (`@ingrevelo`) | AI/ML, orquestación, FastAPI y React | URL pública con despliegue automático (cfo.pruebassite.com, PR 3, 22); conexión real al MCP de Belo y `LiveBeloMCPAdapter` (PR 15, 19); MCP simulado con las respuestas reales (PR 5, 17, 19); cliente del LLM (PR 13); contrato C3 y endpoints reales de reglas, perfilado, log, autonomía y reiniciar (PR 6, 14, 25); frontend conectado a la API (PR 27); D18 (dólares en USDC, PR 21) | El plan del ingreso, aprobar y ejecutar esperan el motor, el juez, la máquina de estados y `BeloPort` (Vanessa, sin empezar). Los pares reales de Belo no se pudieron verificar: la cuenta no tiene saldo | Con el dominio: `agent/orquestador-plan` y pasar plan/aprobar/avanzar de ejemplos a reales. Mientras tanto, el MCP simulado en el droplet |
| **Julia Arizbeth Gómez Gámez** | AI Product Builder y UX | Sin empezar. Las 4 pantallas están descritas en `README.md` y `docs/caso-de-prueba.md` | Espera los endpoints de la API para datos reales; mientras tanto puede trabajar con `data/sofia-demo.json` | Maquetar la pantalla 1 (Reglas) y la 2 (Plan del ingreso) con los datos sintéticos |

## Cómo se actualiza

- **Qué está haciendo:** una frase, en presente, con la rama si ya existe.
- **Bloqueos:** qué frena el trabajo y de quién depende. Si no hay, se escribe "ninguno".
- **Próximo paso:** una sola cosa, la siguiente. No una lista de deseos.
- Si el bloqueo es para otra persona, además se deja un mensaje en [`../mensajes/`](../mensajes/).
