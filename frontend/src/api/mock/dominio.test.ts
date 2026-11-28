// Tests del dominio espejo. Son las cuentas y las reglas que frenan el dinero,
// así que se prueban con los números exactos del caso de prueba.
import { describe, expect, it } from 'vitest';
import pymeDemo from '../../data/pyme-demo.json';
import sofiaDemo from '../../data/sofia-demo.json';
import type { DatosDemo, Movimiento, ReglasDuras, Saldos } from '../tipos';
import {
  calcularPlan,
  esTransicionValida,
  evaluarJuez,
  fxFueraDeBanda,
  montoCasoRojo,
  transicionar,
} from './dominio';

const sofia = sofiaDemo as DatosDemo;
const pyme = pymeDemo as DatosDemo;

const movimiento = (parcial: Partial<Movimiento> = {}): Movimiento => ({
  paso: 'M3',
  clave: 'plan-ing01-M3',
  tipo: 'conversion_a_pesos',
  titulo: 'Cambiar a pesos',
  monto_usd: 380,
  moneda_destino: 'ARS',
  estado: 'Propuesto',
  simulado: true,
  motivo_simulado: 'demo',
  porque: 'alquiler',
  ...parcial,
});

const saldos = (usd: number): Saldos => ({
  USD: usd,
  USDT: 0,
  alcancia_impuestos_usd: 0,
  ARS: 0,
});

describe('calcularPlan', () => {
  it('reparte el ingreso de Sofía exactamente como el caso de prueba', () => {
    const plan = calcularPlan(sofia, 1500);
    expect(plan).not.toBeNull();
    const p = plan!;
    const m1 = p.movimientos.find((m) => m.tipo === 'rendimiento')!;
    const m2 = p.movimientos.find((m) => m.tipo === 'alcancia')!;
    const m3 = p.movimientos.find((m) => m.tipo === 'conversion_a_pesos')!;

    expect(m2.monto_usd).toBe(120);
    expect(p.libre_usd).toBe(100);
    expect(m3.monto_usd).toBe(380);
    expect(m3.monto_ars).toBe(450300);
    expect(m3.fx).toBe(1185);
    expect(m1.monto_usd).toBe(900);
    expect(p.quedan_en_dolares).toBe(1120);
    expect(p.colchon_cubierto).toBe(true);
    expect(p.movimientos.map((m) => m.paso)).toEqual(['M1', 'M2', 'M3']);
  });

  it('reparte el ingreso de la pyme con sus propias reglas', () => {
    const p = calcularPlan(pyme, 6000)!;
    const m1 = p.movimientos.find((m) => m.tipo === 'rendimiento')!;
    const m2 = p.movimientos.find((m) => m.tipo === 'alcancia')!;
    const m3 = p.movimientos.find((m) => m.tipo === 'conversion_a_pesos')!;

    expect(m2.monto_usd).toBe(900);
    expect(p.libre_usd).toBe(300);
    expect(m3.monto_usd).toBe(3545);
    expect(m3.monto_ars).toBe(4200825);
    expect(m1.monto_usd).toBe(1255);
    expect(p.quedan_en_dolares).toBe(2455);
    expect(p.colchon_cubierto).toBe(true);
  });

  it('no arma plan si el ingreso no alcanza el disparo mínimo', () => {
    expect(calcularPlan(sofia, 99)).toBeNull();
  });

  it('no incluye el movimiento de cambiar a pesos si no vence nada esta semana', () => {
    const soloMensuales: DatosDemo = {
      ...sofia,
      dues: sofia.dues.filter((d) => d.due_day !== undefined),
    };
    const p = calcularPlan(soloMensuales, 1500)!;
    expect(p.movimientos.some((m) => m.tipo === 'conversion_a_pesos')).toBe(false);
    expect(p.quedan_en_dolares).toBe(1500);
  });

  it('calcula la banda de FX con la tolerancia de las reglas', () => {
    const p = calcularPlan(sofia, 1500)!;
    expect(p.banda_fx).toEqual({ min: 1161, max: 1209 });
  });
});

