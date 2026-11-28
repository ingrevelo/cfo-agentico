// Los avisos chicos que se repiten: cargando y error.
export function Cargando({ texto = 'Cargando...' }: { texto?: string }) {
  return (
    <p role="status" className="py-2 text-base text-tinta-suave">
      {texto}
    </p>
  );
}

export function ErrorAviso({
  mensaje,
  onReintentar,
}: {
  mensaje: string;
  onReintentar?: () => void;
}) {
  return (
    <div role="alert" className="rounded-3xl bg-peligro-suave p-4">
      <p className="text-base font-semibold text-peligro">No se pudo completar</p>
      <p className="mt-1 text-base text-tinta">{mensaje}</p>
      {onReintentar && (
        <button type="button" className="boton-secundario mt-1 px-0" onClick={onReintentar}>
          Reintentar
        </button>
      )}
    </div>
  );
}
