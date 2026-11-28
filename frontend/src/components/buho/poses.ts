// El búho CFO: qué pose de la hoja corresponde a cada momento del agente.
//
// La hoja (frontend/public/buho/buho-sprite.png) tiene 12 poses en 4 columnas x 3 filas:
//   fila 0: señalando | tablet con gráfico | pensando con "?" | guiño con la lamparita
//   fila 1: tablita con checklist | guiño señalando | mano de stop | mano en el mentón
//   fila 2: laptop | taza de café | festejando | brazos cruzados
//
// Las imágenes las guarda Brigitte a mano; la app funciona igual si no están.

export type Expresion =
  | 'bienvenida'
  | 'plan'
  | 'dudando'
  | 'idea'
  | 'aprobando'
  | 'belo'
  | 'bloqueado'
  | 'revisando'
  | 'pensando'
  | 'esperando'
  | 'completado'
  | 'reposo';

export const FILAS = 3;
export const COLUMNAS = 4;

/** [fila, columna] de cada pose dentro de la hoja. Empieza en 0. */
export const CELDAS: Record<Expresion, readonly [number, number]> = {
  bienvenida: [0, 0],
  plan: [0, 1],
  dudando: [0, 2],
  idea: [0, 3],
  aprobando: [1, 0],
  belo: [1, 1],
  bloqueado: [1, 2],
  revisando: [1, 3],
  pensando: [2, 0],
  esperando: [2, 1],
  completado: [2, 2],
  reposo: [2, 3],
};

/**
 * Ancho de celda dividido alto de celda. Mientras no exista el PNG vale 1;
 * cuando Brigitte guarde la hoja hay que poner la proporción real.
 */
export const CELDA_RATIO = 1;

/** Texto alternativo por pose, para cuando el búho no es decorativo. */
export const ALT: Record<Expresion, string> = {
  bienvenida: 'Búho CFO saludando',
  plan: 'Búho CFO mostrando la propuesta',
  dudando: 'Búho CFO con una duda',
  idea: 'Búho CFO con una idea',
  aprobando: 'Búho CFO anotando tu aprobación',
  belo: 'Búho CFO señalando la confirmación de Belo',
  bloqueado: 'Búho CFO frenando una operación',
  revisando: 'Búho CFO revisando el cambio del dólar',
  pensando: 'Búho CFO revisando tu cuenta',
  esperando: 'Búho CFO esperando lo programado',
  completado: 'Búho CFO festejando el plan completado',
  reposo: 'Búho CFO con los brazos cruzados',
};

export const EXPRESIONES = Object.keys(CELDAS) as Expresion[];

/** URL pública de cada imagen. Se arma con la base de Vite, no con un import. */
export const url = (archivo: string) => `${import.meta.env.BASE_URL}buho/${archivo}`;
export const SPRITE = () => url('buho-sprite.png');
export const HERO = () => url('buho-hero.png');
