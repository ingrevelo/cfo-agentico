# Despliegue

**URL pública: <https://cfo.pruebassite.com>**

La app corre en un droplet de DigitalOcean que comparte servidor con otros servicios. Por eso el despliegue sigue tres reglas:

1. **Sin puertos abiertos.** El servidor solo acepta SSH. La app escucha en `127.0.0.1:8095` y sale a internet por un **Cloudflare Tunnel** propio (`cfo-agentico`), que abre la conexión desde adentro. Cloudflare pone el HTTPS.
2. **Nadie entra al servidor para desplegar.** GitHub Actions solo construye la imagen y la publica en `ghcr.io`. En el servidor, un temporizador de systemd la revisa cada 2 minutos y reinicia el contenedor solo si cambió. No hay llaves del servidor en GitHub.
3. **Aislada del resto.** Red de Docker propia, contenedor de solo lectura, usuario no root, sin capacidades, 512 MB y 1 CPU como máximo.

## Cómo llega un cambio a la URL

```
merge a main → workflow "imagen" → ghcr.io/ingrevelo/cfo-agentico:latest (+ :<commit>)
            → en ≤ 2 min, cfo-actualizar: docker compose pull && up -d
```

El workflow no construye nada hasta que existan `backend/pyproject.toml` y `frontend/package.json`. Mientras tanto, la URL muestra una página provisional.

## Archivos

| Archivo | En el servidor |
|---|---|
| [`docker-compose.yml`](docker-compose.yml) | `~/srv/cfo-agentico/docker-compose.yml` |
| `.env` (no está en el repo) | `~/srv/cfo-agentico/.env`, permisos `600`: `ANTHROPIC_API_KEY`, `BELO_ADAPTER=mock`, `BELO_MCP_URL` del MCP simulado |
| [`systemd/cfo-actualizar.service`](systemd/cfo-actualizar.service) y [`.timer`](systemd/cfo-actualizar.timer) | `/etc/systemd/system/` |
| [`systemd/cloudflared-cfo.service`](systemd/cloudflared-cfo.service) | `/etc/systemd/system/` |
| [`cloudflared/cfo.yml.example`](cloudflared/cfo.yml.example) | `/etc/cloudflared/cfo.yml` |
| [`../Dockerfile`](../Dockerfile) | Lo usa el workflow, no el servidor |
| [`../.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) | — |

## Lo que asume la imagen

El `Dockerfile` espera, de `api/esqueleto` y `front/esqueleto`:

- `backend/pyproject.toml` con uv, y la app en `app.main:app`.
- `GET /api/salud` (lo usa el healthcheck).
- Que FastAPI sirva como archivos estáticos la carpeta de la variable `FRONTEND_DIST` (`/app/static`) en `/`.
- SQLite en `/tmp` (`DATABASE_URL=sqlite:////tmp/cfo.db`): el contenedor es de solo lectura y la base se siembra en cada arranque.
- `frontend/package.json` con `npm run build`, que deja `dist/`.

## Pasos pendientes (Cesar)

1. Cuando el workflow publique la primera imagen: en GitHub, **Packages → cfo-agentico → Package settings → Change visibility → Public**, para que el servidor la descargue sin credenciales. La imagen no lleva secretos.
2. Copiar `deploy/docker-compose.yml` al servidor en lugar del provisional y correr `docker compose up -d`.
3. Comprobar `https://cfo.pruebassite.com/api/salud`.

## Comandos útiles en el servidor

```bash
cd ~/srv/cfo-agentico
docker compose ps && docker compose logs --tail 50 app
systemctl list-timers cfo-actualizar.timer
journalctl -u cfo-actualizar.service -n 20
# Volver a una versión anterior: fijarla en .env (el temporizador la respeta) y levantar.
# Para volver a seguir main, se borra esa línea.
echo "CFO_IMAGEN=ghcr.io/ingrevelo/cfo-agentico:<commit>" >> .env && docker compose up -d
```
