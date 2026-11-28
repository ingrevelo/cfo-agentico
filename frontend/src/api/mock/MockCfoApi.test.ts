// Tests del backend de mentira: idempotencia, timeout, FX y Caso Rojo.
// Cada test arranca con su propia instancia, así no se pisan entre ellos.
import { beforeEach, describe, expect, it } from 'vitest';
import type { EntradaLog, Paso, Plan } from '../tipos';
import { MockCfoApi } from './MockCfoApi';

const PLAN = 'plan-ing01';
const contar = (log: EntradaLog[], tool: string) => log.filter((f) => f.tool === tool).length;
const estadoDe = (plan: Plan, paso: Paso) =>
  plan.movimientos.find((m) => m.paso === paso)?.estado;

let api: MockCfoApi;

beforeEach(async () => {
  api = new MockCfoApi();
  await api.iniciarSesionDemo('sofia');
});

describe('plan y perfilado', () => {
  it('escribe las cuatro lecturas en el log al simular un ingreso', async () => {
    await api.simularIngreso();
    const log = await api.obtenerLog();
    expect(contar(log, 'account.balances')).toBe(1);
    expect(contar(log, 'account.yields')).toBe(1);
    expect(contar(log, 'exchange.fx')).toBe(1);
    expect(contar(log, 'ramp.fiat_crypto')).toBe(0);
  });

  it('correr el perfilado no cambia las reglas hasta que se confirma (T12)', async () => {
    const antes = await api.obtenerReglas();
    await api.correrPerfilado();
    const durante = await api.obtenerReglas();
    expect(durante.dues).toEqual(antes.dues);
    expect(durante.dues.every((d) => d.origen === undefined)).toBe(true);

    const despues = await api.resolverPropuesta('P1', 'confirmar');
    expect(despues.dues.find((d) => d.id === 'rent-thursday')?.origen).toBe('perfilado');
  });

  it('descartar una propuesta quita ese vencimiento de las reglas', async () => {
    const reglas = await api.resolverPropuesta('P1', 'descartar');
    expect(reglas.dues.some((d) => d.id === 'rent-thursday')).toBe(false);
  });

  it('sin ingreso suficiente no hay plan', async () => {
    const reglas = await api.obtenerReglas();
    await api.guardarReglas({
      ...reglas,
      hard_rules: { ...reglas.hard_rules, min_income_trigger_usd: 5000 },
    });
    expect(await api.simularIngreso()).toBeNull();
  });
});

describe('Caso Rojo (T07)', () => {
  it('bloquea sin tocar el plan y sin llamar a ninguna tool de escritura', async () => {
    const original = (await api.simularIngreso())!;
    const { plan, juez } = await api.editarMovimiento(PLAN, 'M3', 1100);

    expect(juez.decision).toBe('BLOQUEAR');
    expect(plan.movimientos).toEqual(original.movimientos);
    const log = await api.obtenerLog();
    expect(contar(log, 'ramp.fiat_crypto')).toBe(0);
    expect(contar(log, 'transaction.approve')).toBe(0);
    expect(log.some((f) => f.estado === 'Bloqueado')).toBe(true);
  });

  it('acepta un monto válido y el rendimiento absorbe la diferencia', async () => {
    await api.simularIngreso();
    const { plan, juez } = await api.editarMovimiento(PLAN, 'M3', 300);
    expect(juez.decision).toBe('PEDIR_APROBACION');
    expect(plan.movimientos.find((m) => m.paso === 'M3')?.monto_usd).toBe(300);
    expect(plan.movimientos.find((m) => m.paso === 'M1')?.monto_usd).toBe(980);
    expect(plan.quedan_en_dolares).toBe(1200);
  });
});

