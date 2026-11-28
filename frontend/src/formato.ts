// Único lugar donde se formatean montos y fechas. Intl con es-AR: 1500 -> "1.500".
// El dinero siempre viaja como entero (USD y ARS), nunca como decimal.

const NUMERO = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const DECIMAL = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const formatearNumero = (n: number) => NUMERO.format(Math.round(n));
export const formatearUsd = (n: number) => `USD ${formatearNumero(n)}`;
export const formatearArs = (n: number) => `${formatearNumero(n)} ARS`;
export const formatearFx = (n: number) => formatearNumero(n);
export const formatearPorcentaje = (n: number) => `${DECIMAL.format(n)}%`;

/** Los vencimientos semanales vienen en inglés desde el JSON del backend. */
const DIAS: Record<string, string> = {
  monday: 'lunes',
  tuesday: 'martes',
  wednesday: 'miércoles',
  thursday: 'jueves',
  friday: 'viernes',
  saturday: 'sábado',
  sunday: 'domingo',
};

export const diaEnCastellano = (dia: string) => DIAS[dia] ?? dia;

/** "Próximo vencimiento: el jueves" / "Vence el día 20 de cada mes". */
export function explicarVencimiento(due?: string, due_day?: number): string {
  if (due) return `Próximo vencimiento: el ${diaEnCastellano(due)}.`;
  if (due_day) return `Vence el día ${due_day} de cada mes.`;
  return 'Sin fecha definida.';
}

/** Hora corta para el MCP Log. */
export const horaCorta = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
