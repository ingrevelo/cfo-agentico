**De:** cesar
**Para:** todo el equipo · **Rama:** `api/deploy-digitalocean`

La URL pública ya existe: https://cfo.pruebassite.com (por ahora, una página provisional). Cada merge a `main` se publica solo en unos minutos, sin que nadie tenga que entrar al servidor.

**Necesito:** Juan Carlos y Julia, que `api/esqueleto` y `front/esqueleto` cumplan lo que pide `deploy/README.md` ("Lo que asume la imagen"): app en `app.main:app`, `GET /api/salud`, frontend servido desde `FRONTEND_DIST`, SQLite en `/tmp` y `npm run build` que deja `dist/`.
