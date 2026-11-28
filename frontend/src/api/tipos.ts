// Modelos de la API, escritos a mano. Cuando FastAPI publique su OpenAPI, estos tipos
// se reemplazan por los generados con openapi-typescript (rama front/cliente-api).
// Los nombres de campo van en snake_case, igual que los va a devolver el backend.

export type PerfilId = 'sofia' | 'pyme';

/** Estados de la máquina de estados (docs/arquitectura.md §2). FALLIDO se muestra como Rechazado. */
export type Estado =
  | 'Propuesto'
  | 'Aprobado'
  | 'Ejecutando'
  | 'Completado'
  | 'Retenido'
  | 'Desconocido'
  | 'Bloqueado'
  | 'Rechazado';

/** Las 8 tools del MCP V1 de Belo. '(alcancía)' no es una tool: no existe en la V1. */
export type ToolBelo =
  | 'auth.sign_in'
  | 'account.balances'
  | 'account.yields'
  | 'account.activity'
  | 'exchange.fx'
  | 'ramp.fiat_crypto'
  | 'card.manage'
  | 'transaction.approve';

export type ToolLog = ToolBelo | '(alcancía)' | null;

export type Paso = 'M1' | 'M2' | 'M3';
export type TipoMovimiento = 'rendimiento' | 'alcancia' | 'conversion_a_pesos';

export interface Saldos {
  USD: number;
  USDT: number;
  alcancia_impuestos_usd: number;
  ARS: number;
}

export interface Perfil {
  name: string;
  city: string;
  occupation: string;
  income_currency: string;
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

/** El alquiler trae `due` (día de la semana); el monotributo trae `due_day` (día del mes). */
export interface Vencimiento {
  id: string;
  label: string;
  amount: number;
  currency: string;
  due?: string;
  due_day?: number;
  origen?: 'perfilado';
}

export interface Preferencias {
  risk_profile: string;
  explanation_tone: string;
  yield_asset: string;
  tax_pocket_name: string;
}

/** Forma exacta de sofia-demo.json y pyme-demo.json. */
export interface DatosDemo {
  user_id: string;
  _nota: string;
  profile: Perfil;
  balances: Saldos;
  fx_demo: { USD_ARS: number };
  hard_rules: ReglasDuras;
  dues: Vencimiento[];
  autonomy_levels: Record<string, number>;
  soft_preferences: Preferencias;
}

export interface Sesion {
  perfil_id: PerfilId;
  user_id: string;
  perfil: Perfil;
  saldos: Saldos;
  fx: number;
}

export interface Reglas {
  user_id: string;
  hard_rules: ReglasDuras;
  dues: Vencimiento[];
  preferencias: Preferencias;
}

export interface Movimiento {
  paso: Paso;
  /** Clave de idempotencia: plan_id + paso, por ejemplo "plan-ing01-M1". */
  clave: string;
  tipo: TipoMovimiento;
  titulo: string;
  monto_usd: number;
  monto_ars?: number;
  fx?: number;
  /** Moneda a la que llega el dinero. La usa el juez contra allowed_currencies. */
  moneda_destino: string;
  estado: Estado;
  simulado: boolean;
  motivo_simulado: string;
  porque: string;
  programado_para?: string;
  /** Si quedó Retenido, el monto que propone el motor con la cotización de hoy. */
  monto_sugerido_usd?: number;
}

export interface Plan {
  plan_id: string;
  ingreso_usd: number;
  movimientos: Movimiento[];
  libre_usd: number;
  quedan_en_dolares: number;
  colchon_cubierto: boolean;
  banda_fx?: { min: number; max: number };
  /** Saldos del momento, como los devolvería account.balances. */
  saldos: Saldos;
  /** Cotización con la que se armó el plan: la referencia de la banda. */
  fx: number;
  /** Cotización de hoy, cuando la demo avanzó al día del vencimiento. */
  fx_hoy?: number;
}

export type DecisionJuez = 'EJECUTAR' | 'PEDIR_APROBACION' | 'PEDIR_OK_ADICIONAL' | 'BLOQUEAR';

export interface ResultadoJuez {
  decision: DecisionJuez;
  razones: string[];
}

export interface ResultadoEdicion {
  plan: Plan;
  juez: ResultadoJuez;
}

export interface ResultadoAprobacion {
  plan: Plan;
  /** true si esta llamada no cambió nada porque el plan ya estaba aprobado (T06). */
  repetido: boolean;
}

export interface EnlaceBelo {
  paso: Paso;
  destino: string;
  monto: string;
  comision: string;
  vence_en_minutos: number;
  simulado: true;
}

export interface PropuestaPerfilado {
  id: string;
  tipo: 'vencimiento' | 'informativa';
  texto: string;
  /** Solo las de tipo "vencimiento" apuntan a un vencimiento de las reglas. */
  vencimiento_id?: string;
  estado: 'pendiente' | 'confirmada' | 'descartada';
}

export interface EntradaLog {
  id: string;
  hora: string;
  paso: string;
  tool: ToolLog;
  regla: string;
  estado: Estado;
  monto: string;
  /** En esta demo siempre false: la URL pública no usa el MCP real (D16). */
  live: false;
  motivo_simulado: string;
}

export interface ConfigDemo {
  escenario_fx: 'estable' | 'empeora';
  inyectar_timeout: boolean;
}
