# Cómo trabajamos

Guía corta para que los cinco integrantes de Dev IngenierIA trabajemos en paralelo sin pisarnos durante el fin de semana.

## Ramas

- `main` siempre debe funcionar. No se sube código directo a `main`.
- Una rama por tarea, con el prefijo de su área:
  - `domain/…` para el motor de reglas, el juez, los estados y la autonomía
  - `adapter/…` para `BeloPort` y los adaptadores
  - `agent/…` para el grafo y los prompts
  - `api/…` para los endpoints
  - `front/…` para las pantallas
  - `docs/…` para el README y la documentación
- Pull request corto, con al menos una revisión de otra persona del equipo.

## Commits

Mensajes en castellano, en imperativo y con el área al inicio:

```
domain: agrega chequeo de colchón al juez
front: muestra el badge SIMULATED en el MCP Log
```

## Reglas del código

1. **Los montos y límites viven en `backend/app/domain/`**, nunca en un prompt.
2. **Toda llamada a Belo pasa por `BeloPort`.** Nada de llamadas directas desde el agente, la API o el frontend.
3. **El LLM no recibe tools de escritura.**
4. **Lo que no corra en vivo se marca como SIMULATED.**
5. **Nada de secretos en el repositorio:** credenciales y claves van en `.env`, que está en `.gitignore`.
6. **Datos sintéticos únicamente.** No se usan datos reales de ninguna persona.
7. **Textos en castellano simple.** Se escribe "dinero", no "plata".
8. **Archivos cortos y una responsabilidad por módulo.** Los tests del dominio se escriben primero.

## Orden sugerido de trabajo

1. Congelar el contrato de `BeloPort` y el `MockBeloAdapter` con los datos de `data/sofia-demo.json`.
2. Motor de reglas, juez y máquina de estados, con los tests T01–T11.
3. Grafo del agente y prompts.
4. API y las 4 pantallas.
5. Cambiar a `LiveBeloMCPAdapter` cuando llegue el kit, sin tocar el dominio.
6. Congelar funciones el sábado por la noche; el domingo solo correcciones, README y ensayo.
