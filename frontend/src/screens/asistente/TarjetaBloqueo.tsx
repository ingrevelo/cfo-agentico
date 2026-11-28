// Caso Rojo: el motor frenó la operación. Los montos salen de la razón del juez,
// no están escritos a mano acá.
import type { ResultadoJuez } from '../../api/tipos';
import { formatearUsd } from '../../formato';

interface Props {
  juez: ResultadoJuez;
  reserva_minima: number;
  onCerrar: () => void;
}

export default function TarjetaBloqueo({ juez, reserva_minima, onCerrar }: Props) {
  return (
    <section className="tarjeta" role="alert">
      <p className="inline-flex items-center gap-2 rounded-full bg-peligro-suave px-3 py-1 text-sm font-semibold text-peligro">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
        </svg>
        Operación bloqueada
      </p>

      <p className="mt-3 text-base">{juez.razones[0]}</p>

      <p className="mt-4 flex items-center gap-2 rounded-2xl bg-exito-suave px-4 py-3 text-base text-exito-texto">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 3l7 3v6c0 4-3 7.5-7 9-4-1.5-7-5-7-9V6z" strokeLinejoin="round" />
        </svg>
        Tu reserva mínima: {formatearUsd(reserva_minima)}
      </p>

      <details className="mt-4">
        <summary className="cursor-pointer text-base font-semibold text-violeta">¿Por qué?</summary>
        <p className="mt-2 text-base text-tinta-suave">
          Lo frenó el código, no la IA. {juez.razones[1]}
        </p>
      </details>

      <button type="button" className="boton-primario mt-4" onClick={onCerrar}>
        Entendido
      </button>
    </section>
  );
}
