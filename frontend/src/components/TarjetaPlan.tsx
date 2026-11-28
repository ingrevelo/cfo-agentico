// La tarjeta del plan: un movimiento por fila, con monto grande, estado y el por qué.
import type { Movimiento } from '../api/tipos';
import { diaEnCastellano, formatearArs, formatearFx, formatearUsd } from '../formato';
import EstadoBadge from './EstadoBadge';
import SimulatedBadge from './SimulatedBadge';

interface Props {
  titulo: string;
  movimientos: Movimiento[];
}

export default function TarjetaPlan({ titulo, movimientos }: Props) {
  return (
    <section className="tarjeta" aria-label={titulo}>
      <h2 className="text-xl">{titulo}</h2>
      <ul className="mt-4 divide-y divide-black/5">
        {movimientos.map((m) => (
          <li key={m.clave} className="py-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{m.titulo}</p>
              <EstadoBadge estado={m.estado} />
              {m.simulado && <SimulatedBadge motivo={m.motivo_simulado} />}
            </div>
            <p className="mt-2 text-3xl font-bold tracking-[-0.04em]">{formatearUsd(m.monto_usd)}</p>
            {m.monto_ars !== undefined && m.fx !== undefined && (
              <p className="text-sm font-medium text-ash-texto">
                {formatearArs(m.monto_ars)} a {formatearFx(m.fx)}
              </p>
            )}
            <p className="mt-2 text-sm leading-snug text-ash-texto">{m.porque}</p>
            {m.programado_para && m.estado === 'Aprobado' && (
              <p className="mt-1 text-sm text-ash-texto">
                Programado para el {diaEnCastellano(m.programado_para)}.
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
