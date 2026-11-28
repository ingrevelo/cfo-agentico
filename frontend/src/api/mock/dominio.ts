// ===========================================================================
//  ESPEJO TEMPORAL DEL BACKEND
//  La fuente de verdad es backend/app/domain (motor, juez, estados).
//  Esto existe solo para que la demo funcione sin API; se borra cuando
//  front/cliente-api conecte la API real.
// ===========================================================================
//
// Funciones puras: entran datos, salen datos. Sin fetch, sin estado, sin React.
// Fórmulas de docs/caso-de-prueba.md §2.1 y orden del juez de docs/arquitectura.md §4.
import { formatearNumero, formatearUsd } from '../../formato';
import type {
  DatosDemo,
  Estado,
  Movimiento,
  Plan,
  ReglasDuras,
  ResultadoJuez,
  Saldos,
  Vencimiento,
} from '../tipos';

/** Textos que cambian según el perfil. El backend los redacta con el LLM (nodo compose_plan). */
export interface TextosPlan {
  vencimiento_semana: string;
  impuestos: string;
}

const TEXTOS_POR_DEFECTO: TextosPlan = {
  vencimiento_semana: 'el vencimiento de esta semana',
  impuestos: 'tus impuestos',
};

export interface OpcionesPlan {
  plan_id?: string;
  /** Cotización a usar; por defecto la del JSON. */
  fx?: number;
  textos?: TextosPlan;
}

/** Vencimientos que caen esta semana: los que traen día de la semana y vencen en ARS. */
export function vencimientosDeLaSemana(dues: Vencimiento[]): Vencimiento[] {
  return dues.filter((d) => Boolean(d.due) && d.currency === 'ARS');
}

/**
 * Cuántos dólares hay que cambiar para cubrir los vencimientos de la semana.
 * Se redondea para arriba: nunca hay que quedarse corto para un pago.
 */
export function montoAConvertir(dues: Vencimiento[], fx: number): number {
  const suma = vencimientosDeLaSemana(dues).reduce((total, d) => total + d.amount, 0);
  return suma > 0 ? Math.ceil(suma / fx) : 0;
}

/**
 * Arma el plan de un ingreso. Devuelve null si el ingreso no alcanza el disparo mínimo:
 * en ese caso el dinero se acumula para el siguiente plan.
 */
export function calcularPlan(
  datos: DatosDemo,
  ingreso_usd: number,
  opciones: OpcionesPlan = {},
): Plan | null {
  const r = datos.hard_rules;
  if (ingreso_usd < r.min_income_trigger_usd) return null;

  const plan_id = opciones.plan_id ?? 'plan-ing01';
  const fx = opciones.fx ?? datos.fx_demo.USD_ARS;
  const textos = opciones.textos ?? TEXTOS_POR_DEFECTO;
  const activo = datos.soft_preferences.yield_asset;
  const alcancia = datos.soft_preferences.tax_pocket_name;

  const semanales = vencimientosDeLaSemana(datos.dues);

  const impuestos = Math.round((ingreso_usd * r.tax_pct_of_income) / 100);
  const libre_usd = r.min_liquid_usd;
  const a_convertir = montoAConvertir(datos.dues, fx);
  const pesos = a_convertir * fx;
  const rendimiento = Math.max(0, ingreso_usd - impuestos - libre_usd - a_convertir);
  const quedan_en_dolares = ingreso_usd - a_convertir;

  const movimientos: Movimiento[] = [];
  if (rendimiento > 0) {
    movimientos.push({
      paso: 'M1',
      clave: plan_id + '-M1',
      tipo: 'rendimiento',
      titulo: 'Dejar rindiendo en ' + activo,
      monto_usd: rendimiento,
      moneda_destino: activo,
      estado: 'Propuesto',
      simulado: true,
      motivo_simulado: MOTIVO_D16,
      porque: 'Es el excedente del mes. El rendimiento es variable, no garantizado.',
    });
  }
  movimientos.push({
    paso: 'M2',
    clave: plan_id + '-M2',
    tipo: 'alcancia',
    titulo: 'Apartar en la alcancía "' + alcancia + '"',
    monto_usd: impuestos,
    moneda_destino: 'USD',
    estado: 'Propuesto',
    simulado: true,
    motivo_simulado: MOTIVO_ALCANCIA,
    porque: r.tax_pct_of_income + '% del ingreso, para ' + textos.impuestos + '.',
  });
  if (a_convertir > 0) {
    const dia = semanales[0]?.due ?? 'thursday';
    movimientos.push({
      paso: 'M3',
      clave: plan_id + '-M3',
      tipo: 'conversion_a_pesos',
      titulo: 'Cambiar a pesos',
      monto_usd: a_convertir,
      monto_ars: pesos,
      fx,
      moneda_destino: 'ARS',
      estado: 'Propuesto',
      simulado: true,
      motivo_simulado: MOTIVO_D16,
      porque: 'Solo lo que necesitás para ' + textos.vencimiento_semana + '.',
      programado_para: dia,
    });
  }

  return {
    plan_id,
    ingreso_usd,
    movimientos,
    libre_usd,
    quedan_en_dolares,
    colchon_cubierto: quedan_en_dolares >= r.min_cushion_usd,
    banda_fx: {
      min: Math.round(fx * (1 - r.fx_tolerance_pct / 100)),
      max: Math.round(fx * (1 + r.fx_tolerance_pct / 100)),
    },
    saldos: { ...datos.balances },
    fx,
  };
}

