// Los avisos chicos que se repiten en todas las pantallas: cargando, error, vacío,
// banner de datos sintéticos y el título que recibe el foco al cambiar de pantalla.
import { useEffect, useRef, type ReactNode } from 'react';
import SimulatedBadge from './SimulatedBadge';

/** Mientras una llamada a la API está en curso. role="status" lo anuncia sin interrumpir. */
export function Cargando({ texto = 'Cargando...' }: { texto?: string }) {
  return (
    <p role="status" className="py-6 text-sm text-ash-texto">
      {texto}
    </p>
  );
}

/** Un error con su botón para volver a intentar. role="alert" lo anuncia enseguida. */
export function ErrorAviso({ mensaje, onReintentar }: { mensaje: string; onReintentar?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-900">No se pudo completar</p>
      <p className="mt-1 text-sm text-red-900">{mensaje}</p>
      {onReintentar && (
        <button type="button" className="boton-texto mt-1 px-0 text-red-900" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}

/** Cuando no hay nada que mostrar todavía. */
export function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="tarjeta border border-dashed border-black/10 bg-transparent text-center">
      <p className="text-sm font-semibold">{titulo}</p>
      {children && <p className="mx-auto mt-2 max-w-sm text-sm text-ash-texto">{children}</p>}
    </div>
  );
}

/** Banner permanente. Nunca se finge una operación real (D10). */
export function AvisoSintetico() {
  return (
    <p className="flex flex-wrap items-center gap-2 rounded-2xl bg-violeta/5 px-3 py-2 text-xs text-ash-texto">
      <SimulatedBadge motivo="La URL pública no usa el MCP real (D16)" />
      Demo con datos sintéticos. Todo corre contra una simulación: no se mueve dinero real.
    </p>
  );
}

/** El h1 de cada pantalla. Recibe el foco al montarse, para quien navega con teclado. */
export function TituloPantalla({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <div>
      <h1 ref={ref} tabIndex={-1} className="text-3xl outline-none">
        {children}
      </h1>
      {sub && <p className="mt-2 text-sm text-ash-texto">{sub}</p>}
    </div>
  );
}
