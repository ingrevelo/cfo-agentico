// ÚNICO PUNTO DE CAMBIO para conectar el backend.
//
// Por defecto usa CfoApiHttp (backend real en /api, con el mock como respaldo y para lo que el
// backend todavía no tiene). Con VITE_CFO_API=mock usa solo el mock, sin servidor.
import type { CfoApi } from './CfoApi';
import { CfoApiHttp } from './http/CfoApiHttp';
import { MockCfoApi } from './mock/MockCfoApi';

const modo = import.meta.env.VITE_CFO_API ?? 'http';

export const api: CfoApi = modo === 'mock' ? new MockCfoApi() : new CfoApiHttp(new MockCfoApi());

export type { CfoApi };
