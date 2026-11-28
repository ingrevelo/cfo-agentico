// Los pasos de la demo. En celular se desliza en horizontal; los pasos a los que
// todavía no se puede llegar quedan deshabilitados (por ejemplo Aprobación sin plan).
import { useApp } from '../state/contexto';
import { pasoHabilitado, type Vista } from '../state/reducer';

const PASOS: { vista: Vista; nombre: string }[] = [
  { vista: 'perfilado', nombre: 'Perfilado' },
  { vista: 'reglas', nombre: 'Reglas' },
  { vista: 'plan', nombre: 'Plan' },
  { vista: 'aprobacion', nombre: 'Aprobación' },
  { vista: 'resumen', nombre: 'Resumen' },
];

export default function BarraPasos() {
  const { estado, despachar } = useApp();

  return (
    <nav aria-label="Pasos de la demo" className="-mx-4 mb-5 overflow-x-auto px-4">
      <ul className="flex w-max gap-1">
        {PASOS.map((paso) => {
          const activo = estado.vista === paso.vista;
          const habilitado = pasoHabilitado(paso.vista, estado);
          return (
            <li key={paso.vista}>
              <button
                type="button"
                disabled={!habilitado}
                aria-current={activo ? 'step' : undefined}
                onClick={() => despachar({ tipo: 'ir', vista: paso.vista })}
                className={
                  activo
                    ? 'h-10 whitespace-nowrap rounded-full bg-ink px-4 text-sm font-semibold text-white'
                    : 'h-10 whitespace-nowrap rounded-full px-4 text-sm font-medium text-ash-texto enabled:hover:text-ink disabled:opacity-40'
                }
              >
                {paso.nombre}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
