// Una sola pregunta, dos opciones grandes. Los nombres de la demo aparecen después.
import { useRef } from 'react';
import { api } from '../api';
import type { PerfilId } from '../api/tipos';
import Buho from '../components/buho/Buho';
import { ErrorAviso } from '../components/avisos';
import { useApp } from '../state/contexto';
import { crearGuardia } from '../state/guardia';
import { useAccion } from '../state/useAccion';

const OPCIONES: { id: PerfilId; titulo: string; bajada: string; icono: 'persona' | 'edificio' }[] = [
  { id: 'sofia', titulo: 'Para mí', bajada: 'Freelance o independiente', icono: 'persona' },
  { id: 'pyme', titulo: 'Para mi empresa', bajada: 'Pyme o consultora', icono: 'edificio' },
];

function Icono({ tipo }: { tipo: 'persona' | 'edificio' }) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {tipo === 'persona' ? (
        <>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M3 21h18M5 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16M14 21V9h4a1 1 0 0 1 1 1v11" />
          <path d="M8 8h3M8 12h3M8 16h3" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export default function Modo() {
  const { estado, despachar } = useApp();
  const guardia = useRef(crearGuardia());
  const entrar = useAccion(async (perfil_id: PerfilId) => {
    const sesion = await api.iniciarSesionDemo(perfil_id);
    return { sesion, reglas: await api.obtenerReglas() };
  });

  async function elegir(perfil_id: PerfilId) {
    // Cerrojo sincrónico: dos clics en el mismo instante (uno en cada opción)
    // dejan pasar solo al primero. El reducer tiene su propio guardia por las dudas.
    if (!guardia.current.tomar()) return;
    despachar({ tipo: 'iniciando', perfil_id });
    const r = await entrar.ejecutar(perfil_id);
    if (!r) {
      guardia.current.liberar();
      return;
    }
    despachar({ tipo: 'sesion', sesion: r.sesion, reglas: r.reglas });
    despachar({ tipo: 'anunciar', texto: 'Listo, entraste como ' + r.sesion.perfil.name + '.' });
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-6 py-6">
      <div className="flex items-center gap-4">
        <Buho expresion="bienvenida" tamano={72} redondo />
        <h1 tabIndex={-1} className="text-3xl outline-none">
          ¿Cómo vas a usar tu CFO?
        </h1>
      </div>

      {entrar.error && <ErrorAviso mensaje={entrar.error} onReintentar={entrar.limpiarError} />}

      <ul className="flex flex-col gap-4">
        {OPCIONES.map((o) => {
          const cargandoEsta = estado.iniciando === o.id;
          return (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => elegir(o.id)}
                disabled={estado.iniciando !== null}
                aria-busy={cargandoEsta}
                aria-current={cargandoEsta ? 'true' : undefined}
                className={[
                  'flex min-h-[72px] w-full items-center gap-4 rounded-3xl border px-4 py-4 text-left transition-colors',
                  // Solo la opción tocada se ve elegida. La otra queda en reposo, apagada.
                  // El anillo es un box-shadow: no compite con el color del borde.
                  cargandoEsta
                    ? 'border-violeta-suave bg-violeta-suave ring-2 ring-violeta'
                    : 'border-violeta-suave bg-tarjeta hover:border-violeta-claro',
                  estado.iniciando !== null && !cargandoEsta ? 'opacity-50' : '',
                ].join(' ')}
              >
                <span className="text-violeta">
                  <Icono tipo={o.icono} />
                </span>
                <span className="flex-1">
                  <span className="block text-[17px] font-semibold">{o.titulo}</span>
                  <span className="block text-base text-tinta-suave">{o.bajada}</span>
                </span>
                {cargandoEsta && <span className="text-base text-violeta">Entrando...</span>}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
