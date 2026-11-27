# adapters

| Adaptador | Cuándo se usa | Qué hace |
|---|---|---|
| `MockBeloAdapter` | Desde el inicio y en los tests | Imita las tools de la V1 con los datos de Sofía (`data/sofia-demo.json`), una cotización configurable y modos de fallo: timeout y FX fuera de banda |
| `LiveBeloMCPAdapter` | Cuando llegue el kit oficial | Llama al MCP V1 de Belo. Lo que la V1 no permita cae al mock con `live=False` |

Se elige con la variable `BELO_ADAPTER=mock|live`. Cambiar de adaptador no debe tocar `domain`, `agent` ni `api`.
