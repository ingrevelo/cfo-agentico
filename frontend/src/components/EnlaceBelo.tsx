// El segundo OK (D13): la tarjeta de Belo, dentro de la conversación.
//
// En Belo de verdad, el MCP devuelve un link, la persona ve destino, monto y comisión,
// y confirma con un código que le llega por correo. Acá el código viene precargado
// porque es una demo: 123456.
import { useState } from 'react';
import type { EnlaceBelo as DatosEnlace } from '../api/tipos';

export const CODIGO_PRECARGADO = '123456';

interface Props {
  enlace: DatosEnlace;
  cargando: boolean;
  error: string | null;
  onConfirmar: (codigo: string) => void;
}

export default function EnlaceBelo({ enlace, cargando, error, onConfirmar }: Props) {
  const [codigo, setCodigo] = useState(CODIGO_PRECARGADO);
  const idError = 'error-codigo-' + enlace.paso;
  const idCampo = 'codigo-' + enlace.paso;

  return (
    <section className="tarjeta">
      <h3 className="text-[17px]">Confirmar en Belo</h3>

      <dl className="mt-3 space-y-1 text-base">
        {[
          ['Destino', enlace.destino],
          ['Monto', enlace.monto],
          ['Comisión', enlace.comision],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4">
            <dt className="text-tinta-suave">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-3 text-base text-tinta-suave">Vence en {enlace.vence_en_minutos} min.</p>

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          onConfirmar(codigo);
        }}
      >
        <label htmlFor={idCampo} className="block text-base font-semibold">
          Código de demo
        </label>
        <p className="text-base text-tinta-suave">En Belo real te llega por correo.</p>
        <input
          id={idCampo}
          className="campo mt-2 tracking-[0.3em]"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={codigo}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? idError : undefined}
          onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
        />
        <button
          type="submit"
          className="boton-primario mt-4"
          disabled={cargando || codigo.length !== 6}
          aria-busy={cargando}
        >
          {cargando ? 'Confirmando...' : 'Confirmar en Belo'}
        </button>
      </form>

      {error && (
        <p id={idError} role="alert" className="mt-2 text-base font-medium text-peligro">
          {error}
        </p>
      )}
    </section>
  );
}
