# db

SQLite para moverse rápido (PostgreSQL si el equipo ya tiene uno listo). Nada de bases de grafos en el MVP.

Tablas previstas: `perfiles`, `reglas`, `vencimientos`, `planes`, `movimientos` (con estado y clave de idempotencia), `niveles_autonomia` y `mcp_log` (tool, ID, estado, live o simulado, hora).
