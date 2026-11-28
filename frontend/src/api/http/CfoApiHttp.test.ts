// Tests del cliente HTTP con un fetch falso: traducción del contrato C3, sincronización con el
// mock, respaldo cuando la API no responde y errores 4xx visibles.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MockCfoApi } from '../mock/MockCfoApi';
import { CfoApiHttp, ErrorApi } from './CfoApiHttp';
import type { ReglasApi } from './traduccion';

const REGLAS: ReglasApi = {
  user_id: 'sofia-demo',
  profile: { name: 'Sofía', city: 'Buenos Aires', occupation: 'Diseñadora', income_currency: 'USDC' },
  balances: { USDC: '1500.00' },
  fx_usd_ars: '1185.00',
  hard_rules: {
    min_cushion_usd: '600.00',
    cushion_scope: ['USDC', 'USDT'],
    max_conversion_usd: '400.00',
    fx_tolerance_pct: '2.00',
    fx_advance_trigger_pct: '2.00',
    tax_pct_of_income: '8.00',
    min_liquid_usd: '100.00',
    min_income_trigger_usd: '100.00',
    allowed_currencies: ['USDC', 'USDT', 'ARS'],
    idempotency_required: true,
  },
  dues: [
    { id: 'rent-thursday', label: 'Alquiler', amount: '450000.00', currency: 'ARS', due: 'thursday', due_day: null, origen: 'seed' },
    { id: 'perfilado-prop-004', label: 'ARCA', amount: '65000.00', currency: 'ARS', due: null, due_day: 20, origen: 'perfilado' },
  ],
  autonomy_levels: { apartar_impuestos: 3 },
  soft_preferences: { yield_asset: 'USDT', tax_pocket_name: 'Impuestos' },
};

type Respuesta = { status?: number; body: unknown };
let llamadas: { metodo: string; url: string; cuerpo?: unknown }[];

function falsoFetch(rutas: Record<string, Respuesta | (() => never)>) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const metodo = init?.method ?? 'GET';
    llamadas.push({ metodo, url, cuerpo: init?.body ? JSON.parse(String(init.body)) : undefined });
    const r = rutas[`${metodo} ${url}`];
    if (!r) throw new TypeError('sin red');
    if (typeof r === 'function') return r();
    const status = r.status ?? 200;
    return { ok: status < 400, status, json: async () => r.body } as Response;
  });
}

let api: CfoApiHttp;

beforeEach(() => {
  llamadas = [];
  api = new CfoApiHttp(new MockCfoApi());
});
afterEach(() => vi.unstubAllGlobals());

describe('reglas reales', () => {
  it('traduce los montos de texto a números y sincroniza el mock', async () => {
    vi.stubGlobal('fetch', falsoFetch({ 'GET /api/reglas': { body: REGLAS } }));
    const reglas = await api.obtenerReglas();
    expect(reglas.hard_rules.min_cushion_usd).toBe(600);
    expect(reglas.dues[0]).toMatchObject({ amount: 450000, due: 'thursday' });
    expect(reglas.dues[1]).toMatchObject({ due_day: 20, origen: 'perfilado' });
  });

  it('guardar manda los montos como texto con dos decimales', async () => {
    vi.stubGlobal('fetch', falsoFetch({ 'GET /api/reglas': { body: REGLAS }, 'PUT /api/reglas': { body: REGLAS } }));
    const reglas = await api.obtenerReglas();
    await api.guardarReglas({ ...reglas, hard_rules: { ...reglas.hard_rules, min_cushion_usd: 700 } });
    const put = llamadas.find((l) => l.metodo === 'PUT')!.cuerpo as { hard_rules: { min_cushion_usd: string } };
    expect(put.hard_rules.min_cushion_usd).toBe('700.00');
  });

  it('un 422 se muestra: no cae al mock', async () => {
    vi.stubGlobal('fetch', falsoFetch({ 'GET /api/reglas': { status: 422, body: { detail: 'Monto inválido' } } }));
    await expect(api.obtenerReglas()).rejects.toBeInstanceOf(ErrorApi);
  });

  it('si la API no responde, usa el mock', async () => {
    vi.stubGlobal('fetch', falsoFetch({}));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const reglas = await api.obtenerReglas();
    expect(reglas.hard_rules.min_cushion_usd).toBe(500);
  });
});

describe('perfilado real', () => {
  it('traduce las propuestas y confirmar vuelve a leer las reglas', async () => {
    vi.stubGlobal(
      'fetch',
      falsoFetch({
        'POST /api/perfilado': {
          body: [
            { id: 'prop-001', patron: '1500.00 USD con Northwind', interpretacion: 'Ingreso principal', propuesta: 'Te armo el plan', vencimiento: null, estado: 'pendiente' },
            { id: 'prop-004', patron: '65000.00 ARS con ARCA', interpretacion: 'Monotributo', propuesta: '¿Lo agrego?', vencimiento: REGLAS.dues[1], estado: 'pendiente' },
          ],
        },
        'POST /api/perfilado/prop-004/confirmar': { body: {} },
        'GET /api/reglas': { body: REGLAS },
      }),
    );
    const props = await api.correrPerfilado();
    expect(props.map((p) => p.tipo)).toEqual(['informativa', 'vencimiento']);
    expect(props[1].vencimiento_id).toBe('perfilado-prop-004');
    const reglas = await api.resolverPropuesta('prop-004', 'confirmar');
    expect(reglas.dues.some((d) => d.origen === 'perfilado')).toBe(true);
    expect(llamadas.find((l) => l.url.endsWith('/confirmar'))!.cuerpo).toEqual({ confirmar: true });
  });
});

describe('log y reinicio', () => {
  it('suma el log del backend (intento bloqueado) al del plan', async () => {
    vi.stubGlobal(
      'fetch',
      falsoFetch({
        'GET /api/log': {
          body: [{ hora: '2026-11-28T05:40:00Z', plan_id: null, paso: null, tool: 'belo_list_transactions', regla: 'prompt injection', estado: 'INTENTO_BLOQUEADO', monto: null, live: false }],
        },
      }),
    );
    const log = await api.obtenerLog();
    expect(log[0]).toMatchObject({ estado: 'Bloqueado', paso: 'perfilado', monto: '—' });
  });

  it('reiniciar llama al backend y vuelve a traer las reglas', async () => {
    vi.stubGlobal('fetch', falsoFetch({ 'POST /api/demo/reiniciar': { body: { ok: true } }, 'GET /api/reglas': { body: REGLAS } }));
    await api.reiniciarDemo();
    expect(llamadas.map((l) => `${l.metodo} ${l.url}`)).toEqual(['POST /api/demo/reiniciar', 'GET /api/reglas']);
  });

  it('el perfil pyme nunca llama al backend', async () => {
    const f = falsoFetch({});
    vi.stubGlobal('fetch', f);
    await api.iniciarSesionDemo('pyme');
    await api.obtenerReglas();
    expect(f).not.toHaveBeenCalled();
  });
});
