// Todo el estado de la app en un solo lugar. Sin librería de estado y sin router:
// la "navegación" es el campo `vista`, y cambiarlo es despachar una acción.
import type { EntradaLog, Plan, PropuestaPerfilado, Reglas, Sesion } from '../api/tipos';

export type Vista = 'landing' | 'login' | 'perfilado' | 'reglas' | 'plan' | 'aprobacion' | 'resumen';

export interface EstadoApp {
  vista: Vista;
  sesion: Sesion | null;
  reglas: Reglas | null;
  propuestas: PropuestaPerfilado[];
  plan: Plan | null;
  log: EntradaLog[];
  /** Lo último que pasó, para leerlo en la región aria-live. */
  anuncio: string;
}

export const ESTADO_INICIAL: EstadoApp = {
  vista: 'landing',
  sesion: null,
  reglas: null,
  propuestas: [],
  plan: null,
  log: [],
  anuncio: '',
};

export type Accion =
  | { tipo: 'ir'; vista: Vista }
  | { tipo: 'sesion'; sesion: Sesion }
  | { tipo: 'reglas'; reglas: Reglas }
  | { tipo: 'propuestas'; propuestas: PropuestaPerfilado[] }
  | { tipo: 'plan'; plan: Plan | null }
  | { tipo: 'log'; log: EntradaLog[] }
  | { tipo: 'anunciar'; texto: string }
  | { tipo: 'reiniciar' };

export function reducer(estado: EstadoApp, accion: Accion): EstadoApp {
  switch (accion.tipo) {
    case 'ir':
      return { ...estado, vista: accion.vista };
    case 'sesion':
      return { ...estado, sesion: accion.sesion };
    case 'reglas':
      return { ...estado, reglas: accion.reglas };
    case 'propuestas':
      return { ...estado, propuestas: accion.propuestas };
    case 'plan':
      return { ...estado, plan: accion.plan };
    case 'log':
      return { ...estado, log: accion.log };
    case 'anunciar':
      return { ...estado, anuncio: accion.texto };
    case 'reiniciar':
      return { ...ESTADO_INICIAL, vista: 'login' };
  }
}

/** Qué pasos se pueden visitar con lo que hay hecho hasta ahora. */
export function pasoHabilitado(vista: Vista, estado: EstadoApp): boolean {
  if (vista === 'landing' || vista === 'login') return true;
  if (!estado.sesion) return false;
  if (vista === 'perfilado' || vista === 'reglas') return true;
  if (vista === 'plan') return Boolean(estado.reglas);
  return Boolean(estado.plan);
}
