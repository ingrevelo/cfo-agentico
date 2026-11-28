// Las reglas duras con su etiqueta corta, su ayuda de una línea y su validación.
// En la interfaz se dice "reserva mínima"; en el código sigue siendo min_cushion_usd.
import type { ReglasDuras } from '../../api/tipos';

export interface DefinicionCampo {
  campo: keyof ReglasDuras;
  etiqueta: string;
  sufijo: string;
  ayuda: string;
  tipo: 'monto' | 'porcentaje';
  mayorQueCero?: boolean;
}

export const CAMPOS: DefinicionCampo[] = [
  {
    campo: 'min_cushion_usd',
    etiqueta: 'Reserva mínima',
    sufijo: 'USD',
    tipo: 'monto',
    mayorQueCero: true,
    ayuda: 'Nunca bajás de acá en dólares. Si un cambio la rompe, se bloquea.',
  },
  {
    campo: 'max_conversion_usd',
    etiqueta: 'Tope por operación',
    sufijo: 'USD',
    tipo: 'monto',
    ayuda: 'Si una conversión lo supera, te pido un OK adicional.',
  },
  {
    campo: 'fx_tolerance_pct',
    etiqueta: 'Tolerancia del dólar',
    sufijo: '%',
    tipo: 'porcentaje',
    ayuda: 'Si se mueve en contra más que esto, freno y te pregunto.',
  },
  {
    campo: 'tax_pct_of_income',
    etiqueta: 'Impuestos',
    sufijo: '% del ingreso',
    tipo: 'porcentaje',
    ayuda: 'Lo aparto de cada ingreso, antes de tocar el resto.',
  },
  {
    campo: 'min_liquid_usd',
    etiqueta: 'Dinero libre',
    sufijo: 'USD',
    tipo: 'monto',
    ayuda: 'Queda disponible para tus gastos de la semana.',
  },
];

export function validarRegla(c: DefinicionCampo, valor: number): string | null {
  if (!Number.isFinite(valor)) return 'Escribí un número.';
  if (c.tipo === 'monto' && !Number.isInteger(valor)) return 'Los montos van sin decimales.';
  if (valor < 0) return 'No puede ser negativo.';
  if (c.mayorQueCero && valor <= 0) return 'Tiene que ser mayor que cero.';
  if (c.tipo === 'porcentaje' && valor > 100) return 'Un porcentaje va de 0 a 100.';
  return null;
}
