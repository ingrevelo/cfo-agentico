# ports

Contratos que el dominio usa para hablar con el exterior.

**`BeloPort`** refleja las capacidades del MCP de Belo (`https://b2b.belo.app/mcp`): consultar saldos, movimientos, contactos y alcancías; convertir monedas; transferir; y el link de aprobación con código. Suma `move_to_pocket` para las alcancías, que el MCP solo permite consultar.

> Los nombres de los métodos se ajustan a las tools reales cuando tengamos la lista (`docs/belo-mcp/`). Ver la sección "El MCP de Belo" de [`docs/ruta-de-trabajo.md`](../../../docs/ruta-de-trabajo.md).

El contrato propuesto está en el anexo A1 de [`docs/caso-de-prueba.md`](../../../docs/caso-de-prueba.md). Cada resultado de escritura indica si fue `live` o simulado, para mostrar el badge SIMULATED.
