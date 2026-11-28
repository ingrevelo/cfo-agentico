// El segundo OK: el link de aprobación de Belo (D13).
//
// En la versión real, el MCP devuelve un link, la persona ve destino, monto y comisión,
// y confirma con un código que le llega por correo. El agente se entera después.
// Acá está simulado: el código de la demo es 123456.
import { useState } from 'react';
import type { EnlaceBelo as DatosEnlace } from '../api/tipos';
import SimulatedBadge from './SimulatedBadge';

interface Props {
  enlace: DatosEnlace;
  cargando: boolean;
  error: string | null;
  onConfirmar: (codigo: string) => void;
}

export default function EnlaceBelo({ enlace, cargando, error, onConfirmar }: Props) {
  const [codigo, setCodigo] = useState('');
  const idError = 'error-codigo-' + enlace.paso;

  return (
    <div className="tarjeta border border-violeta/20">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold">Aprobar en Belo</h3>
        <SimulatedBadge motivo="El link y el código son simulados (D16)" />
      </div>

      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ash-texto">Destino</dt>
          <dd className="text-right font-medium">{enlace.destino}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ash-texto">Monto</dt>
          <dd className="text-right font-medium">{enlace.monto}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ash-texto">Comisión</dt>
          <dd className="text-right font-medium">{enlace.comision}</dd>
        </div>
      </dl>

      <p className="mt-3 text-sm text-ash-texto">
        Este link vence en {enlace.vence_en_minutos} minutos. En la versión real, Belo te manda este
        código por correo. Para la demo, el código es <strong className="text-ink">123456</strong>.
      </p>

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirmar(codigo);
        }}
      >
        <div className="flex-1">
          <label htmlFor={'codigo-' + enlace.paso} className="block text-sm font-semibold">
            Código de 6 dígitos
          </label>
          <input
            id={'codigo-' + enlace.paso}
            className="campo mt-1 tracking-[0.3em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={codigo}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? idError : undefined}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
          />
        </div>
        <button
          type="submit"
          className="boton-primario"
          disabled={cargando || codigo.length !== 6}
          aria-busy={cargando}
        >
          {cargando ? 'Confirmando...' : 'Confirmar código'}
        </button>
      </form>

      {error && (
        <p id={idError} role="alert" className="mt-2 text-sm font-medium text-red-900">
          {error}
        </p>
      )}
    </div>
  );
}