describe('aprobación e idempotencia (T06)', () => {
  it('dos aprobaciones seguidas dejan una sola aprobación', async () => {
    await api.simularIngreso();
    const primera = await api.aprobarPlan(PLAN);
    const segunda = await api.aprobarPlan(PLAN);

    expect(primera.repetido).toBe(false);
    expect(segunda.repetido).toBe(true);
    const log = await api.obtenerLog();
    expect(log.filter((f) => f.regla === 'Aprobación en CFO Agéntico')).toHaveLength(1);
  });

  it('dos aprobaciones en paralelo tampoco duplican nada', async () => {
    await api.simularIngreso();
    const [a, b] = await Promise.all([api.aprobarPlan(PLAN), api.aprobarPlan(PLAN)]);

    expect([a.repetido, b.repetido].sort()).toEqual([false, true]);
    const log = await api.obtenerLog();
    expect(log.filter((f) => f.regla === 'Aprobación en CFO Agéntico')).toHaveLength(1);
  });

  it('la alcancía se completa sola y queda simulada', async () => {
    await api.simularIngreso();
    const { plan } = await api.aprobarPlan(PLAN);
    expect(estadoDe(plan, 'M2')).toBe('Completado');
    expect(estadoDe(plan, 'M1')).toBe('Aprobado');

    const log = await api.obtenerLog();
    const fila = log.find((f) => f.tool === '(alcancía)')!;
    expect(fila.live).toBe(false);
    expect(fila.motivo_simulado).toContain('alcancías');
  });
});

describe('aprobación en Belo (D13)', () => {
  it('con el código correcto ejecuta y completa el movimiento', async () => {
    await api.simularIngreso();
    await api.aprobarPlan(PLAN);
    const plan = await api.confirmarEnlaceBelo(PLAN, 'M1', '123456');

    expect(estadoDe(plan, 'M1')).toBe('Completado');
    const log = await api.obtenerLog();
    expect(contar(log, 'transaction.approve')).toBe(1);
    expect(contar(log, 'ramp.fiat_crypto')).toBe(1);
  });

  it('con un código incorrecto no ejecuta nada', async () => {
    await api.simularIngreso();
    await api.aprobarPlan(PLAN);
    await expect(api.confirmarEnlaceBelo(PLAN, 'M1', '000000')).rejects.toThrow(/código/);

    const plan = await api.obtenerPlan(PLAN);
    expect(estadoDe(plan, 'M1')).toBe('Aprobado');
    const log = await api.obtenerLog();
    expect(contar(log, 'ramp.fiat_crypto')).toBe(0);
  });

  it('el mismo movimiento no se ejecuta dos veces', async () => {
    await api.simularIngreso();
    await api.aprobarPlan(PLAN);
    await api.confirmarEnlaceBelo(PLAN, 'M1', '123456');
    await api.confirmarEnlaceBelo(PLAN, 'M1', '123456');

    const log = await api.obtenerLog();
    expect(contar(log, 'ramp.fiat_crypto')).toBe(1);
  });
});

describe('timeout inyectado (T05)', () => {
  it('pasa por Desconocido, reconcilia y llama a ramp una sola vez', async () => {
    await api.configurarDemo({ escenario_fx: 'estable', inyectar_timeout: true });
    await api.simularIngreso();
    await api.aprobarPlan(PLAN);
    const plan = await api.confirmarEnlaceBelo(PLAN, 'M1', '123456');

    expect(estadoDe(plan, 'M1')).toBe('Completado');
    const log = await api.obtenerLog();
    expect(contar(log, 'ramp.fiat_crypto')).toBe(1);
    expect(log.some((f) => f.tool === 'ramp.fiat_crypto' && f.estado === 'Desconocido')).toBe(true);
    expect(
      log.some((f) => f.tool === 'account.activity' && f.regla.includes('Reconciliar')),
    ).toBe(true);
  });
});

