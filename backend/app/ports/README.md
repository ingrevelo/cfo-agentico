# ports

Contratos que el dominio usa para hablar con el exterior.

**`BeloPort`** refleja las tools del MCP V1 de Belo (`auth.sign_in`, `account.balances`, `account.yields`, `account.activity`, `exchange.fx`, `ramp.fiat_crypto`, `transaction.approve`), más `move_to_pocket` para las alcancías, que no están en la V1.

El contrato propuesto está en el anexo A1 de [`docs/caso-de-prueba.md`](../../../docs/caso-de-prueba.md). Cada resultado de escritura indica si fue `live` o simulado, para mostrar el badge SIMULATED.
