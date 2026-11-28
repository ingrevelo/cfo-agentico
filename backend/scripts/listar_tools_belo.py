# /// script
# requires-python = ">=3.10"
# dependencies = ["mcp>=2.3"]
# ///
"""Lista las tools del MCP de Belo y guarda su estructura en docs/belo-mcp/tools.json.

Se conecta por HTTP con OAuth, abre el login de Belo en el navegador y, con la sesión
iniciada, pide `tools/list`.

Cloudflare bloquea el registro automático del cliente (403), así que se usa un cliente
registrado a mano en el servidor OAuth de Belo (https://bifrost.belo.app/oauth/register),
con `redirect_uris` en http://localhost:33418/callback. Su `client_id` va en BELO_CLIENT_ID
(no es secreto: el cliente es público, sin contraseña).
No llama a ninguna tool: no consulta saldos ni mueve dinero.

Uso (desde la raíz del repositorio):

    $env:BELO_CLIENT_ID = "dyn_..."            # PowerShell; en bash: export BELO_CLIENT_ID=dyn_...
    uv run backend/scripts/listar_tools_belo.py
    # o, sin uv:
    pip install "mcp>=2.3" && python backend/scripts/listar_tools_belo.py

En la pantalla de permisos de Belo basta con dejar marcado "Consultar".

Los tokens se guardan fuera del repositorio, en ~/.cfo-agentico/belo-oauth.json,
para que el adaptador live los reutilice. Nunca se suben a git.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
import threading
import webbrowser
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import httpx2
from mcp.client.auth import OAuthClientProvider, TokenStorage
from mcp.client.session import ClientSession
from mcp.client.streamable_http import streamable_http_client
from mcp.types import PaginatedRequestParams
from mcp.shared.auth import (
    AuthorizationCodeResult,
    OAuthClientInformationFull,
    OAuthClientMetadata,
    OAuthToken,
)

BELO_MCP_URL = "https://b2b.belo.app/mcp"
CLIENT_ID = os.getenv("BELO_CLIENT_ID")
PUERTO_CALLBACK = int(os.getenv("BELO_CALLBACK_PORT", "33418"))
REDIRECT_URI = f"http://localhost:{PUERTO_CALLBACK}/callback"
ARCHIVO_TOKENS = Path.home() / ".cfo-agentico" / "belo-oauth.json"
SALIDA = Path(__file__).resolve().parents[2] / "docs" / "belo-mcp"
# El volcado completo (descripciones e instrucciones del servidor, textos de Belo) queda fuera
# del repositorio, que es público. En docs/belo-mcp/ va solo la estructura de cada tool.
COMPLETO = Path.home() / ".cfo-agentico" / "belo-mcp-completo.json"


def _estructura(valor):
    """Quita los textos descriptivos y deja nombres, tipos, enums y campos obligatorios."""
    if isinstance(valor, dict):
        return {
            k: ({c: _estructura(x) for c, x in v.items()} if k == "properties" else _estructura(v))
            for k, v in valor.items()
            if k not in ("description", "title")
        }
    if isinstance(valor, list):
        return [_estructura(v) for v in valor]
    return valor


class AlmacenEnArchivo(TokenStorage):
    """Guarda tokens y registro del cliente en un archivo local, fuera del repo."""

    def __init__(self, ruta: Path) -> None:
        self.ruta = ruta

    def _leer(self) -> dict:
        if self.ruta.exists():
            return json.loads(self.ruta.read_text(encoding="utf-8"))
        return {}

    def _escribir(self, datos: dict) -> None:
        self.ruta.parent.mkdir(parents=True, exist_ok=True)
        self.ruta.write_text(json.dumps(datos, indent=2), encoding="utf-8")

    async def get_tokens(self) -> OAuthToken | None:
        t = self._leer().get("tokens")
        return OAuthToken.model_validate(t) if t else None

    async def set_tokens(self, tokens: OAuthToken) -> None:
        datos = self._leer()
        datos["tokens"] = tokens.model_dump(mode="json", exclude_none=True)
        self._escribir(datos)

    async def get_client_info(self) -> OAuthClientInformationFull | None:
        c = self._leer().get("client_info")
        return OAuthClientInformationFull.model_validate(c) if c else None

    async def set_client_info(self, client_info: OAuthClientInformationFull) -> None:
        datos = self._leer()
        datos["client_info"] = client_info.model_dump(mode="json", exclude_none=True)
        self._escribir(datos)


class _Callback(BaseHTTPRequestHandler):
    resultado: dict = {}
    listo = threading.Event()

    def do_GET(self) -> None:  # noqa: N802
        url = urlparse(self.path)
        if url.path != "/callback":
            self.send_response(404)
            self.end_headers()
            return
        q = {k: v[0] for k, v in parse_qs(url.query).items()}
        _Callback.resultado = q
        _Callback.listo.set()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        mensaje = "Listo: ya puedes cerrar esta ventana y volver a la terminal."
        if "error" in q:
            mensaje = f"Belo devolvió un error: {q.get('error')}. Revisa la terminal."
        self.wfile.write(f"<p style='font-family:sans-serif'>{mensaje}</p>".encode())

    def log_message(self, *args) -> None:  # silencia el log del servidor
        pass


def _levantar_servidor() -> HTTPServer:
    servidor = HTTPServer(("localhost", PUERTO_CALLBACK), _Callback)
    threading.Thread(target=servidor.serve_forever, daemon=True).start()
    return servidor


async def abrir_login(url: str) -> None:
    print("\nAbriendo el login de Belo en el navegador. Si no se abre, copia esta URL:\n")
    print(url, "\n")
    webbrowser.open(url)


async def esperar_callback() -> AuthorizationCodeResult:
    await asyncio.to_thread(_Callback.listo.wait, 300)
    q = _Callback.resultado
    if not q:
        raise TimeoutError("No llegó la respuesta del login en 5 minutos.")
    if "error" in q:
        raise RuntimeError(f"Login rechazado: {q.get('error')} {q.get('error_description', '')}")
    return AuthorizationCodeResult(code=q["code"], state=q.get("state"), iss=q.get("iss"))


async def main() -> None:
    metadatos = OAuthClientMetadata(
        client_name="CFO Agéntico (Dev IngenierIA)",
        redirect_uris=[REDIRECT_URI],
        grant_types=["authorization_code", "refresh_token"],
        response_types=["code"],
        token_endpoint_auth_method="none",
    )
    almacen = AlmacenEnArchivo(ARCHIVO_TOKENS)
    if CLIENT_ID:  # cliente registrado a mano: el SDK no intenta el registro dinámico
        info = await almacen.get_client_info()
        if info is None or info.client_id != CLIENT_ID:
            await almacen.set_client_info(
                OAuthClientInformationFull(client_id=CLIENT_ID, **metadatos.model_dump())
            )
    servidor = _levantar_servidor()
    proveedor = OAuthClientProvider(
        server_url=BELO_MCP_URL,
        client_metadata=metadatos,
        storage=almacen,
        redirect_handler=abrir_login,
        callback_handler=esperar_callback,
    )
    try:
        async with httpx2.AsyncClient(auth=proveedor, timeout=httpx2.Timeout(30, read=300)) as http:
            async with streamable_http_client(BELO_MCP_URL, http_client=http) as (lectura, escritura):
                async with ClientSession(lectura, escritura) as sesion:
                    init = await sesion.initialize()
                    tools, cursor = [], None
                    while True:
                        params = PaginatedRequestParams(cursor=cursor) if cursor else None
                        res = await sesion.list_tools(params=params)
                        tools += [t.model_dump(mode="json", by_alias=True, exclude_none=True) for t in res.tools]
                        cursor = res.next_cursor
                        if not cursor:
                            break
    finally:
        servidor.shutdown()

    info = {
        "generado": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        "servidor": init.server_info.name,
        "version": init.server_info.version,
        "protocolo": init.protocol_version,
        "instrucciones": init.instructions,
    }
    COMPLETO.parent.mkdir(parents=True, exist_ok=True)
    COMPLETO.write_text(
        json.dumps({"info": info, "tools": tools}, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    publico = {k: v for k, v in info.items() if k != "instrucciones"}
    estructura = [
        {
            "name": t["name"],
            "annotations": t.get("annotations", {}),
            "inputSchema": _estructura(t.get("inputSchema", {})),
            "outputSchema": _estructura(t.get("outputSchema", {})),
        }
        for t in tools
    ]
    SALIDA.mkdir(parents=True, exist_ok=True)
    (SALIDA / "tools.json").write_text(
        json.dumps({"info": publico, "tools": estructura}, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    print(f"\nVolcado completo (fuera del repo): {COMPLETO}")
    print(f"{len(tools)} tools, solo estructura, en {SALIDA / 'tools.json'}:")
    for t in tools:
        print(f"  - {t['name']}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(1)
