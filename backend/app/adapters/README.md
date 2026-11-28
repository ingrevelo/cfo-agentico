# adapters

| Adaptador | Cuándo se usa | Qué hace |
|---|---|---|
| `MockBeloAdapter` | Desde el inicio y en los tests | Imita a Belo en el mismo proceso con los datos de Sofía, cotización configurable y modos de fallo (timeout y FX fuera de banda) |
| `LiveBeloMCPAdapter` ([`live_belo/`](live_belo/)) | `BELO_ADAPTER=live` | Habla MCP con Belo: el real (`https://b2b.belo.app/mcp`) o el MCP simulado (`http://127.0.0.1:8001/mcp`), según `BELO_MCP_URL` |

Se elige con `BELO_ADAPTER=mock|live`. Cambiar de adaptador no debe tocar `domain`, `agent` ni `api`.

## `live_belo/`

| Archivo | Qué hace |
|---|---|
| `cliente.py` | `LiveBeloMCPAdapter`: abre la sesión MCP (`async with`), llama a las tools y devuelve modelos del dominio |
| `traduccion.py` | **El único archivo que conoce los campos y monedas de Belo** (`ARGt` ↔ `ARS`, `currencyCode`, `receipt`, `approval`…), según los `outputSchema` reales de [`docs/belo-mcp/tools.json`](../../../docs/belo-mcp/tools.json) |
| `modelos.py` | `Saldo`, `Movimiento`, `Pagina`, `Cotizacion`, `EstadoTransaccion`, `Red` y `Boveda`, con `Decimal` y `live` |
| `oauth.py` | Reutiliza la sesión guardada en `~/.cfo-agentico/belo-oauth.json` y la renueva. Nunca abre un navegador: si no hay sesión, lanza `SinSesionBelo` |

```python
async with LiveBeloMCPAdapter() as belo:  # usa BELO_MCP_URL
    saldos = await belo.saldos()
    c = await belo.cotizar_conversion("USD/ARS", Decimal("450000"), "ARS", "SELL")
    r = await belo.confirmar_conversion(c.id)  # awaiting_approval hasta que la persona apruebe
    r = await belo.transaccion(c.id)  # success o failed
```

Reglas:

- **Mover dinero real** exige `BELO_PERMITIR_MOVER=1`. La URL pública nunca la tiene (D16).
- **Al confirmar**, cualquier fallo lanza `ErrorBelo(desconocido=True)`: no se sabe si el dinero se movió. Se reconcilia con `transaccion()` y nunca se reintenta a ciegas (T05). Repetir una confirmación es seguro en Belo: devuelve la respuesta original.
- **`live`** viene de la respuesta: el MCP simulado marca todo con `"simulado": true`, así que su resultado sale con `live=False` y la pantalla muestra SIMULATED.

Probado con `backend/tests/test_live_belo.py` contra el MCP simulado (en el mismo proceso) y con lecturas reales contra Belo (saldos, movimientos, bóvedas y redes) el 28-nov.

**Pendiente:** cuando exista `BeloPort` (C2), el adaptador lo implementa traduciendo estos métodos. Los nombres y modelos de `live_belo/` sirven de propuesta para el contrato.
