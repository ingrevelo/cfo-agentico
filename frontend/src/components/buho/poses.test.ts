import { describe, expect, it } from 'vitest';
import { CELDAS, COLUMNAS, EXPRESIONES, FILAS } from './poses';

describe('el mapa de poses del búho', () => {
  it('tiene las 12 expresiones', () => {
    expect(EXPRESIONES).toHaveLength(12);
  });

  it('cada pose cae dentro de la hoja de 3 filas por 4 columnas', () => {
    for (const [fila, columna] of Object.values(CELDAS)) {
      expect(fila).toBeGreaterThanOrEqual(0);
      expect(fila).toBeLessThan(FILAS);
      expect(columna).toBeGreaterThanOrEqual(0);
      expect(columna).toBeLessThan(COLUMNAS);
    }
  });

  it('no hay dos poses en la misma celda', () => {
    const celdas = Object.values(CELDAS).map(([f, c]) => `${f}-${c}`);
    expect(new Set(celdas).size).toBe(celdas.length);
  });
});
