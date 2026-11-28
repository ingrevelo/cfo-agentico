// Las reglas duras, en el orden en que se cuentan, con su explicación y su validación.
// Están acá y no dentro de la pantalla para que la pantalla quede corta y legible.
import type { ReglasDuras } from '../../api/tipos';

export interface DefinicionCampo {
  campo: keyof ReglasDuras;
  etiqueta: string;
  sufijo: string;
  explicacion: string;
  /** Los porcentajes van de 0 a 100; los montos son enteros de 0 o más. */
  tipo: 'monto' | 'porcentaje';
  /** Si es true, cero no sirve (el colchón tiene que ser mayor que 0). */
  mayorQueCero?: boolean;
}

export const CAMPOS: DefinicionCampo[] = [
  {
    campo: 'min_cushion_usd',
    etiqueta: 'Colchón mínimo en dólares',
    sufijo: 'USD',
    tipo: 'monto',
    mayorQueCero: true,
    explicacion:
      'Nunca bajes de este monto entre dólares, USDT y alcancías. Es tu red de seguridad: si un cambio a pesos lo rompe, el agente lo bloquea.',
  },
  {
    campo: 'max_conversion_usd',
    etiqueta: 'Tope para cambiar a pesos sin preguntar',
    sufijo: 'USD',
    tipo: 'monto',
    explicacion: 'Si una conversión pasa de este monto, el agente te pide un OK adicional.',
  },
  {
    campo: 'fx_tolerance_pct',
    etiqueta: 'Cuánto puede empeorar el dólar',
    sufijo: '%',
    tipo: 'porcentaje',
    explicacion:
      'Si el dólar se mueve en contra más que esto, la conversión se retiene y te vuelve a preguntar. Nunca cambia "un poquito peor" en silencio.',
  },
  {
    campo: 'fx_advance_trigger_pct',
    etiqueta: 'Cuánto tiene que mejorar para adelantar',
    sufijo: '%',
    tipo: 'porcentaje',
    explicacion:
      'Si mejora al menos esto antes del vencimiento, el agente propone cambiar antes y gastar menos dólares.',
  },
  {
    campo: 'tax_pct_of_income',
    etiqueta: 'Cuánto apartar para impuestos',
    sufijo: '% del ingreso',
    tipo: 'porcentaje',
    explicacion: 'De cada ingreso se aparta este porcentaje en tu alcancía, antes de tocar el resto.',
  },
  {
    campo: 'min_liquid_usd',
    etiqueta: 'Dinero libre para el día a día',
    sufijo: 'USD',
    tipo: 'monto',
    explicacion: 'Esto queda disponible sin tocar, para tus gastos de la semana.',
  },
  {
    campo: 'min_income_trigger_usd',
    etiqueta: 'Desde qué monto el agente arma un plan',
    sufijo: 'USD',
    tipo: 'monto',
    explicacion:
      'Los ingresos más chicos que esto no disparan un plan: se acumulan para el siguiente.',
  },
];

export interface ErrorCampo {
  campo: keyof ReglasDuras;
  mensaje: string;
}

export function validarRegla(c: DefinicionCampo, valor: number): ErrorCampo | null {
  if (!Number.isFinite(valor)) return { campo: c.campo, mensaje: 'Escribí un número.' };
  if (!Number.isInteger(valor) && c.tipo === 'monto')
    return { campo: c.campo, mensaje: 'Los montos van sin decimales.' };
  if (valor < 0) return { campo: c.campo, mensaje: 'No puede ser negativo.' };
  if (c.mayorQueCero && valor <= 0)
    return { campo: c.campo, mensaje: 'Tiene que ser mayor que cero.' };
  if (c.tipo === 'porcentaje' && valor > 100)
    return { campo: c.campo, mensaje: 'Un porcentaje va de 0 a 100.' };
  return null;
}
