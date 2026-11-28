import { describe, expect, it } from 'vitest';
import { EXPRESIONES, LADO, RECORTES, SPRITE_ALTO, SPRITE_ANCHO } from './poses';

describe('los recortes del búho', () => {
  it('tiene las 12 expresiones', () => {
    expect(EXPRESIONES).toHaveLength(12);
  });

  it('cada recorte entra entero dentro de la hoja', () => {
    for (const [nombre, r] of Object.entries(RECORTES)) {
      expect(r.x, nombre).toBeGreaterThanOrEqual(0);
      expect(r.y, nombre).toBeGreaterThanOrEqual(0);
      expect(r.x + r.ancho, nombre).toBeLessThanOrEqual(SPRITE_ANCHO);
      expect(r.y + r.alto, nombre).toBeLessThanOrEqual(SPRITE_ALTO);
    }
  });

  it('todos los recortes son cuadrados y del mismo tamaño, así ninguna pose se achata', () => {
    for (const [nombre, r] of Object.entries(RECORTES)) {
      expect(r.ancho, nombre).toBe(LADO);
      expect(r.alto, nombre).toBe(LADO);
    }
  });

  it('no hay dos poses en el mismo lugar', () => {
    const lugares = Object.values(RECORTES).map((r) => `${r.x}-${r.y}`);
    expect(new Set(lugares).size).toBe(lugares.length);
  });

  it('los recortes no se pisan entre sí', () => {
    const lista = Object.entries(RECORTES);
    for (let i = 0; i < lista.length; i++) {
      for (let j = i + 1; j < lista.length; j++) {
        const [na, a] = lista[i];
        const [nb, b] = lista[j];
        const pisaX = a.x < b.x + b.ancho && b.x < a.x + a.ancho;
        const pisaY = a.y < b.y + b.alto && b.y < a.y + a.alto;
        expect(pisaX && pisaY, `${na} se pisa con ${nb}`).toBe(false);
      }
    }
  });
});
