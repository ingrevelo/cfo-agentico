// El MCP Log. En escritorio es una tabla; en celular, tarjetas apiladas,
// porque una tabla de 6 columnas con scroll horizontal no se lee en un teléfono.
// Las filas NO repiten el sello SIMULATED: el de la barra de arriba vale para todo.
import type { EntradaLog, ToolBelo } from '../api/tipos';
import EstadoBadge from './EstadoBadge';

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

const COLUMNAS = ['Hora', 'Paso', 'Tool', 'Regla', 'Estado', 'Monto'];

export default function TablaLog({ log }: { log: EntradaLog[] }) {
  if (log.length === 0) {
    return (
      <p className="text-base text-tinta-suave">
        Todavía no se llamó a ninguna herramienta.
      </p>
    );
  }

  const usadas = new Set(log.map((f) => f.tool));

  return (
    <div>
      <p className="text-base text-tinta-suave">
        Todas las filas son simuladas: la demo no usa el MCP real.
      </p>

      {/* Celular: una tarjeta por fila. */}
      <ul className="mt-3 space-y-3 md:hidden">
        {log.map((f) => (
          <li key={f.id} className="rounded-2xl border border-violeta-suave p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-tinta-suave">{f.hora}</span>
              <span className="text-sm font-semibold">{f.paso}</span>
              <EstadoBadge estado={f.estado} />
            </div>
            <p className="mt-2 font-mono text-sm" title={f.motivo_simulado}>
              {f.tool ?? 'Aprobación en CFO Agéntico'}
            </p>
            <p className="mt-1 text-base text-tinta-suave">{f.regla}</p>
            <p className="mt-1 text-base font-semibold">{f.monto}</p>
          </li>
        ))}
      </ul>

      {/* Escritorio: tabla. */}
      <table className="mt-3 hidden w-full text-left text-base md:table">
        <thead>
          <tr className="border-b border-violeta-claro">
            {COLUMNAS.map((c) => (
              <th key={c} scope="col" className="py-2 pr-3 text-sm font-semibold text-tinta-suave">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {log.map((f) => (
            <tr key={f.id} className="border-b border-violeta-suave align-top">
              <td className="py-2 pr-3 text-sm text-tinta-suave">{f.hora}</td>
              <td className="py-2 pr-3 text-sm font-semibold">{f.paso}</td>
              <td className="py-2 pr-3 font-mono text-sm" title={f.motivo_simulado}>
                {f.tool ?? 'Aprobación en CFO Agéntico'}
              </td>
              <td className="py-2 pr-3 text-sm">{f.regla}</td>
              <td className="py-2 pr-3">
                <EstadoBadge estado={f.estado} />
              </td>
              <td className="py-2 text-sm font-semibold">{f.monto}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h4 className="mt-6 text-base font-semibold">Las 8 herramientas del MCP de Belo</h4>
      <ul className="mt-2 flex flex-wrap gap-2">
        {TOOLS.map(({ tool, nota }) => (
          <li
            key={tool}
            className={
              'rounded-full px-3 py-1 font-mono text-xs ' +
              (usadas.has(tool) ? 'bg-exito-suave text-exito-texto' : 'bg-violeta-suave text-tinta-suave')
            }
            title={usadas.has(tool) ? 'Se usó en esta corrida' : (nota ?? 'No se usó en esta corrida')}
          >
            {tool}
            {nota ? ' · ' + nota : ''}
          </li>
        ))}
        <li className="rounded-full bg-violeta-suave px-3 py-1 font-mono text-xs text-violeta">
          (alcancía) · no existe en la V1
        </li>
      </ul>
    </div>
  );
}
