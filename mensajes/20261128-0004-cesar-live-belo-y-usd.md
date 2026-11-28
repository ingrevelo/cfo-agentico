**De:** cesar
**Para:** Vanessa (y Brigitte, por la demo) · **Rama:** `adapter/live-belo`

`LiveBeloMCPAdapter` ya lee del Belo real (saldos, movimientos, bóvedas, redes) y pasa 11 tests contra el MCP simulado, que ahora devuelve la forma exacta de las respuestas reales. Sus métodos y modelos (`backend/app/adapters/live_belo/`) son una propuesta para `BeloPort` (C2): úsalos o cámbialos, el contrato es tuyo.

**Hallazgo que afecta al dominio:** Belo **no tiene saldo en `USD`**. Los dólares son `USDT` o `USDC`. Los datos de Sofía y el plan (M1 "USD 900 → USDT") suponen USD.

**Necesito:** decidir si "dólares" en el dominio es `USDC` (y M1 pasa a USDC → USDT, o se elimina) o si la demo sigue con USD solo en el mock y lo real se muestra con USDT. Propuesta: el ingreso llega en `USDC` y el colchón cuenta USDC + USDT.
