// La propuesta del plan: una fila por movimiento, con monto grande.
import type { Movimiento, Plan } from '../../api/tipos';
import { diaEnCastellano, formatearArs, formatearUsd } from '../../formato';

function Icono({ tipo }: { tipo: Movimiento['tipo'] | 'libre' }) {
  const trazo = { fill: 'none', stroke: 'currentColor', strokeWidth: 2 } as const;
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" {...trazo} aria-hidden="true">
      {tipo === 'rendimiento' && <path d="M4 17 9 11l4 4 7-8M15 4h5v5" strokeLinecap="round" />}
      {tipo === 'alcancia' && <path d="M5 10h14v9H5zM8 10V6a4 4 0 0 1 8 0v4M12 13v3" strokeLinecap="round" />}
      {tipo === 'conversion_a_pesos' && (
        <path d="M4 8h14l-3-3M20 16H6l3 3" strokeLinecap="round" strokeLinejoin="round" />
      )}
      {tipo === 'libre' && <path d="M3 7h18v11H3zM3 11h18M7 15h3" strokeLinecap="round" />}
    </svg>
  );
}

function Fila({
  tipo,
  etiqueta,
  monto,
  detalle,
  verde,
}: {
  tipo: Movimiento['tipo'] | 'libre';
  etiqueta: string;
  monto: string;
  detalle?: string;
  verde?: boolean;
}) {
  return (
    <li className="flex items-start gap-3 py-3">
      <span className={verde ? 'text-exito-texto' : 'text-violeta-medio'}>
        <Icono tipo={tipo} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block break-words text-base text-tinta-suave">{etiqueta}</span>
        <span
          className={
            'block break-words text-4xl font-bold tracking-[-0.04em] ' + (verde ? 'text-exito-texto' : '')
          }
        >
          {monto}
        </span>
        {detalle && <span className="block text-base text-tinta-suave">{detalle}</span>}
      </span>
    </li>
  );
}

export default function TarjetaPropuesta({ plan, vencimiento }: { plan: Plan; vencimiento: string }) {
  const etiquetaDe = (m: Movimiento) =>
    m.tipo === 'rendimiento'
      ? 'Rendimientos en ' + m.moneda_destino
      : m.tipo === 'alcancia'
        ? 'Reserva para impuestos'
        : 'Conversión para ' + vencimiento;

  const detalleDe = (m: Movimiento) =>
    m.monto_ars !== undefined
      ? formatearArs(m.monto_ars) + (m.programado_para ? ', el ' + diaEnCastellano(m.programado_para) : '')
      : undefined;

  return (
    <section className="overflow-hidden rounded-3xl border border-violeta-suave bg-tarjeta">
      <h2 className="bg-violeta-medio px-4 py-3 text-[17px] text-white">Tu propuesta</h2>
      <ul className="divide-y divide-violeta-suave px-4">
        {plan.movimientos.map((m) => (
          <Fila
            key={m.clave}
            tipo={m.tipo}
            etiqueta={etiquetaDe(m)}
            monto={formatearUsd(m.monto_usd)}
            detalle={detalleDe(m)}
          />
        ))}
        <Fila tipo="libre" etiqueta="Saldo libre" monto={formatearUsd(plan.libre_usd)} verde />
      </ul>
    </section>
  );
}
