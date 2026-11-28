# Estado

Dónde está cada integrante de Dev IngenierIA. Se lee **antes** de empezar una tarea y se actualiza **al terminarla**.

Cada persona (o el agente que trabaja para su área) edita **solo su fila**, en un commit chico y aparte: `docs: actualiza estado de <área>`. Las reglas están en [`../AGENTS.md`](../AGENTS.md).

**Última actualización:** 2026-11-27, al cerrar la especificación y la estructura del repositorio.

| Integrante | Área | Qué está haciendo | Bloqueos | Próximo paso |
|---|---|---|---|---|
| **Brigitte Aponte** | Producto, negocio, pitch y agentes | Cerró `README.md`, `docs/arquitectura.md`, `docs/decisiones.md` y `docs/caso-de-prueba.md`. Montando la coordinación de agentes (`AGENTS.md`, `mensajes/`, `docs/estado.md`, `docs/bitacora/`) y el índice de `docs/investigacion/` | Faltan los `$belotag` de los 5 integrantes y hacer público el repositorio antes de entregar en HackRadar | Escribir `docs/investigacion/negocio.md` y `docs/investigacion/pitch.md`, y preparar las preguntas para los mentores de Belo |
| **Vanessa Yareli Hernández Cázares** | Backend, fullstack y reglas de negocio | Sin empezar. Le toca el primer paso del orden de trabajo: congelar el contrato de `BeloPort` y el `MockBeloAdapter` con `data/sofia-demo.json` | Ninguno | Congelar `BeloPort` y el `MockBeloAdapter`, y avisar en `mensajes/` cuando el contrato esté fijo |
| **Juan Carlos Pastas Valencia** | Software, IA aplicada, datos y ciberseguridad | Sin empezar. Los 12 casos de seguridad están especificados en `backend/tests/README.md` y `docs/caso-de-prueba.md`, todavía sin código | Espera el contrato de `BeloPort` para escribir los tests contra el mock | Escribir T04 (colchón), T06 (doble clic) y T07 (Caso Rojo) como tests que fallen antes del dominio |
| **Cesar David Revelo Apraez** (`@ingrevelo`) | AI/ML, orquestación, FastAPI y React | Dejó la lista de las 18 tools del MCP de Belo en `docs/belo-mcp/` y alineó la ruta de trabajo con `AGENTS.md` (rama `docs/roles-agents-md`) | Cloudflare responde 403 a nuestro cliente MCP en Python (pregunta 1 a Belo); siguen por votar LangGraph o máquina de estados y el LLM | Preparar el droplet y abrir `api/contrato-ejemplos` (C3) |
| **Julia Arizbeth Gómez Gámez** | AI Product Builder y UX | Sin empezar. Las 4 pantallas están descritas en `README.md` y `docs/caso-de-prueba.md` | Espera los endpoints de la API para datos reales; mientras tanto puede trabajar con `data/sofia-demo.json` | Maquetar la pantalla 1 (Reglas) y la 2 (Plan del ingreso) con los datos sintéticos |

## Cómo se actualiza

- **Qué está haciendo:** una frase, en presente, con la rama si ya existe.
- **Bloqueos:** qué frena el trabajo y de quién depende. Si no hay, se escribe "ninguno".
- **Próximo paso:** una sola cosa, la siguiente. No una lista de deseos.
- Si el bloqueo es para otra persona, además se deja un mensaje en [`../mensajes/`](../mensajes/).
