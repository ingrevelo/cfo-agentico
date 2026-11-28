// Las 4 lecturas que el agente hace antes de proponer. Salen del MCP Log de verdad,
// no son un texto inventado. No llevan badge: el de la barra de arriba cubre toda la demo.
import type { EntradaLog } from '../../api/tipos';

export default function Lecturas({ lecturas }: { lecturas: EntradaLog[] }) {
  if (lecturas.length === 0) return null;
  return (
    <ul className="space-y-2">
      {lecturas.map((l) => (
        <li key={l.id} className="aparece flex items-start gap-2 text-base text-tinta-suave">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#1F7A57" strokeWidth="3" aria-hidden="true" className="mt-1 shrink-0">
            <path d="M4 12.5 9.5 18 20 6.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="min-w-0 break-all font-mono text-sm">{l.tool}</span>
        </li>
      ))}
    </ul>
  );
}