describe('evaluarJuez', () => {
  it('bloquea el Caso Rojo de Sofía y dice hasta cuánto puede cambiar', () => {
    const r = evaluarJuez(movimiento({ monto_usd: 1100 }), sofia.hard_rules, saldos(1500));
    expect(r.decision).toBe('BLOQUEAR');
    expect(r.razones.join(' ')).toContain('te quedarían USD 400');
    expect(r.razones.join(' ')).toContain('mínimo es 500');
    expect(r.razones.join(' ')).toContain('hasta USD 1.000');
  });

  it('bloquea el Caso Rojo de la pyme', () => {
    const r = evaluarJuez(movimiento({ monto_usd: 4100 }), pyme.hard_rules, saldos(6000));
    expect(r.decision).toBe('BLOQUEAR');
    expect(r.razones.join(' ')).toContain('te quedarían USD 1.900');
  });

  it('deja pasar los montos del plan de cada perfil', () => {
    expect(evaluarJuez(movimiento({ monto_usd: 380 }), sofia.hard_rules, saldos(1500)).decision).toBe(
      'PEDIR_APROBACION',
    );
    expect(
      evaluarJuez(movimiento({ monto_usd: 3545 }), pyme.hard_rules, saldos(6000)).decision,
    ).toBe('PEDIR_APROBACION');
  });

  it('pide un OK adicional si supera el tope pero respeta el colchón', () => {
    const reglas: ReglasDuras = { ...sofia.hard_rules, min_cushion_usd: 100 };
    const r = evaluarJuez(movimiento({ monto_usd: 500 }), reglas, saldos(1500));
    expect(r.decision).toBe('PEDIR_OK_ADICIONAL');
    expect(r.razones.join(' ')).toContain('supera tu tope');
  });

  it('no toca el colchón cuando el dinero se queda en dólares', () => {
    const r = evaluarJuez(
      movimiento({ tipo: 'rendimiento', moneda_destino: 'USDT', monto_usd: 1400 }),
      sofia.hard_rules,
      saldos(1500),
    );
    expect(r.decision).toBe('PEDIR_APROBACION');
  });

  it('bloquea una moneda que no está permitida', () => {
    const r = evaluarJuez(
      movimiento({ moneda_destino: 'BRL', monto_usd: 10 }),
      sofia.hard_rules,
      saldos(1500),
    );
    expect(r.decision).toBe('BLOQUEAR');
    expect(r.razones.join(' ')).toContain('BRL');
  });

  it('si ya evaluó ese movimiento devuelve la misma decisión', () => {
    const previo = { decision: 'BLOQUEAR' as const, razones: ['decidido antes'] };
    const r = evaluarJuez(movimiento({ monto_usd: 380 }), sofia.hard_rules, saldos(1500), previo);
    expect(r).toBe(previo);
  });

  it('precarga el Caso Rojo con un monto que rompe el colchón', () => {
    expect(montoCasoRojo(saldos(1500), sofia.hard_rules)).toBe(1100);
    expect(montoCasoRojo(saldos(6000), pyme.hard_rules)).toBe(4100);
  });
});

describe('máquina de estados', () => {
  it('acepta las transiciones de la tabla', () => {
    expect(esTransicionValida('Propuesto', 'Aprobado')).toBe(true);
    expect(esTransicionValida('Aprobado', 'Ejecutando')).toBe(true);
    expect(esTransicionValida('Aprobado', 'Retenido')).toBe(true);
    expect(esTransicionValida('Retenido', 'Propuesto')).toBe(true);
    expect(esTransicionValida('Ejecutando', 'Completado')).toBe(true);
    expect(esTransicionValida('Ejecutando', 'Desconocido')).toBe(true);
    expect(esTransicionValida('Desconocido', 'Completado')).toBe(true);
  });

  it('rechaza las que no están', () => {
    expect(esTransicionValida('Completado', 'Aprobado')).toBe(false);
    expect(esTransicionValida('Propuesto', 'Completado')).toBe(false);
    expect(() => transicionar(movimiento({ estado: 'Completado' }), 'Aprobado')).toThrow(
      /Transición inválida/,
    );
  });
});

describe('tolerancia de FX', () => {
  it('retiene si el dólar empeoró más de la tolerancia', () => {
    expect(fxFueraDeBanda(1185, 1150, 2)).toBe(true);
  });

  it('no retiene si se movió poco o a favor', () => {
    expect(fxFueraDeBanda(1185, 1190, 2)).toBe(false);
    expect(fxFueraDeBanda(1185, 1170, 2)).toBe(false);
  });
});
