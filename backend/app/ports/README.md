# ports

Contratos que el dominio usa para hablar con el exterior.

**`BeloPort`** refleja las tools reales del MCP de Belo (`https://b2b.belo.app/mcp`), listadas en [`docs/belo-mcp/tools.md`](../../../docs/belo-mcp/tools.md). Las que usa CFO Agéntico:

| Necesidad del dominio | Tool de Belo |
|---|---|
| Saldos y rendimiento del colchón | `belo_get_balances` |
| Detectar ingresos, perfilar y reconciliar | `belo_list_transactions` |
| Cotizar la conversión USD→USDT o USD→ARS | `belo_preview_swap` |
| Cotizar el pago del alquiler (CBU, CVU o alias) | `belo_preview_transfer` (antes, `belo_get_transfer_networks` si hace falta) |
| Ejecutar lo cotizado | `belo_confirm_swap`, `belo_confirm_transfer` |
| Saber si la persona aprobó en Belo | `belo_get_transaction` (`awaiting_approval` → `success` o `failed`) |
| Consultar alcancías | `belo_list_vaults`, `belo_get_vault` |

Las tools de Pix, contactos y direcciones de depósito no entran en la demo. `move_to_pocket` sigue SIMULATED: el MCP no permite mover dinero a las bóvedas.

Los nombres de las tools y de sus campos se traducen en un solo archivo del adaptador. Los montos viajan como texto decimal y se convierten a `Decimal`. Los pesos argentinos se llaman `ARGt` en Belo (el dominio usa `ARS`): esa traducción también vive en el adaptador.

El contrato propuesto está en el anexo A1 de [`docs/caso-de-prueba.md`](../../../docs/caso-de-prueba.md). Cada resultado de escritura indica si fue `live` o simulado, para mostrar el badge SIMULATED.
