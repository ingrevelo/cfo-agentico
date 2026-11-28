// La marca, el ÚNICO badge SIMULATED de la app, la identidad de la demo y los ajustes.
import Buho from './buho/Buho';
import SimulatedBadge from './SimulatedBadge';
import { useApp } from '../state/contexto';

export default function BarraSuperior({ onAjustes }: { onAjustes: () => void }) {
  const { estado } = useApp();

  return (
    <header className="flex flex-wrap items-center gap-x-2 gap-y-1 py-4">
      <Buho expresion="reposo" tamano={32} redondo />
      <p className="text-base font-semibold tracking-[-0.04em]">CFO Agéntico</p>
      <SimulatedBadge motivo="La demo no usa el MCP real de Belo (D16)" />

      <span className="ml-auto flex min-w-0 items-center gap-2">
        {estado.sesion && (
          <span className="chip max-w-[45vw] truncate text-sm">
            Demo · {estado.sesion.perfil.name}
          </span>
        )}
        <button
          type="button"
          onClick={onAjustes}
          className="flex h-11 w-11 items-center justify-center rounded-full text-tinta-suave hover:bg-violeta-suave hover:text-violeta"
          aria-label="Ajustes"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="3.2" />
            <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" strokeLinecap="round" />
          </svg>
        </button>
      </span>
    </header>
  );
}
