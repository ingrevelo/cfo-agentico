// ÚNICO PUNTO DE CAMBIO para conectar el backend.
//
// Hoy: MockCfoApi, que guarda todo en memoria y no necesita servidor.
// Mañana (rama front/cliente-api): se escribe CfoApiHttp con fetch('/api/...') y acá
// queda `export const api: CfoApi = new CfoApiHttp()`. Ninguna pantalla se toca.
import type { CfoApi } from './CfoApi';
import { MockCfoApi } from './mock/MockCfoApi';

export const api: CfoApi = new MockCfoApi();

export type { CfoApi };
