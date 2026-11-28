// Traduce entre el contrato C3 del backend (montos como texto, estados en mayúsculas)
// y los tipos que usan las pantallas (src/api/tipos.ts). Es el único archivo que conoce
// la forma de las respuestas de /api: si el backend cambia un campo, solo cambia esto.
import { horaCorta } from '../../formato';
import type {
  EntradaLog,
  Estado,
  Preferencias,
  PropuestaPerfilado,
  Reglas,
  ReglasDuras,
  ToolLog,
  Vencimiento,
} from '../tipos';

// ------------------------------------------------------------ forma del backend (C3)

export interface ReglasDurasApi {
  min_cushion_usd: string;
  cushion_scope: string[];
  max_conversion_usd: string;
  fx_tolerance_pct: string;
  fx_advance_trigger_pct: string;
  tax_pct_of_income: string;
  min_liquid_usd: string;
  min_income_trigger_usd: string;
  allowed_currencies: string[];
  idempotency_required: boolean;
}

export interface VencimientoApi {
  id: string;
  label: string;
  amount: string;
  currency: string;
  due?: string | null;
  due_day?: number | null;
  origen?: string;
}

export interface ReglasApi {
  user_id: string;
  profile: Record<string, string>;
  balances: Record<string, string>;
  fx_usd_ars: string;
  hard_rules: ReglasDurasApi;
  dues: VencimientoApi[];
  autonomy_levels: Record<string, number>;
  soft_preferences: Record<string, string>;
}

export interface PropuestaApi {
  id: string;
  patron: string;
  interpretacion: string;
  propuesta: string;
  vencimiento: VencimientoApi | null;
  estado: string;
}

export interface EntradaLogApi {
  hora: string;
  plan_id: string | null;
  paso: string | null;
  tool: string | null;
  regla: string;
  estado: string;
  monto: string | null;
  live: boolean;
}

// ------------------------------------------------------------------ traducciones

const ESTADOS: Record<string, Estado> = {
  PROPUESTO: 'Propuesto',
  APROBADO: 'Aprobado',
  EJECUTANDO: 'Ejecutando',
  COMPLETADO: 'Completado',
  RETENIDO: 'Retenido',
  DESCONOCIDO: 'Desconocido',
  BLOQUEADO: 'Bloqueado',
  INTENTO_BLOQUEADO: 'Bloqueado',
  RECHAZADO: 'Rechazado',
  FALLIDO: 'Rechazado',
};

const num = (texto: string) => Number(texto);
const texto = (n: number) => n.toFixed(2);

export function estadoDesdeApi(estado: string): Estado {
  const base = estado.split(' ')[0].toUpperCase(); // "DESCONOCIDO → COMPLETADO" se lee por el primero
  return ESTADOS[estado.toUpperCase()] ?? ESTADOS[base] ?? 'Desconocido';
}

export function reglasDesdeApi(r: ReglasApi): Reglas {
  const h = r.hard_rules;
  const duras: ReglasDuras = {
    min_cushion_usd: num(h.min_cushion_usd),
    cushion_scope: h.cushion_scope,
    max_conversion_usd: num(h.max_conversion_usd),
    fx_tolerance_pct: num(h.fx_tolerance_pct),
    fx_advance_trigger_pct: num(h.fx_advance_trigger_pct),
    tax_pct_of_income: num(h.tax_pct_of_income),
    min_liquid_usd: num(h.min_liquid_usd),
    min_income_trigger_usd: num(h.min_income_trigger_usd),
    allowed_currencies: h.allowed_currencies,
    idempotency_required: h.idempotency_required,
  };
  const dues: Vencimiento[] = r.dues.map((v) => ({
    id: v.id,
    label: v.label,
    amount: num(v.amount),
    currency: v.currency,
    ...(v.due ? { due: v.due } : {}),
    ...(v.due_day ? { due_day: v.due_day } : {}),
    ...(v.origen === 'perfilado' ? { origen: 'perfilado' as const } : {}),
  }));
  const p = r.soft_preferences;
  const preferencias: Preferencias = {
    risk_profile: p.risk_profile ?? 'moderado',
    explanation_tone: p.explanation_tone ?? '',
    yield_asset: p.yield_asset ?? 'USDT',
    tax_pocket_name: p.tax_pocket_name ?? 'Impuestos',
  };
  return { user_id: r.user_id, hard_rules: duras, dues, preferencias };
}

export function reglasAApi(r: Reglas): { hard_rules: ReglasDurasApi; dues: VencimientoApi[] } {
  const h = r.hard_rules;
  return {
    hard_rules: {
      min_cushion_usd: texto(h.min_cushion_usd),
      cushion_scope: h.cushion_scope,
      max_conversion_usd: texto(h.max_conversion_usd),
      fx_tolerance_pct: texto(h.fx_tolerance_pct),
      fx_advance_trigger_pct: texto(h.fx_advance_trigger_pct),
      tax_pct_of_income: texto(h.tax_pct_of_income),
      min_liquid_usd: texto(h.min_liquid_usd),
      min_income_trigger_usd: texto(h.min_income_trigger_usd),
      allowed_currencies: h.allowed_currencies,
      idempotency_required: h.idempotency_required,
    },
    dues: r.dues.map((v) => ({
      id: v.id,
      label: v.label,
      amount: texto(v.amount),
      currency: v.currency,
      due: v.due ?? null,
      due_day: v.due_day ?? null,
      origen: v.origen ?? 'manual',
    })),
  };
}

export function propuestaDesdeApi(p: PropuestaApi): PropuestaPerfilado {
  const estado = (['pendiente', 'confirmada', 'descartada'] as const).find((e) => e === p.estado);
  return {
    id: p.id,
    tipo: p.vencimiento ? 'vencimiento' : 'informativa',
    texto: `${p.interpretacion}: ${p.patron}. ${p.propuesta}`,
    ...(p.vencimiento ? { vencimiento_id: p.vencimiento.id } : {}),
    estado: estado ?? 'pendiente',
  };
}

export function logDesdeApi(e: EntradaLogApi, i: number): EntradaLog {
  return {
    id: `api-${i + 1}`,
    hora: horaCorta(new Date(e.hora)),
    paso: e.paso ?? (e.estado === 'INTENTO_BLOQUEADO' ? 'perfilado' : 'plan'),
    tool: e.tool as ToolLog, // nombres reales de Belo (belo_*): la pantalla los muestra tal cual
    regla: e.regla,
    estado: estadoDesdeApi(e.estado),
    monto: e.monto ?? '—',
    live: false,
    motivo_simulado: e.live ? '' : 'Registrado por el backend',
  };
}
