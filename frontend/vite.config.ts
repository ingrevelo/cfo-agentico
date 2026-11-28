import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Servidor de desarrollo en http://localhost:5173/
// Cuando exista la API, el backend sirve esto en / y la API en /api.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
