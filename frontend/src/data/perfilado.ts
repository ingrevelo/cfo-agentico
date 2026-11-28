// Propuestas del perfilado en modo sombra, para la demo.
//
// El perfilador DE VERDAD vive en backend/app/domain/perfilador.py: busca en
// account.activity lo que se repite (al menos 3 veces, ±3 días, variación menor al 5%)
// y el LLM solo le pone nombre a cada patrón. Acá están los resultados ya escritos,
// con datos sintéticos, para que la pantalla funcione sin backend.
import type { PerfilId, PropuestaPerfilado } from '../api/tipos';

export interface PerfiladoDemo {
  propuestas: PropuestaPerfilado[];
  /** Lo que habría pasado con las reglas puestas (fase 1.2 del caso de prueba). */
  contrafactico: string;
}

export const PERFILADO: Record<PerfilId, PerfiladoDemo> = {
  sofia: {
    propuestas: [
      {
        id: 'P1',
        tipo: 'vencimiento',
        vencimiento_id: 'rent-thursday',
        texto:
          'Todos los meses, entre el 1 y el 5, pagás 450.000 ARS a Inmobiliaria Palermo. ¿Es tu alquiler?',
        estado: 'pendiente',
      },
      {
        id: 'P2',
        tipo: 'vencimiento',
        vencimiento_id: 'monotributo-20',
        texto: 'Entre el 18 y el 20 pagás 65.000 ARS a ARCA: parece tu monotributo.',
        estado: 'pendiente',
      },
      {
        id: 'P3',
        tipo: 'informativa',
        texto:
          'Tu pago principal, unos USD 1.500, llega entre el 1 y el 3. Cuando entre, te armo el plan.',
        estado: 'pendiente',
      },
    ],
    contrafactico:
      'La semana pasada sacaste USD 1.400 al banco el martes. Con tus reglas habría cambiado solo USD 380 y dejado USD 900 rindiendo (rendimiento variable, no garantizado).',
  },
  pyme: {
    propuestas: [
      {
        id: 'P1',
        tipo: 'vencimiento',
        vencimiento_id: 'payroll-friday',
        texto:
          'Todos los meses pagás unos 3.000.000 ARS en sueldos. ¿Lo agrego como vencimiento?',
        estado: 'pendiente',
      },
      {
        id: 'P2',
        tipo: 'vencimiento',
        vencimiento_id: 'proveedores-friday',
        texto: 'Pagás unos 1.200.000 ARS a proveedores en las mismas fechas.',
        estado: 'pendiente',
      },
      {
        id: 'P3',
        tipo: 'informativa',
        texto:
          'Tus cobros llegan de 3 países, unos USD 6.000 por mes. Cuando entren, te armo el plan.',
        estado: 'pendiente',
      },
    ],
    contrafactico:
      'Después de cada cobro vendiste unos USD 5.700 y los sacaste al banco. Con tus reglas habrías cambiado solo USD 3.545 y dejado USD 1.255 rindiendo.',
  },
};
