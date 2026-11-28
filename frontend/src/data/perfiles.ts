// Los dos perfiles de la demo. Acá vive TODO lo que cambia entre uno y otro.
// Las pantallas no preguntan nunca "¿es Sofía?": leen de este archivo, así que
// agregar un tercer perfil no toca ninguna pantalla.
import type { TextosPlan } from '../api/mock/dominio';
import type { PerfilId } from '../api/tipos';

export interface CopyPerfil {
  /** Cómo saluda el búho. */
  nombre_corto: string;
  /** Lo que va después del monto en el saludo. */
  sufijo_ingreso: string;
  /** Textos que entran en el "por qué" de cada movimiento. */
  textos_plan: TextosPlan;
}

export interface DefinicionPerfil {
  id: PerfilId;
  copy: CopyPerfil;
}

export const PERFILES: Record<PerfilId, DefinicionPerfil> = {
  sofia: {
    id: 'sofia',
    copy: {
      nombre_corto: 'Sofía',
      sufijo_ingreso: '.',
      textos_plan: {
        vencimiento_semana: 'el alquiler',
        impuestos: 'el monotributo',
      },
    },
  },
  pyme: {
    id: 'pyme',
    copy: {
      nombre_corto: 'Nodo',
      sufijo_ingreso: ' de tus clientes.',
      textos_plan: {
        vencimiento_semana: 'los sueldos y proveedores',
        impuestos: 'los impuestos del mes',
      },
    },
  },
};
