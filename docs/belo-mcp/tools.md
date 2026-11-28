# Tools del MCP de Belo

Lista obtenida el 27-nov-2026 conectando `https://b2b.belo.app/mcp` como conector personalizado de claude.ai, con el permiso **"Consultar"**. Se pidieron las definiciones sin ejecutar ninguna tool. Nuestro cliente en Python todavía recibe 403 de Cloudflare (ver [`decisiones.md`](../decisiones.md), pregunta 1), así que esta lista es una transcripción de las definiciones y no un volcado de `tools/list`. Cuando el script `backend/scripts/listar_tools_belo.py` pueda conectar, `tools.json` se reemplaza por los esquemas exactos.

Son **18 tools** en cuatro grupos. Los montos viajan como **texto decimal** (por ejemplo `"150.00"`).

## Solo lectura (11)

| Tool | Qué hace | Parámetros | Permiso |
|---|---|---|---|
| `belo_get_balances` | Saldo disponible por moneda, con el rendimiento anual (`yield.rate`) y lo ganado (`earned`: total, hoy, mes) | — | `account:read` |
| `belo_list_transactions` | Historial de movimientos, del más reciente al más antiguo: API, app y lo recibido. Incluye `metadata` y `receipt` (contraparte, débitos, comisión, tasa). No incluye cotizaciones sin confirmar | `currency`, `from` (ISO), `to` (ISO), `type` (`deposit`, `withdrawal`, `swap`, `transfer`, `pix_payout`), `page` (≥1), `limit` (1–100, por defecto 20); todos opcionales | `transactions:read` |
| `belo_get_transaction` | Una transacción por id con su estado: `awaiting_approval`, `pending`, `success` o `failed`. Es la que se consulta después de confirmar | `transactionId`* (UUID) | `transactions:read` |
| `belo_get_transfer_networks` | Redes para enviar una moneda, con mínimo, máximo y comisión. Se usa antes de cotizar un envío | `currency`* | `transfers:read` |
| `belo_list_contacts` | Agenda: cuentas propias, favoritos y transferencias recientes (máximo 30), cada dirección con su tipo | `search` (1–100), `addressType` (`BELOTAG`, `CBU`, `CVU`, `ALIAS`, `PIX`, `BREB`, `ACH`, `SEPA`, redes cripto…) | `contacts:read` |
| `belo_get_contact` | Un contacto con todas sus cuentas y direcciones | `contactId`* (hex de 24 caracteres) | `contacts:read` |
| `belo_get_deposit_addresses` | Direcciones fijas para fondear la cuenta, una por moneda y red | `currency` | `deposits:read` |
| `belo_list_vaults` | Bóvedas de ahorro: nombre, meta, saldo y si rinden. **Desde este servidor no se puede meter ni sacar dinero de una bóveda** | `currencyCode` (1–20) | `vaults:read` |
| `belo_get_vault` | Una bóveda con lo ganado: total, hoy, ayer, semana, mes y año | `vaultId`* (numérico) | `vaults:read` |
| `belo_get_pix_payout_price` | Precio actual del par con que se liquida un Pix (p. ej. USDT/BRL). Informativo, no reserva nada | `brlAmount` | `pix:read` |
| `belo_find_pix_recipient` | Busca el titular de una llave Pix. Gasta una cuota de consultas por cuenta: una vez por llave | `address`* (CPF, CNPJ, correo, teléfono, llave aleatoria o QR) | `pix:read` |

## Cotización (3): crean una cotización con vencimiento, no debitan

| Tool | Qué hace | Parámetros | Permiso |
|---|---|---|---|
| `belo_preview_swap` | Cotiza una conversión. Devuelve id, precio, montos de ambos lados y vencimiento | `pairCode`* (`"BASE/QUOTE"`, p. ej. `"USDT/ARGt"`), `quoteAmount`*, `quoteCurrency`*, `type`* (`BUY` o `SELL`) | `swaps:execute` |
| `belo_preview_transfer` | Cotiza un envío: cripto en cadena, retiro en pesos a CVU/CBU/alias, o transferencia interna entre usuarios de Belo (gratis e inmediata). No sirve para Pix. Devuelve id, monto, comisión, tasa, vencimiento y `debits` (de qué saldos sale) | `address`*, `addressType`* (redes cripto como `TRON`, `POLYGON`, `SOLANA`; `CVU`, `CBU`, `ALIAS`, `QR`; `BELOTAG`, `EMAIL`, `USER`, `DEPAY_QR`), `currency`*, `quoteAmount`*, `quoteCurrency` (por defecto igual a `currency`) | `transfers:initiate` |
| `belo_preview_pix_payout` | Cotiza un pago en reales a una llave Pix. Devuelve id, `brlAmount`, `recipientName`, comisión, tasa, vencimiento y `debits`. Se liquida desde USDT o BRAt, nunca desde un saldo en reales | `address`* (llave o QR), `amount`* (BRL) | `pix:write` |

## Aceptación de términos (1)

| Tool | Qué hace | Parámetros | Permiso |
|---|---|---|---|
| `belo_accept_pix_payout_terms` | Registra que la persona aceptó los términos de retiro por Pix (una vez, antes de buscar titulares o cotizar Pix). No mueve fondos, pero es una aceptación legal: solo con un sí explícito. Genera un enlace de aprobación | `acceptedTerms`* (debe ser `true`), `requestId`, `waitForApproval` | `pix:write` |

## Mueven dinero (3): irreversibles

Cada una necesita el id de una cotización vigente y la aprobación de la persona en la app de Belo o en un enlace de Belo.

| Tool | Qué hace | Parámetros | Permiso |
|---|---|---|---|
| `belo_confirm_swap` | Ejecuta la conversión cotizada contra el saldo real | `transactionId`* (de `belo_preview_swap`), `waitForApproval` | `swaps:execute` |
| `belo_confirm_transfer` | Envía los fondos cotizados. Un envío en cadena o a banco no se recupera | `transactionId`* (de `belo_preview_transfer`), `waitForApproval` | `transfers:initiate` |
| `belo_confirm_pix_payout` | Envía el pago Pix cotizado. Un Pix no se recupera | `transactionId`* (de `belo_preview_pix_payout`), `waitForApproval` | `pix:write` |

`*` = obligatorio.

## Cómo funciona la aprobación

- Ningún `belo_confirm_*` se ejecuta directamente. Si la cuenta es de quien conectó, la transacción queda en `awaiting_approval` y llega una notificación a la app de Belo para aprobar o rechazar. Si no, la tool devuelve un enlace de Belo donde la persona revisa la operación con el precio actualizado.
- `waitForApproval` permite que la tool espere la decisión. Sin esperar, el estado se consulta con `belo_get_transaction`.
- El patrón es siempre **cotizar → confirmar → aprobar en Belo → consultar el estado**.

## Límites que nos afectan

- No se puede mover dinero hacia ni desde las bóvedas: apartar impuestos sigue SIMULATED (D15).
- No hay operaciones recurrentes ni programadas, ni cobros.
- Los retiros a banco solo existen para pesos argentinos. `BREB` (Colombia) aparece en la agenda, pero no se puede pagar desde el servidor.
- Las instrucciones del servidor mencionan tools de tarjetas (crear, congelar, descongelar), pero no aparecen en esta conexión, probablemente por ser una cuenta personal.
- Cada cotización crea un registro con vencimiento.
