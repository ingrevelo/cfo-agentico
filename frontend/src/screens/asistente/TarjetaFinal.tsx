// Cierre: la etiqueta verde, el detalle plegado del MCP Log, Premium y reiniciar.
import type { EntradaLog } from '../../api/tipos';
import Buho from '../../components/buho/Buho';
import TablaLog from '../../components/TablaLog';

interface Props {
  log: EntradaLog[];
  onReiniciar: () => void;
  reiniciando: boolean;
}

export default function TarjetaFinal({ log, onReiniciar, reiniciando }: Props) {
  return (
    <div className="space-y-4">
      <p className="inline-flex items-center gap-2 rounded-full bg-exito-suave px-3 py-1 text-sm font-semibold text-exito-texto">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
          <path d="M4 12.5 9.5 18 20 6.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Plan completado
      </p>

      <details className="tarjeta">
        <summary className="cursor-pointer text-base font-semibold text-violeta">
          Ver detalle (MCP Log)
        </summary>
        <div className="mt-4">
          <TablaLog log={log} />
        </div>
      </details>

      <section className="tarjeta flex items-center gap-3">
        <Buho expresion="idea" tamano={56} redondo />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-base font-semibold">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 11h12v9H6zM9 11V7a3 3 0 0 1 6 0v4" strokeLinejoin="round" />
            </svg>
            Premium
          </p>
          <p className="text-base text-tinta-suave">
            Con Premium te aviso del dólar según tu regla.
          </p>
          <button type="button" className="boton-secundario mt-1 px-0" disabled aria-disabled="true">
            Próximamente
          </button>
        </div>
      </section>

      <button
        type="button"
        className="boton-secundario w-full"
        onClick={onReiniciar}
        disabled={reiniciando}
        aria-busy={reiniciando}
      >
        {reiniciando ? 'Reiniciando...' : 'Reiniciar demo'}
      </button>
    </div>
  );
}
