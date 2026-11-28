import { describe, expect, it } from 'vitest';
import type { Estado, Movimiento, Plan, Reglas, Sesion } from '../api/tipos';
import { faseDe } from './fases';
import { ESTADO_INICIAL, reducer, type EstadoApp } from './reducer';

const movimiento = (estado: Estado, paso: Movimiento['paso']): Movimiento => ({
  paso,
  clave: `plan-ing01-${paso}`,
  tipo: paso === 'M3' ? 'conversion_a_pesos' : 'rendimiento',
  titulo: 'x',
  monto_usd: 1,
  moneda_destino: 'USD',
  estado,
  simulado: true,
  motivo_simulado: 'demo',
  porque: 'x',
});

const planCon = (...estados: Estado[]): Plan => ({
  plan_id: 'plan-ing01',
  ingreso_usd: 1500,
  movimientos: estados.map((e, i) => movimiento(e, (['M1', 'M2', 'M3'] as const)[i])),
  libre_usd: 100,
  quedan_en_dolares: 1120,
  colchon_cubierto: true,
  saldos: { USD: 1500, USDT: 0, alcancia_impuestos_usd: 0, ARS: 0 },
  fx: 1185,
});

describe('faseDe', () => {
  it('sin plan todavía está cargando', () => {
    expect(faseDe(null)).toBe('cargando');
  });

  it('reconoce cada fase', () => {
    expect(faseDe(planCon('Propuesto', 'Propuesto', 'Propuesto'))).toBe('propuesta');
    expect(faseDe(planCon('Aprobado', 'Completado', 'Aprobado'))).toBe('esperando_belo');
    expect(faseDe(planCon('Completado', 'Completado', 'Ejecutando'))).toBe('ejecutando');
    expect(faseDe(planCon('Completado', 'Completado', 'Completado'))).toBe('completado');
  });

  it('lo que necesita atención gana', () => {
    expect(faseDe(planCon('Completado', 'Completado', 'Retenido'))).toBe('retenido');
    expect(faseDe(planCon('Desconocido', 'Completado', 'Retenido'))).toBe('desconocido');
  });
});

const sesion = (perfil_id: 'sofia' | 'pyme'): Sesion => ({
  perfil_id,
  user_id: perfil_id + '-demo',
  perfil: { name: 'X', city: 'Y', occupation: 'Z', income_currency: 'USD' },
  saldos: { USD: 1500, USDT: 0, alcancia_impuestos_usd: 0, ARS: 0 },
  fx: 1185,
});

const reglas = { user_id: 'x' } as Reglas;

describe('reducer', () => {
  it('la home lleva a la pregunta del modo', () => {
    const r = reducer(ESTADO_INICIAL, { tipo: 'ir', vista: 'modo' });
    expect(r.vista).toBe('modo');
  });

  it('elegir una persona lleva al asistente con esa sesión', () => {
    let e: EstadoApp = reducer(ESTADO_INICIAL, { tipo: 'iniciando', perfil_id: 'sofia' });
    e = reducer(e, { tipo: 'sesion', sesion: sesion('sofia'), reglas });
    expect(e.vista).toBe('asistente');
    expect(e.sesion?.perfil_id).toBe('sofia');
    expect(e.iniciando).toBeNull();
  });

  it('un segundo clic mientras carga no arranca otra persona (Bug 1)', () => {
    const primero = reducer(ESTADO_INICIAL, { tipo: 'iniciando', perfil_id: 'sofia' });
    const segundo = reducer(primero, { tipo: 'iniciando', perfil_id: 'pyme' });
    const tercero = reducer(segundo, { tipo: 'iniciando', perfil_id: 'sofia' });

    expect(segundo).toBe(primero); // ni siquiera cambia el objeto
    expect(tercero.iniciando).toBe('sofia');
    expect(tercero.iniciando).not.toBe('pyme');
  });

  it('reiniciar vuelve a la home y borra todo', () => {
    let e: EstadoApp = reducer(ESTADO_INICIAL, { tipo: 'iniciando', perfil_id: 'pyme' });
    e = reducer(e, { tipo: 'sesion', sesion: sesion('pyme'), reglas });
    e = reducer(e, { tipo: 'reiniciar' });

    expect(e.vista).toBe('home');
    expect(e.sesion).toBeNull();
    expect(e.plan).toBeNull();
    expect(e.iniciando).toBeNull();
  });
});
