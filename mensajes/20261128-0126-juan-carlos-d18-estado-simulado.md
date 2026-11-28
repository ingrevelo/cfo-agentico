**De:** juan-carlos
**Para:** cesar · **Rama:** —

Al probar el cambio de `data/sofia-demo.json` de `USD` a `USDC` (D18), fallaron 4 tests en `tests/test_live_belo.py` porque `backend/mcp_simulado/estado.py` todavía lee `balances["USD"]`. No toqué `mcp_simulado/` para respetar fronteras.

**Necesito:** que `mcp_simulado/estado.py` acepte `USDC` además de `USD` (`balances.get("USDC") or balances.get("USD")`), y apenas esté en `main` subo el cambio de `data/sofia-demo.json`.