/** Por qué cada paso lleva el sello SIMULATED. */
export const MOTIVO_D16 = 'La URL pública no usa el MCP real (D16)';
export const MOTIVO_ALCANCIA = 'Las alcancías no se pueden mover desde el MCP: solo consultar';

/** Todo lo que queda en dólares: cuenta USD + USDT + alcancías (D6). */
export const dolaresTotales = (s: Saldos) => s.USD + s.USDT + s.alcancia_impuestos_usd;

/** Monto que precarga el Caso Rojo: lo que sobra del colchón más 100, para que bloquee. */
export const montoCasoRojo = (s: Saldos, r: ReglasDuras) =>
  dolaresTotales(s) - r.min_cushion_usd + 100;

/**
 * El juez. Los chequeos van en este orden y el primero que aplica decide
 * (docs/arquitectura.md §4). Los montos de los mensajes los calcula el código (D4).
 */
export function evaluarJuez(
  movimiento: Movimiento,
  reglas: ReglasDuras,
  saldos: Saldos,
  ya_evaluado?: ResultadoJuez,
): ResultadoJuez {
  // 1. Ya evaluado: devuelve el mismo resultado (idempotencia).
  if (ya_evaluado) return ya_evaluado;

  // 2. Moneda fuera de las permitidas.
  if (!reglas.allowed_currencies.includes(movimiento.moneda_destino)) {
    return {
      decision: 'BLOQUEAR',
      razones: [
        'No puedo mover dinero a ' +
          movimiento.moneda_destino +
          ': no está entre tus monedas permitidas (' +
          reglas.allowed_currencies.join(', ') +
          ').',
      ],
    };
  }

  // 3. Colchón: solo lo reduce cambiar a pesos. Mover entre bolsas en dólares, no.
  if (movimiento.tipo === 'conversion_a_pesos') {
    const dolares = dolaresTotales(saldos);
    const quedarian = dolares - movimiento.monto_usd;
    if (quedarian < reglas.min_cushion_usd) {
      const tope = dolares - reglas.min_cushion_usd;
      return {
        decision: 'BLOQUEAR',
        razones: [
          'No puedo cambiar ' +
            formatearUsd(movimiento.monto_usd) +
            ': te quedarían ' +
            formatearUsd(quedarian) +
            ' en dólares y tu mínimo es ' +
            formatearNumero(reglas.min_cushion_usd) +
            '.',
          'Puedo cambiar hasta ' + formatearUsd(tope) + ' si me lo confirmás, o mantener el plan.',
        ],
      };
    }

    // 4. Pasa el colchón pero supera el tope por conversión.
    if (movimiento.monto_usd > reglas.max_conversion_usd) {
      return {
        decision: 'PEDIR_OK_ADICIONAL',
        razones: [
          formatearUsd(movimiento.monto_usd) +
            ' supera tu tope de ' +
            formatearUsd(reglas.max_conversion_usd) +
            ' por conversión.',
          'Tu colchón queda cubierto, así que puedo hacerlo con un OK adicional tuyo.',
        ],
      };
    }
  }

  // 5. Todo lo demás: entra en el plan y se aprueba con un solo OK.
  return {
    decision: 'PEDIR_APROBACION',
    razones: ['Entra en el plan del ingreso y se aprueba con tu OK.'],
  };
}

/** Transiciones válidas de la máquina de estados (docs/arquitectura.md §2). */
export const TRANSICIONES: Record<Estado, Estado[]> = {
  Propuesto: ['Aprobado', 'Bloqueado', 'Rechazado'],
  Aprobado: ['Ejecutando', 'Retenido'],
  Retenido: ['Propuesto'],
  Ejecutando: ['Completado', 'Desconocido'],
  Desconocido: ['Completado', 'Rechazado'],
  Completado: [],
  Bloqueado: [],
  Rechazado: [],
};

export const esTransicionValida = (desde: Estado, hacia: Estado) =>
  TRANSICIONES[desde].includes(hacia);

/** Cambia el estado de un movimiento o lanza un error. Nunca salta la tabla. */
export function transicionar(movimiento: Movimiento, hacia: Estado): Movimiento {
  if (!esTransicionValida(movimiento.estado, hacia)) {
    throw new Error(
      'Transición inválida en ' +
        movimiento.clave +
        ': ' +
        movimiento.estado +
        ' no puede pasar a ' +
        hacia +
        '.',
    );
  }
  return { ...movimiento, estado: hacia };
}

/** Variación del dólar frente a la cotización del plan, en porcentaje. */
export const variacionFx = (fx_plan: number, fx_hoy: number) =>
  ((fx_hoy - fx_plan) / fx_plan) * 100;

/** Fuera de la banda = empeoró más que la tolerancia. Nunca convierte "un poquito peor". */
export const fxFueraDeBanda = (fx_plan: number, fx_hoy: number, tolerancia_pct: number) =>
  variacionFx(fx_plan, fx_hoy) < -tolerancia_pct;

/** Saldos después de aplicar los movimientos que llegaron a Completado. */
export function saldosSegunPlan(plan: Plan): Saldos {
  const s: Saldos = { USD: plan.ingreso_usd, USDT: 0, alcancia_impuestos_usd: 0, ARS: 0 };
  for (const m of plan.movimientos) {
    if (m.estado !== 'Completado') continue;
    s.USD -= m.monto_usd;
    if (m.tipo === 'rendimiento') s.USDT += m.monto_usd;
    if (m.tipo === 'alcancia') s.alcancia_impuestos_usd += m.monto_usd;
    if (m.tipo === 'conversion_a_pesos') s.ARS += m.monto_ars ?? 0;
  }
  return s;
}
