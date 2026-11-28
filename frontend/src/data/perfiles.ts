// Los dos perfiles de la demo. Acá vive TODO lo que cambia entre uno y otro:
// el JSON de datos y los textos. Las pantallas no preguntan nunca "¿es Sofía?":
// leen de este archivo, así que agregar un tercer perfil no toca ninguna pantalla.
import type { PerfilId } from '../api/tipos';
import type { TextosPlan } from '../api/mock/dominio';

export interface CopyPerfil {
  /** Lo que se lee en el estado vacío de la pantalla del plan. */
  llega_ingreso: string;
  /** Textos que entran en el "por qué" de cada movimiento. */
  textos_plan: TextosPlan;
}

export interface DefinicionPerfil {
  id: PerfilId;
  etiqueta_login: string;
  descripcion: string;
  copy: CopyPerfil;
}

export const PERFILES: Record<PerfilId, DefinicionPerfil> = {
  sofia: {
    id: 'sofia',
    etiqueta_login: 'Entrar como Sofía (datos sintéticos)',
    descripcion:
      'Diseñadora freelance en Buenos Aires. Cobra en dólares de un cliente de EE. UU. y paga el alquiler y el monotributo en pesos.',
    copy: {
      llega_ingreso: 'Llegó un pago de tu cliente de EE. UU.',
      textos_plan: {
        vencimiento_semana: 'el alquiler',
        impuestos: 'el monotributo',
      },
    },
  },
  pyme: {
    id: 'pyme',
    etiqueta_login: 'Entrar como Nodo Consultora (datos sintéticos)',
    descripcion:
      'Consultora de datos con clientes en EE. UU., Brasil y Europa. Paga sueldos, proveedores e impuestos en pesos.',
    copy: {
      llega_ingreso:
        'Entraron cobros de tus clientes de EE. UU., Brasil y Europa, ya como dólares digitales.',
      textos_plan: {
        vencimiento_semana: 'los sueldos y proveedores',
        impuestos: 'los impuestos del mes',
      },
    },
  },
};

export const LISTA_PERFILES: DefinicionPerfil[] = [PERFILES.sofia, PERFILES.pyme];
