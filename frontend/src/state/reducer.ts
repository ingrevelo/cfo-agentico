// Todo el estado de la app. Tres vistas y nada más: la navegación es el campo `vista`.
import type { EntradaLog, PerfilId, Plan, PropuestaPerfilado, Reglas, Sesion } from '../api/tipos';

export type Vista = 'home' | 'modo' | 'asistente';

export interface EstadoApp {
  vista: Vista;
  sesion: Sesion | null;
  reglas: Reglas | null;
  propuestas: PropuestaPerfilado[];
  plan: Plan | null;
  log: EntradaLog[];
  /** Qué perfil está iniciando sesión ahora. Es el guardia contra el doble clic. */
  iniciando: PerfilId | null;
  /** Lo último que pasó, para leerlo en la región aria-live. */
  anuncio: string;
}

export const ESTADO_INICIAL: EstadoApp = {
  vista: 'home',
  sesion: null,
  reglas: null,
  propuestas: [],
  plan: null,
  log: [],
  iniciando: null,
  anuncio: '',
};

export type Accion =
  | { tipo: 'ir'; vista: Vista }
  | { tipo: 'iniciando'; perfil_id: PerfilId }
  | { tipo: 'sesion'; sesion: Sesion; reglas: Reglas }
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

    case 'iniciando':
      // Si ya hay una sesión en vuelo, el segundo clic (en el mismo botón o en el otro)
      // se ignora. Así nunca se arrancan dos personas a la vez.
      return estado.iniciando ? estado : { ...estado, iniciando: accion.perfil_id };

    case 'sesion':
      return {
        ...estado,
        sesion: accion.sesion,
        reglas: accion.reglas,
        iniciando: null,
        vista: 'asistente',
      };

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
      return ESTADO_INICIAL;
  }
}
