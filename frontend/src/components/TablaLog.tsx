// El MCP Log. En escritorio es una tabla; en celular, tarjetas apiladas,
// porque una tabla de 6 columnas con scroll horizontal no se lee en un teléfono.
import type { EntradaLog, ToolBelo } from '../../api/tipos';
import EstadoBadge from '../../components/EstadoBadge';
import SimulatedBadge from '../../components/SimulatedBadge';
import { Vacio } from '../../components/avisos';

/** Las 8 tools del MCP V1 de Belo, para mostrar cuáles se usaron. */
const TOOLS: { tool: ToolBelo; nota?: string }[] = [
  { tool: 'auth.sign_in' },
  { tool: 'account.balances' },
  { tool: 'account.yields' },
  { tool: 'account.activity' },
  { tool: 'exchange.fx' },
  { tool: 'ramp.fiat_crypto' },
  { tool: 'transaction.approve' },
  { tool: 'card.manage', nota: 'no se usa en el MVP' },
];

const COLUMNAS = ['Hora', 'Paso', 'Tool', 'Regla', 'Estado', 'Monto', 'Live'];

export default function TablaLog({ log }: { log: EntradaLog[] }) {
  if (log.length === 0) {
    return (
      <Vacio titulo="El registro está vacío">
        Todavía no se llamó a ninguna herramienta. Simulá un ingreso y aprobá el plan.
      </Vacio>
    );
  }

  const usadas = new Set(log.map((f) => f.tool));

  return (
    <div>
      {/* Celular: una tarjeta por fila. */}
      <ul className="space-y-3 md:hidden">
        {log.map((f) => (
          <li key={f.id} className="rounded-2xl border border-black/5 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-ash-texto">{f.hora}</span>
              <span className="text-xs font-semibold">{f.paso}</span>
              <EstadoBadge estado={f.estado} />
              <SimulatedBadge motivo={f.motivo_simulado} />
            </div>
            <p className="mt-2 font-mono text-xs">{f.tool ?? 'Aprobación en CFO Agéntico'}</p>
            <p className="mt-1 text-sm text-ash-texto">{f.regla}</p>
            <p className="mt-1 text-sm font-semibold">{f.monto}</p>
          </li>
        ))}
      </ul>

      {/* Escritorio: tabla. */}
      <table className="hidden w-full text-left text-sm md:table">
        <thead>
          <tr className="border-b border-black/10">
            {COLUMNAS.map((c) => (
              <th key={c} scope="col" className="py-2 pr-3 text-xs font-semibold text-ash-texto">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {log.map((f) => (
            <tr key={f.id} className="border-b border-black/5 align-top">
              <td className="py-2 pr-3 text-xs text-ash-texto">{f.hora}</td>
              <td className="py-2 pr-3 text-xs font-semibold">{f.paso}</td>
              <td className="py-2 pr-3 font-mono text-xs">
                {f.tool ?? 'Aprobación en CFO Agéntico'}
              </td>
              <td className="py-2 pr-3 text-xs">{f.regla}</td>
              <td className="py-2 pr-3">
                <EstadoBadge estado={f.estado} />
              </td>
              <td className="py-2 pr-3 text-xs font-semibold">{f.monto}</td>
              <td className="py-2">
                <SimulatedBadge motivo={f.motivo_simulado} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="mt-6 text-sm font-semibold">Las 8 herramientas del MCP de Belo</h3>
      <ul className="mt-2 flex flex-wrap gap-2">
        {TOOLS.map(({ tool, nota }) => (
          <li
            key={tool}
            className={
              'rounded-full px-3 py-1 font-mono text-[11px] ' +
              (usadas.has(tool) ? 'bg-mint/40 text-ink' : 'bg-black/5 text-ash-texto')
            }
            title={usadas.has(tool) ? 'Se usó en esta corrida' : (nota ?? 'No se usó en esta corrida')}
          >
            {tool}
            {nota ? ' · ' + nota : ''}
          </li>
        ))}
        <li className="rounded-full bg-violeta/10 px-3 py-1 font-mono text-[11px] text-violeta">
          (alcancía) · no existe en la V1
        </li>
      </ul>
    </div>
  );
}
