// Un número editable con su etiqueta, su explicación y su mensaje de error.
// Cada input tiene label asociado y, si hay error, aria-invalid y aria-describedby.
interface Props {
  id: string;
  etiqueta: string;
  explicacion: string;
  valor: number;
  sufijo: string;
  error?: string;
  etiquetaOrigen?: string;
  onChange: (valor: number) => void;
}

export default function CampoNumero({
  id,
  etiqueta,
  explicacion,
  valor,
  sufijo,
  error,
  etiquetaOrigen,
  onChange,
}: Props) {
  const idError = id + '-error';
  const idAyuda = id + '-ayuda';

  return (
    <div className="tarjeta">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="text-sm font-semibold">
          {etiqueta}
        </label>
        {etiquetaOrigen && (
          <span className="rounded-full bg-mint/30 px-2 py-1 text-[11px] font-semibold">
            {etiquetaOrigen}
          </span>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className={'campo' + (error ? ' border-red-400' : '')}
          value={valor}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? idError + ' ' + idAyuda : idAyuda}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="shrink-0 text-sm font-medium text-ash-texto">{sufijo}</span>
      </div>
      {error && (
        <p id={idError} role="alert" className="mt-2 text-sm font-medium text-red-900">
          {error}
        </p>
      )}
      <p id={idAyuda} className="mt-2 text-sm leading-snug text-ash-texto">
        {explicacion}
      </p>
    </div>
  );
}
