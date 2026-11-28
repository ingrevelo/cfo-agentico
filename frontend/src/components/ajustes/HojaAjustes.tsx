// La hoja de ajustes: <dialog> nativo, hoja desde abajo en celular y panel centrado
// en pantallas grandes. Nunca es obligatoria: todo el flujo funciona sin abrirla.
import { useEffect, useRef } from 'react';
import ControlesDemo from './ControlesDemo';
import Perfilado from './Perfilado';
import Premium from './Premium';
import Reglas from './Reglas';

export default function HojaAjustes({ abierta, onCerrar }: { abierta: boolean; onCerrar: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierta && !d.open) d.showModal();
    if (!abierta && d.open) d.close();
  }, [abierta]);

  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      aria-labelledby="titulo-ajustes"
      className="w-full max-w-xl rounded-t-3xl p-0 backdrop:bg-tinta/40 md:rounded-3xl"
    >
      <div className="max-h-[85dvh] overflow-y-auto bg-fondo p-4">
        <div className="flex items-center justify-between gap-4">
          <h2 id="titulo-ajustes" className="text-2xl">
            Ajustes
          </h2>
          <button type="button" className="boton-secundario" onClick={onCerrar}>
            Listo
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <Perfilado />
          <Reglas />
          <Premium />
          <ControlesDemo />
        </div>
      </div>
    </dialog>
  );
}
