// Hook chico para no repetir try/catch en cada pantalla.
//
// const guardar = useAccion(api.guardarReglas.bind(api));
// guardar.ejecutar(reglas) -> devuelve el resultado, o undefined si falló.
// guardar.cargando y guardar.error sirven para los estados de la interfaz.
import { useCallback, useState } from 'react';

export interface Accionable<A extends unknown[], R> {
  ejecutar: (...args: A) => Promise<R | undefined>;
  cargando: boolean;
  error: string | null;
  limpiarError: () => void;
}

export function useAccion<A extends unknown[], R>(fn: (...args: A) => Promise<R>): Accionable<A, R> {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ejecutar = useCallback(
    async (...args: A): Promise<R | undefined> => {
      setCargando(true);
      setError(null);
      try {
        return await fn(...args);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Algo falló. Probá de nuevo.');
        return undefined;
      } finally {
        setCargando(false);
      }
    },
    [fn],
  );

  const limpiarError = useCallback(() => setError(null), []);

  return { ejecutar, cargando, error, limpiarError };
}
