// El búho CFO: qué parte de la hoja corresponde a cada momento del agente.
//
// La hoja (frontend/public/buho/buho-sprite.webp) trae 12 poses en 4 columnas x 3 filas,
// pero las columnas NO son parejas: la primera es más ancha, así que una grilla de
// cuartos cortaba por el medio de dos búhos. Por eso cada pose guarda su rectángulo
// exacto en píxeles, medido sobre la imagen.
//
// Todos los rectángulos son del mismo tamaño y están centrados en cada búho: así las
// 12 poses se ven del mismo porte, centradas y sin achatarse.

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

/** Medidas reales de buho-sprite.webp. */
export const SPRITE_ANCHO = 1536;
export const SPRITE_ALTO = 1024;

/** Lado del recorte. El búho más grande mide 319 x 317 y cada recorte entra en su pasillo. */
export const LADO = 330;

export interface Recorte {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

const recorte = (x: number, y: number): Recorte => ({ x, y, ancho: LADO, alto: LADO });

/** Esquina superior izquierda del recorte de cada pose, dentro de la hoja. */
export const RECORTES: Record<Expresion, Recorte> = {
  bienvenida: recorte(85, 15), // señalando con marcas violetas
  plan: recorte(424, 18), // tablet con gráfico
  dudando: recorte(782, 12), // pensando con "?"
  idea: recorte(1157, 14), // guiño con la lamparita
  aprobando: recorte(65, 353), // tablita con checklist y lapicera
  belo: recorte(443, 354), // guiño señalando
  bloqueado: recorte(814, 354), // mano de stop con marcas rojas
  revisando: recorte(1161, 354), // mano en el mentón
  pensando: recorte(76, 684), // laptop
  esperando: recorte(433, 689), // taza de café
  completado: recorte(780, 688), // festejando con alas arriba
  reposo: recorte(1161, 686), // brazos cruzados
};

/** Ancho del recorte dividido su alto. Es 1 porque los recortes son cuadrados. */
export const CELDA_RATIO = LADO / LADO;

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

export const EXPRESIONES = Object.keys(RECORTES) as Expresion[];

/** URL pública de cada imagen. Se arma con la base de Vite, no con un import. */
export const url = (archivo: string) => `${import.meta.env.BASE_URL}buho/${archivo}`;
export const SPRITE = () => url('buho-sprite.webp');
export const HERO = () => url('buho-hero.webp');
