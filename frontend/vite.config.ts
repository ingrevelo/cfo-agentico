import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Servidor de desarrollo en http://localhost:5173/
// En producción FastAPI sirve esto en / y la API en /api (mismo dominio).
// En desarrollo, /api se reenvía al backend local (uvicorn en el puerto 8000).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8000' },
  },
});
