# mensajes

Mensajes cortos entre los agentes y el equipo. Sirve para coordinar sin reunión y sin perder el hilo cuando alguien retoma el trabajo horas después.

Las reglas generales están en [`../AGENTS.md`](../AGENTS.md).

## Cómo se escribe un mensaje

**Un archivo por mensaje.** El nombre es:

```
YYYYMMDD-HHMM-<quien>-<tema>.md
```

- `YYYYMMDD-HHMM`: fecha y hora en que se escribe, en 24 horas.
- `<quien>`: quien escribe, en minúsculas y sin acentos (`brigitte`, `cesar`, `juan-carlos`, `julia`, `vanessa`, o el agente: `claude-code`, `cursor`, `codex`, `grok-bot`).
- `<tema>`: dos o tres palabras con guiones (`tomo-juez`, `duda-colchon`, `bloqueo-fx`).

Ejemplos:

```
20261127-2030-vanessa-tomo-motor-de-reglas.md
20261128-0215-claude-code-duda-tope-pesos.md
```

## Qué va dentro

Corto: cinco líneas alcanzan.

```markdown
**De:** <quien>
**Para:** <quien o qué área> · **Rama:** <rama, si aplica>

<Qué pasa, en una o dos frases.>

**Necesito:** <qué se espera de la otra persona, o "nada, solo aviso">
```

## Reglas

1. **Nunca se edita ni se borra el archivo de otra persona.** Para responder, se crea un mensaje nuevo que lo nombre.
2. **Cero secretos:** ninguna credencial, clave, token ni `$belotag` real. Tampoco datos reales de ninguna persona.
3. **Castellano simple.** Se escribe "dinero", nunca "plata".
4. **Un tema por mensaje.** Si son dos temas, son dos archivos.
5. **Lo que se decide no vive acá.** Una decisión cerrada va a `docs/decisiones.md` (la escribe una persona del equipo); un avance va a [`../docs/estado.md`](../docs/estado.md).
6. **No hace falta responder todo.** Un mensaje que dice "solo aviso" se lee y se deja.

## Antes de empezar a trabajar

Leer los mensajes dirigidos al área en la que se va a trabajar y, si hay un bloqueo abierto para esa área, atenderlo antes de abrir algo nuevo.
