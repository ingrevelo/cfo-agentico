# mcp_simulado

Servidor MCP propio que imita al de Belo (`https://b2b.belo.app/mcp`) con los datos sintéticos de Sofía. Sirve para:

- probar `LiveBeloMCPAdapter` hablando MCP de verdad, sin cuenta real ni el 403 de Cloudflare;
- servir la URL pública con el flujo completo y el sello **SIMULATED** (D16).

Nunca se presenta como Belo: cada respuesta lleva `"simulado": true` y las instrucciones del servidor lo dicen.

## Cómo se usa

Desde `backend/`:

```bash
uv run --with "mcp>=2.3" python -m mcp_simulado              # http://127.0.0.1:8001/mcp
uv run --with "mcp>=2.3" python -m mcp_simulado.prueba_humo  # 17 comprobaciones por HTTP
```

En `.env`: `BELO_ADAPTER=live` y `BELO_MCP_URL=http://127.0.0.1:8001/mcp`. Puerto y host se cambian con `MCP_SIM_PUERTO` y `MCP_SIM_HOST`.

Cuando exista `backend/pyproject.toml` (`api/esqueleto`), `mcp>=2.3` pasa a ser dependencia del proyecto y basta `uv run python -m mcp_simulado`.

## Tools

Mismos nombres y parámetros que las reales ([`docs/belo-mcp/tools.md`](../../docs/belo-mcp/tools.md)), solo las que usa CFO Agéntico:

| Tool | Qué hace en el simulado |
|---|---|
| `belo_get_balances` | USDC, USDT y ARGt (los `USD` y `ARS` de `data/sofia-demo.json` se traducen, D18); USDT rinde 4,5% anual (valor sintético) |
| `belo_list_transactions` | Los 43 movimientos de `data/historial-sofia.json` más lo ejecutado, con `currency`, `from`, `to`, `type`, `page` y `limit` |
| `belo_get_transaction` | Estado: `quoted`, `awaiting_approval`, `success` o `failed` |
| `belo_get_transfer_networks` | Redes sintéticas para ARGt, USDT y USDC |
| `belo_list_vaults`, `belo_get_vault` | La bóveda "Impuestos". Solo lectura, como en Belo |
| `belo_preview_swap` | Pares `USDT/USDC`, `USDC/ARGt` y `USDT/ARGt`, con `BUY` o `SELL`. Vence a los 15 minutos |
| `belo_preview_transfer` | Interna (`BELOTAG`, `EMAIL`, `USER`), a banco (`CVU`, `CBU`, `ALIAS`, solo ARGt) o cripto (`TRON`, `POLYGON`, solo USDT) |
| `belo_confirm_swap`, `belo_confirm_transfer` | Pasa a `awaiting_approval` y genera `approvalUrl` (`simulado://…`). Confirmar dos veces devuelve el mismo estado |

Para la demo y los tests, cuatro tools que Belo no tiene:

| Tool | Para qué |
|---|---|
| `simulado_aprobar` | La persona aprueba o rechaza en Belo (modo `manual`) |
| `simulado_configurar` | Cotización USDC/ARGt (T09, T11), modo de aprobación (`auto`, `manual`, `rechazo`) y fallo (`timeout`, para T05) |
| `simulado_ingreso` | Llega un pago en USDC |
| `simulado_reiniciar` | Vuelve al estado inicial (botón Reiniciar demo) |

El modo `timeout` ejecuta la operación pero devuelve un error, como si se hubiera perdido la respuesta: la reconciliación tiene que encontrarla con `belo_get_transaction`.

## Diferencias con Belo que hay que recordar

- Los pesos argentinos se llaman **`ARGt`**, como en Belo. Los datos de Sofía y el dominio usan `ARS`: el simulado traduce al cargar los datos, y `ARS` en una llamada se rechaza con un mensaje que sugiere `ARGt`. En el adaptador, la traducción vive en un solo archivo.
- La aprobación real llega por notificación en la app de Belo o por un enlace; aquí se simula con `simulado_aprobar`.
- El estado vive en memoria: se pierde al reiniciar el proceso.
