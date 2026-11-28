import { describe, expect, it } from 'vitest';
import { crearGuardia } from './guardia';

describe('el cerrojo que evita el doble clic (Bug 1)', () => {
  it('deja pasar una sola vez', () => {
    const g = crearGuardia();
    expect(g.tomar()).toBe(true);
    expect(g.tomar()).toBe(false);
    expect(g.tomar()).toBe(false);
  });

  it('dos clics en el mismo instante arrancan una sola sesión', () => {
    const g = crearGuardia();
    const iniciadas: string[] = [];
    const elegir = (perfil: string) => {
      if (!g.tomar()) return;
      iniciadas.push(perfil);
    };

    // Se tocan las dos opciones antes de que React vuelva a dibujar.
    elegir('sofia');
    elegir('pyme');

    expect(iniciadas).toEqual(['sofia']);
  });

  it('si falla, se libera y se puede reintentar', () => {
    const g = crearGuardia();
    g.tomar();
    g.liberar();
    expect(g.ocupado()).toBe(false);
    expect(g.tomar()).toBe(true);
  });
});
