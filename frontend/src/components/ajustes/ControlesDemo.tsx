// Controles para que el jurado pruebe los casos difíciles sin esperar al jueves.
import { useState } from 'react';
import { api } from '../../api';
import type { ConfigDemo } from '../../api/tipos';
import { useApp } from '../../state/contexto';
import { useAccion } from '../../state/useAccion';
import { ErrorAviso } from '../avisos';

export default function ControlesDemo() {
  const { estado, despachar } = useApp();
  const [config, setConfig] = useState<ConfigDemo>({
    escenario_fx: 'estable',
    inyectar_timeout: false,
  });
  const [dobleClic, setDobleClic] = useState<string | null>(null);
  const configurar = useAccion(api.configurarDemo.bind(api));
  const avanzar = useAccion(api.avanzarDemo.bind(api));
  const reiniciar = useAccion(api.reiniciarDemo.bind(api));

  const refrescarLog = async () => despachar({ tipo: 'log', log: await api.obtenerLog() });

  async function cambiar(nueva: ConfigDemo) {
    setConfig(nueva);
    await configurar.ejecutar(nueva);
  }

  async function alVencimiento() {
    const plan = await avanzar.ejecutar('jueves');
    if (!plan) return;
    despachar({ tipo: 'plan', plan });
    await refrescarLog();
    despachar({ tipo: 'anunciar', texto: 'Avancé al día del vencimiento.' });
  }

  /** Dos aprobaciones a la vez: tiene que quedar una sola (T06). */
  async function simularDobleClic() {
    if (!estado.plan) return;
    const id = estado.plan.plan_id;
    const [a, b] = await Promise.all([api.aprobarPlan(id), api.aprobarPlan(id)]);
    despachar({ tipo: 'plan', plan: b.plan });
    await refrescarLog();
    setDobleClic(a.repetido !== b.repetido ? 'Se aprobó una sola vez ✓' : 'Algo salió mal');
  }

  const opciones = [
    { valor: 'estable', etiqueta: 'Estable: 1.185' },
    { valor: 'empeora', etiqueta: 'Empeora: 1.150' },
  ] as const;

  return (
    <details className="tarjeta">
      <summary className="cursor-pointer text-base font-semibold text-violeta">
        Controles de demo
      </summary>

      <fieldset className="mt-4">
        <legend className="text-base font-semibold">El dólar el día del vencimiento</legend>
        {opciones.map((o) => (
          <label key={o.valor} className="mt-2 flex items-center gap-2 text-base">
            <input
              type="radio"
              name="escenario-fx"
              className="h-5 w-5 accent-violeta"
              checked={config.escenario_fx === o.valor}
              onChange={() => cambiar({ ...config, escenario_fx: o.valor })}
            />
            {o.etiqueta}
          </label>
        ))}
      </fieldset>

      <label className="mt-4 flex items-center gap-2 text-base">
        <input
          type="checkbox"
          className="h-5 w-5 accent-violeta"
          checked={config.inyectar_timeout}
          onChange={(e) => cambiar({ ...config, inyectar_timeout: e.target.checked })}
        />
        Inyectar un timeout en la primera conversión
      </label>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          className="boton-secundario bg-violeta-suave"
          onClick={alVencimiento}
          disabled={avanzar.cargando}
          aria-busy={avanzar.cargando}
        >
          {avanzar.cargando ? 'Avanzando...' : 'Avanzar al jueves'}
        </button>
        <button
          type="button"
          className="boton-secundario bg-violeta-suave"
          onClick={simularDobleClic}
          disabled={!estado.plan}
        >
          Simular doble clic
        </button>
        <button
          type="button"
          className="boton-secundario text-tinta-suave"
          onClick={async () => {
            await reiniciar.ejecutar();
            despachar({ tipo: 'reiniciar' });
          }}
        >
          Reiniciar demo
        </button>
      </div>

      {dobleClic && (
        <p role="status" className="mt-2 text-base font-semibold text-exito-texto">
          {dobleClic}
        </p>
      )}
      {(configurar.error || avanzar.error) && (
        <div className="mt-4">
          <ErrorAviso mensaje={configurar.error ?? avanzar.error ?? ''} />
        </div>
      )}
    </details>
  );
}
