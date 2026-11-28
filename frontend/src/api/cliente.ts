// Cliente de datos de la demo.
//
// Hoy lee el JSON sintético que está en src/data/. Cuando el backend exponga la API,
// solo cambia el cuerpo de estas funciones por fetch('/api/...') (ruta relativa,
// porque FastAPI sirve el frontend y la API en el mismo dominio). Los tipos y los
// nombres de las funciones no cambian, así que las pantallas quedan igual.
import sofiaDemo from '../data/sofia-demo.json';

export interface Perfil {
  name: string;
  city: string;
  occupation: string;
  income_currency: string;
}

export interface Saldos {
  USD: number;
  USDT: number;
  alcancia_impuestos_usd: number;
  ARS: number;
}

export interface ReglasDuras {
  min_cushion_usd: number;
  cushion_scope: string[];
  max_conversion_usd: number;
  fx_tolerance_pct: number;
  fx_advance_trigger_pct: number;
  tax_pct_of_income: number;
  min_liquid_usd: number;
  min_income_trigger_usd: number;
  allowed_currencies: string[];
  idempotency_required: boolean;
}

/** Ojo: el alquiler trae `due` ("thursday") y el monotributo `due_day` (20). */
export interface Vencimiento {
  id: string;
  label: string;
  amount: number;
  currency: string;
  due?: string;
  due_day?: number;
}

export interface PreferenciasBlandas {
  risk_profile: string;
  explanation_tone: string;
  yield_asset: string;
  tax_pocket_name: string;
}

export interface DatosSofia {
  user_id: string;
  _nota: string;
  profile: Perfil;
  balances: Saldos;
  fx_demo: { USD_ARS: number };
  hard_rules: ReglasDuras;
  dues: Vencimiento[];
  autonomy_levels: Record<string, number>;
  soft_preferences: PreferenciasBlandas;
}

/** Datos de Sofía. Más adelante: fetch('/api/usuarios/sofia-demo'). */
export function obtenerSofia(): DatosSofia {
  return sofiaDemo as DatosSofia;
}

/** Cotización de la demo. Más adelante: fetch('/api/fx'). */
export function obtenerCotizacionUsdArs(): number {
  return obtenerSofia().fx_demo.USD_ARS;
}
