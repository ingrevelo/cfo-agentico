import EstadoBadge, { type Estado } from './EstadoBadge';
import SimulatedBadge from './SimulatedBadge';

export interface MovimientoPlan {
  id: string;
  titulo: string;
  /** Monto grande, ya formateado. Ej: "USD 900". */
  monto: string;
  /** Línea chica debajo del monto, si hace falta. Ej: "450.300 ARS a 1.185". */
  detalle?: string;
  porque: string;
  estado: Estado;
  simulado?: boolean;
}

interface Props {
  titulo: string;
  movimientos: MovimientoPlan[];
}

/** La tarjeta del plan: un movimiento por fila, con monto grande y el por qué en gris. */
export default function TarjetaPlan({ titulo, movimientos }: Props) {
  return (
    <section className="tarjeta" aria-label={titulo}>
      <h2 className="text-xl">{titulo}</h2>
      <ul className="mt-4 divide-y divide-black/5">
        {movimientos.map((m) => (
          <li key={m.id} className="py-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{m.titulo}</p>
              <EstadoBadge estado={m.estado} />
              {m.simulado && <SimulatedBadge />}
            </div>
            <p className="mt-2 text-3xl font-bold tracking-[-0.04em]">{m.monto}</p>
            {m.detalle && <p className="text-sm font-medium text-ash">{m.detalle}</p>}
            <p className="mt-2 text-sm leading-snug text-ash">{m.porque}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