describe('tolerancia de FX el jueves (T09)', () => {
  it('con el dólar estable la conversión pasa a Ejecutando', async () => {
    await api.simularIngreso();
    await api.aprobarPlan(PLAN);
    const plan = await api.avanzarDemo('jueves');
    expect(estadoDe(plan, 'M3')).toBe('Ejecutando');
  });

  it('si el dólar empeora más de 2% la conversión queda Retenida', async () => {
    await api.configurarDemo({ escenario_fx: 'empeora', inyectar_timeout: false });
    await api.simularIngreso();
    await api.aprobarPlan(PLAN);
    const plan = await api.avanzarDemo('jueves');

    expect(estadoDe(plan, 'M3')).toBe('Retenido');
    const log = await api.obtenerLog();
    expect(contar(log, 'ramp.fiat_crypto')).toBe(0);
  });

  it('la nueva propuesta con el dólar de hoy vuelve a Propuesto', async () => {
    await api.configurarDemo({ escenario_fx: 'empeora', inyectar_timeout: false });
    await api.simularIngreso();
    await api.aprobarPlan(PLAN);
    await api.avanzarDemo('jueves');
    const { plan, juez } = await api.editarMovimiento(PLAN, 'M3', 392);

    expect(estadoDe(plan, 'M3')).toBe('Propuesto');
    expect(juez.decision).toBe('PEDIR_APROBACION');
    const m3 = plan.movimientos.find((m) => m.paso === 'M3')!;
    expect(m3.monto_ars).toBe(450800);
    expect(m3.clave).toBe('plan-ing01-M3.v2');
    expect(plan.libre_usd).toBe(88);
  });

  it('la propuesta nueva se puede aprobar otra vez, aunque el plan ya se había aprobado', async () => {
    await api.configurarDemo({ escenario_fx: 'empeora', inyectar_timeout: false });
    await api.simularIngreso();
    await api.aprobarPlan(PLAN);
    await api.avanzarDemo('jueves');
    await api.editarMovimiento(PLAN, 'M3', 392);

    const segunda = await api.aprobarPlan(PLAN);
    expect(segunda.repetido).toBe(false);
    expect(estadoDe(segunda.plan, 'M3')).toBe('Aprobado');

    const log = await api.obtenerLog();
    expect(log.filter((f) => f.regla === 'Aprobación en CFO Agéntico')).toHaveLength(2);

    // Y se puede terminar de ejecutar con el código de Belo.
    const final = await api.confirmarEnlaceBelo(PLAN, 'M3', '123456');
    expect(estadoDe(final, 'M3')).toBe('Completado');
    expect(final.saldos.ARS).toBe(450800);
  });
});

describe('flujo completo de punta a punta', () => {
  it.each([
    { perfil: 'sofia' as const, conversion: 380, pesos: 450300, usdt: 900, alcancia: 120, libre: 100 },
    {
      perfil: 'pyme' as const,
      conversion: 3545,
      pesos: 4200825,
      usdt: 1255,
      alcancia: 900,
      libre: 300,
    },
  ])('$perfil: login, perfilado, plan, aprobación y jueves', async (caso) => {
    const flujo = new MockCfoApi();
    await flujo.iniciarSesionDemo(caso.perfil);
    await flujo.correrPerfilado();
    await flujo.resolverPropuesta('P1', 'confirmar');

    const plan = (await flujo.simularIngreso())!;
    expect(plan.colchon_cubierto).toBe(true);
    expect(plan.libre_usd).toBe(caso.libre);

    await flujo.aprobarPlan(PLAN);
    await flujo.confirmarEnlaceBelo(PLAN, 'M1', '123456');
    await flujo.avanzarDemo('jueves');
    const final = await flujo.confirmarEnlaceBelo(PLAN, 'M3', '123456');

    expect(final.movimientos.every((m) => m.estado === 'Completado')).toBe(true);
    expect(final.saldos.USDT).toBe(caso.usdt);
    expect(final.saldos.alcancia_impuestos_usd).toBe(caso.alcancia);
    expect(final.saldos.ARS).toBe(caso.pesos);
    expect(final.saldos.USD).toBe(caso.libre);

    const log = await flujo.obtenerLog();
    expect(contar(log, 'ramp.fiat_crypto')).toBe(2);
    expect(contar(log, 'auth.sign_in')).toBe(1);
    expect(log.every((f) => f.live === false)).toBe(true);
  });
});

describe('reiniciar la demo', () => {
  it('borra el plan y el log', async () => {
    await api.simularIngreso();
    await api.aprobarPlan(PLAN);
    await api.reiniciarDemo();

    expect(await api.obtenerLog()).toEqual([]);
    await expect(api.obtenerPlan(PLAN)).rejects.toThrow(/plan/);
  });
});
