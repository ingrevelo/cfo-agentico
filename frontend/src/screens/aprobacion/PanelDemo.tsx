// Controles para que el jurado pruebe los casos difíciles sin esperar al jueves.
// En el backend esto sería un endpoint solo de demo (hay que proponérselo al equipo).
import { useState } from 'react';
import { api } from '../../api';
import type { ConfigDemo, Plan } from '../../api/tipos';
import { ErrorAviso } from '../../components/avisos';
import { useAccion } from '../../state/useAccion';

interface Props {
  onPlan: (plan: Plan) => void;
  onAnuncio: (texto: string) => void;
}

export default function PanelDemo({ onPlan, onAnuncio }: Props) {
  const [config, setConfig] = useState<ConfigDemo>({
    escenario_fx: 'estable',
    inyectar_timeout: false,
  });
  const configurar = useAccion(api.configurarDemo.bind(api));
  const avanzar = useAccion(api.avanzarDemo.bind(api));

  async function cambiar(nueva: ConfigDemo) {
    setConfig(nueva);
    await configurar.ejecutar(nueva);
  }

  async function alJueves() {
    const plan = await avanzar.ejecutar('jueves');
    if (!plan) return;
    onPlan(plan);
    onAnuncio('Avancé al día del vencimiento y revisé la cotización.');
  }

  return (
    <details className="tarjeta">
      <summary className="cursor-pointer text-sm font-semibold">
        Controles de demo para el jurado
      </summary>

      <fieldset className="mt-4">
        <legend className="text-sm font-semibold">Cotización del día del vencimiento</legend>
        {(
          [
            { valor: 'estable', etiqueta: 'Estable: 1.185 (sigue dentro de la banda)' },
            { valor: 'empeora', etiqueta: 'Empeora: 1.150 (se va 2,95% en contra)' },
          ] as const
        ).map((opcion) => (
          <label key={opcion.valor} className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="escenario-fx"
              className="h-5 w-5"
              checked={config.escenario_fx === opcion.valor}
              onChange={() => cambiar({ ...config, escenario_fx: opcion.valor })}
            />
            {opcion.etiqueta}
          </label>
        ))}
      </fieldset>

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-5 w-5"
          checked={config.inyectar_timeout}
          onChange={(e) => cambiar({ ...config, inyectar_timeout: e.target.checked })}
        />
        Inyectar un timeout en la primera conversión
      </label>
      <p className="mt-1 text-sm leading-snug text-ash-texto">
        Con el timeout, la operación queda en Desconocido, se busca la referencia en el historial y
        se completa sin volver a ejecutarla.
      </p>

      <button
        type="button"
        className="mt-4 h-10 rounded-full bg-black/5 px-5 text-sm font-semibold hover:bg-black/10 disabled:opacity-40"
        onClick={alJueves}
        disabled={avanzar.cargando}
        aria-busy={avanzar.cargando}
      >
        {avanzar.cargando ? 'Avanzando...' : 'Avanzar al día del vencimiento'}
      </button>

      {(configurar.error || avanzar.error) && (
        <div className="mt-4">
          <ErrorAviso mensaje={configurar.error ?? avanzar.error ?? ''} onReintentar={alJueves} />
        </div>
      )}
    </details>
  );
}
