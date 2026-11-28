// Caso Rojo: el jurado pide cambiar más de lo que las reglas permiten.
// Quien decide es el juez, en la API. Esta pantalla solo muestra la respuesta.
import { useState } from 'react';
import { api } from '../../api';
import { montoCasoRojo } from '../../api/mock/dominio';
import type { Plan, ReglasDuras, ResultadoJuez } from '../../api/tipos';
import { ErrorAviso } from '../../components/avisos';
import { formatearUsd } from '../../formato';

interface Props {
  plan: Plan;
  reglas: ReglasDuras;
  onPlan: (plan: Plan) => void;
  onAnuncio: (texto: string) => void;
}

export default function CasoRojo({ plan, reglas, onPlan, onAnuncio }: Props) {
  // Solo el valor que aparece precargado en el input, para que el jurado vea el bloqueo
  // sin tener que pensar un número. La decisión no se toma acá: la toma el juez.
  const [monto, setMonto] = useState(() => montoCasoRojo(plan.saldos, reglas));
  const [juez, setJuez] = useState<ResultadoJuez | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const m3 = plan.movimientos.find((m) => m.tipo === 'conversion_a_pesos');
  if (!m3) return null;

  async function probar() {
    setCargando(true);
    setError(null);
    try {
      const r = await api.editarMovimiento(plan.plan_id, m3!.paso, monto);
      setJuez(r.juez);
      onPlan(r.plan);
      onAnuncio(
        r.juez.decision === 'BLOQUEAR'
          ? 'El motor bloqueó el cambio: el plan quedó sin cambios.'
          : 'El plan se recalculó con el nuevo monto.',
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo probar el cambio.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <section className="tarjeta" aria-label="Caso Rojo">
      <h2 className="text-xl">Probá forzar al agente</h2>
      <p className="mt-2 text-sm leading-snug text-ash-texto">
        Pedile cambiar a pesos más de lo que tus reglas permiten. El motor lo revisa antes de
        cualquier movimiento: si rompe tu colchón, lo bloquea aunque insistas.
      </p>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="caso-rojo-monto" className="block text-sm font-semibold">
            Cambiar a pesos
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              id="caso-rojo-monto"
              type="number"
              inputMode="numeric"
              className="campo"
              value={monto}
              onChange={(e) => setMonto(Number(e.target.value))}
            />
            <span className="shrink-0 text-sm font-medium text-ash-texto">USD</span>
          </div>
        </div>
        <button
          type="button"
          className="h-10 rounded-full bg-black/5 px-5 text-sm font-semibold hover:bg-black/10 disabled:opacity-40"
          onClick={probar}
          disabled={cargando}
          aria-busy={cargando}
        >
          {cargando ? 'Revisando...' : 'Probar este cambio'}
        </button>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorAviso mensaje={error} onReintentar={probar} />
        </div>
      )}

      {juez?.decision === 'BLOQUEAR' && (
        <div role="alert" className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-900">Bloqueado por tus reglas</p>
          {juez.razones.map((r) => (
            <p key={r} className="mt-1 text-sm leading-snug text-red-900">
              {r}
            </p>
          ))}
          <p className="mt-2 text-sm text-red-900">
            Tu plan quedó igual que antes y no se llamó a ninguna operación de Belo.
          </p>
        </div>
      )}

      {juez?.decision === 'PEDIR_OK_ADICIONAL' && (
        <div role="alert" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Necesito un OK adicional</p>
          {juez.razones.map((r) => (
            <p key={r} className="mt-1 text-sm leading-snug text-amber-900">
              {r}
            </p>
          ))}
        </div>
      )}

      {juez?.decision === 'PEDIR_APROBACION' && (
        <p className="mt-4 text-sm font-medium text-violeta">
          Entra en tus reglas: el plan se recalculó con {formatearUsd(monto)} y el resto se acomodó.
        </p>
      )}
    </section>
  );
}
