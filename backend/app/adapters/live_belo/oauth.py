"""OAuth contra el MCP real de Belo, sin login interactivo.

El login se hace una vez por persona con `backend/scripts/listar_tools_belo.py` (abre el navegador).
Ese script deja tokens y cliente en `~/.cfo-agentico/belo-oauth.json`; el adaptador los reutiliza y
los renueva con el refresh token. Si no hay tokens, falla con un mensaje claro: nunca abre un
navegador desde la API. Los tokens nunca entran al repositorio ni al droplet.
"""

import json
import os
from pathlib import Path

from mcp.client.auth import OAuthClientProvider, TokenStorage
from mcp.shared.auth import OAuthClientInformationFull, OAuthClientMetadata, OAuthToken

ARCHIVO_TOKENS = Path(os.getenv("BELO_TOKENS", Path.home() / ".cfo-agentico" / "belo-oauth.json"))
PUERTO_CALLBACK = int(os.getenv("BELO_CALLBACK_PORT", "33418"))


class SinSesionBelo(RuntimeError):
    """No hay sesión guardada: hay que correr el login una vez."""


class AlmacenEnArchivo(TokenStorage):
    """Mismo formato que `listar_tools_belo.py`: {"tokens": ..., "client_info": ...}."""

    def __init__(self, ruta: Path = ARCHIVO_TOKENS) -> None:
        self.ruta = ruta

    def _leer(self) -> dict:
        return json.loads(self.ruta.read_text(encoding="utf-8")) if self.ruta.exists() else {}

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


async def _sin_login(url: str) -> None:
    raise SinSesionBelo(
        "No hay sesión de Belo guardada o venció. Corre una vez "
        "`uv run backend/scripts/listar_tools_belo.py` con BELO_CLIENT_ID para iniciar sesión."
    )


async def _sin_callback():
    raise SinSesionBelo("El adaptador no hace login interactivo.")


def proveedor(url_mcp: str, almacen: TokenStorage | None = None) -> OAuthClientProvider:
    almacen = almacen or AlmacenEnArchivo()
    metadatos = OAuthClientMetadata(
        client_name="CFO Agéntico (Dev IngenierIA)",
        redirect_uris=[f"http://localhost:{PUERTO_CALLBACK}/callback"],
        grant_types=["authorization_code", "refresh_token"],
        response_types=["code"],
        token_endpoint_auth_method="none",
    )
    return OAuthClientProvider(
        server_url=url_mcp,
        client_metadata=metadatos,
        storage=almacen,
        redirect_handler=_sin_login,
        callback_handler=_sin_callback,
    )
