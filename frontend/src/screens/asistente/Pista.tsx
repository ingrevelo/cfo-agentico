// La pista de 4 puntos de cada movimiento: dónde está ese dinero ahora.
// Nunca solo color: cada punto lleva su nombre.
import type { Estado } from '../../api/tipos';

const PUNTOS = ['Propuesto', 'Aprobado', 'Ejecutando', 'Completado'] as const;

/** Los estados que se salen del camino tienen su propio aviso, no un punto. */
const APARTE: Partial<Record<Estado, string>> = {
  Retenido: 'Retenido',
  Desconocido: 'Desconocido',
  Bloqueado: 'Bloqueado',
  Rechazado: 'Rechazado',
};

export default function Pista({ estado, titulo }: { estado: Estado; titulo: string }) {
  const aparte = APARTE[estado];
  const alcanzado = PUNTOS.indexOf(estado as (typeof PUNTOS)[number]);

  return (
    <div>
      <p className="break-words text-base font-semibold">{titulo}</p>
      {aparte ? (
        <p className="mt-2 inline-block rounded-full bg-aviso-suave px-3 py-1 text-sm font-semibold text-aviso-texto">
          {aparte}
        </p>
      ) : (
        <ol className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          {PUNTOS.map((p, i) => {
            const hecho = i <= alcanzado;
            return (
              <li key={p} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={
                    'h-2.5 w-2.5 rounded-full ' + (hecho ? 'bg-exito' : 'bg-violeta-claro')
                  }
                />
                <span className={'text-sm ' + (hecho ? 'font-semibold text-tinta' : 'text-tinta-suave')}>
                  {p}
                </span>
                {i < PUNTOS.length - 1 && (
                  <span aria-hidden="true" className="h-px w-4 bg-violeta-claro" />
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
