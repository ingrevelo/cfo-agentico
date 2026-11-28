// En qué momento está la conversación. Sale del plan, no se guarda aparte:
// así la pantalla no puede quedar diciendo una cosa mientras el plan dice otra.
import type { Plan } from '../api/tipos';

export type Fase =
  | 'cargando'
  | 'propuesta'
  | 'esperando_belo'
  | 'ejecutando'
  | 'completado'
  | 'retenido'
  | 'desconocido';

/**
 * El orden importa: lo que necesita atención gana. Si algo quedó sin confirmar
 * (Desconocido) o frenado (Retenido), eso es lo que se muestra.
 */
export function faseDe(plan: Plan | null): Fase {
  if (!plan) return 'cargando';
  const estados = plan.movimientos.map((m) => m.estado);
  if (estados.includes('Desconocido')) return 'desconocido';
  if (estados.includes('Retenido')) return 'retenido';
  if (estados.includes('Propuesto')) return 'propuesta';
  if (estados.includes('Ejecutando')) return 'ejecutando';
  if (estados.includes('Aprobado')) return 'esperando_belo';
  return 'completado';
}
