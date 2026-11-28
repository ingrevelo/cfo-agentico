"""Arranca el MCP simulado por HTTP: http://127.0.0.1:8001/mcp

    cd backend && uv run --with "mcp>=2.3" python -m mcp_simulado
"""

import os

from .servidor import mcp

mcp.run(
    "streamable-http",
    host=os.getenv("MCP_SIM_HOST", "127.0.0.1"),
    port=int(os.getenv("MCP_SIM_PUERTO", "8001")),
    streamable_http_path="/mcp",
)
