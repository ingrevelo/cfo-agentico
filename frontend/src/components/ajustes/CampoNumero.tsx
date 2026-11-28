// Un número editable: etiqueta, ayuda de una línea y error accesible.
interface Props {
  id: string;
  etiqueta: string;
  ayuda: string;
  valor: number;
  sufijo: string;
  error?: string | null;
  insignia?: string;
  onChange: (valor: number) => void;
}

export default function CampoNumero({
  id,
  etiqueta,
  ayuda,
  valor,
  sufijo,
  error,
  insignia,
  onChange,
}: Props) {
  const idError = id + '-error';
  const idAyuda = id + '-ayuda';

  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={id} className="text-base font-semibold">
          {etiqueta}
        </label>
        {insignia && (
          <span className="rounded-full bg-exito-suave px-2 py-1 text-xs font-semibold text-exito-texto">
            {insignia}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          className={'campo' + (error ? ' border-peligro' : '')}
          value={valor}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${idError} ${idAyuda}` : idAyuda}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="shrink-0 text-base text-tinta-suave">{sufijo}</span>
      </div>
      {error && (
        <p id={idError} role="alert" className="mt-1 text-base font-medium text-peligro">
          {error}
        </p>
      )}
      <p id={idAyuda} className="mt-1 text-base text-tinta-suave">
        {ayuda}
      </p>
    </div>
  );
}
