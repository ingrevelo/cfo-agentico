// La única acción primaria de cada pantalla. En celular queda fija abajo (al alcance
// del pulgar) y en pantallas grandes vuelve al flujo normal del contenido.
import type { ReactNode } from 'react';

interface Props {
  etiqueta: string;
  /** Texto mientras la acción corre, por ejemplo "Aprobando...". */
  etiquetaCargando?: string;
  onClick: () => void;
  cargando?: boolean;
  deshabilitado?: boolean;
  /** Acción secundaria, de texto, al lado de la primaria. */
  secundaria?: ReactNode;
}

export default function BarraAccion({
  etiqueta,
  etiquetaCargando,
  onClick,
  cargando = false,
  deshabilitado = false,
  secundaria,
}: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-10 border-t border-black/5 bg-fog/95 px-4 py-3 backdrop-blur md:static md:border-0 md:bg-transparent md:px-0 md:py-0">
      <div className="mx-auto flex max-w-3xl flex-col items-stretch gap-2 md:flex-row md:items-center">
        <button
          type="button"
          className="boton-primario w-full md:w-auto md:px-8"
          onClick={onClick}
          disabled={cargando || deshabilitado}
          aria-busy={cargando}
        >
          {cargando ? (etiquetaCargando ?? 'Un momento...') : etiqueta}
        </button>
        {secundaria}
      </div>
    </div>
  );
}
