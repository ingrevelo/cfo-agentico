// Pantalla 3: el Caso Rojo y las DOS aprobaciones (D13 y D14).
// Paso 1: aprobar el plan en CFO Agéntico. Paso 2: aprobar cada movimiento real en Belo.
import { useState } from 'react';
import { api } from '../../api';
import type { Movimiento, Plan } from '../../api/tipos';
import { AvisoSintetico, ErrorAviso, TituloPantalla, Vacio } from '../../components/avisos';
import BarraAccion from '../../components/BarraAccion';
import EstadoBadge from '../../components/EstadoBadge';
import SimulatedBadge from '../../components/SimulatedBadge';
import { diaEnCastellano, formatearArs, formatearFx, formatearUsd } from '../../formato';
import { useApp } from '../../state/contexto';
import { useAccion } from '../../state/useAccion';
import CasoRojo from './CasoRojo';
import PanelDemo from './PanelDemo';
import PasoBelo from './PasoBelo';

const LINEA = ['Propuesto', 'Aprobado', 'Ejecutando', 'Completado'] as const;

/** Línea de tiempo simple: lo alcanzado va en verde, lo que falta en gris. */
function LineaTiempo({ estado }: { estado: Movimiento['estado'] }) {
  const alcanzado = LINEA.indexOf(estado as (typeof LINEA)[number]);
  return (
    <ol className="mt-3 flex flex-wrap gap-1 text-[11px] font-semibold">
      {LINEA.map((paso, i) => (
        <li
          key={paso}
          className={
            'rounded-full px-2 py-1 ' +
            (alcanzado >= i && alcanzado !== -1 ? 'bg-mint/40 text-ink' : 'bg-black/5 text-ash-texto')
          }
        >
          {paso}
        </li>
      ))}
    </ol>
  );
}

export default function PantallaAprobacion() {
  const { estado, despachar } = useApp();
  const aprobar = useAccion(api.aprobarPlan.bind(api));
  const editar = useAccion(api.editarMovimiento.bind(api));
  const [yaEstaba, setYaEstaba] = useState(false);

  if (!estado.plan || !estado.reglas) {
    return (
      <Vacio titulo="Todavía no hay un plan para aprobar">
        Volvé al paso del plan y simulá un ingreso.
      </Vacio>
    );
  }

  const plan = estado.plan;
  const reglas = estado.reglas.hard_rules;
  const sinAprobar = plan.movimientos.some((m) => m.estado === 'Propuesto');
  const ponerPlan = (p: Plan) => despachar({ tipo: 'plan', plan: p });
  const anunciar = (texto: string) => despachar({ tipo: 'anunciar', texto });

  async function aprobarEnApp() {
    const r = await aprobar.ejecutar(plan.plan_id);
    if (!r) return;
    setYaEstaba(r.repetido);
    ponerPlan(r.plan);
    anunciar(r.repetido ? 'Este plan ya estaba aprobado.' : 'Plan aprobado en CFO Agéntico.');
  }

  /** El dólar se movió: se arma una propuesta nueva con el monto que sugiere el motor. */
  async function reproponer(m: Movimiento) {
    if (m.monto_sugerido_usd === undefined) return;
    const r = await editar.ejecutar(plan.plan_id, m.paso, m.monto_sugerido_usd);
    if (!r) return;
    ponerPlan(r.plan);
    anunciar('Armé una propuesta nueva con la cotización de hoy.');
  }

  /** Un movimiento necesita el link de Belo cuando ya está aprobado y le toca ejecutarse. */
  const necesitaBelo = (m: Movimiento) =>
    m.tipo !== 'alcancia' &&
    (m.estado === 'Ejecutando' || (m.estado === 'Aprobado' && !m.programado_para));

  return (
    <div className="space-y-4 pb-28 md:pb-0">
      <TituloPantalla sub="Primero aprobás el plan acá. Después, cada movimiento real se aprueba otra vez en Belo, con un código. Son dos OK distintos.">
        Aprobar el plan
      </TituloPantalla>

      {sinAprobar && <CasoRojo plan={plan} reglas={reglas} onPlan={ponerPlan} onAnuncio={anunciar} />}

      {aprobar.error && <ErrorAviso mensaje={aprobar.error} onReintentar={aprobarEnApp} />}
      {editar.error && <ErrorAviso mensaje={editar.error} />}
      {yaEstaba && (
        <p role="status" className="text-sm font-medium text-violeta">
          Este plan ya estaba aprobado: no se hizo nada dos veces.
        </p>
      )}

      <section className="space-y-4" aria-label="Movimientos del plan">
        <h2 className="text-xl">Los movimientos, uno por uno</h2>
        {plan.movimientos.map((m) => (
          <article key={m.clave} className="tarjeta">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold">{m.titulo}</p>
              <EstadoBadge estado={m.estado} />
              {m.simulado && <SimulatedBadge motivo={m.motivo_simulado} />}
            </div>
            <p className="mt-2 text-3xl font-bold tracking-[-0.04em]">{formatearUsd(m.monto_usd)}</p>
            {m.monto_ars !== undefined && m.fx !== undefined && (
              <p className="text-sm font-medium text-ash-texto">
                {formatearArs(m.monto_ars)} a {formatearFx(m.fx)}
              </p>
            )}
            <LineaTiempo estado={m.estado} />

            {m.estado === 'Aprobado' && m.programado_para && (
              <p className="mt-3 text-sm text-ash-texto">
                Programado para el {diaEnCastellano(m.programado_para)}. Ese día reviso la cotización
                antes de cambiar.
              </p>
            )}

            {m.estado === 'Retenido' && (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-900">Retenido: el dólar se movió</p>
                <p className="mt-1 text-sm leading-snug text-amber-900">
                  Hoy está a {formatearFx(plan.fx_hoy ?? plan.fx)}, peor de lo que aprobaste, así que
                  no cambié nada.
                  {m.monto_sugerido_usd !== undefined && (
                    <>
                      {' '}
                      Para cubrir lo mismo necesito {formatearUsd(m.monto_sugerido_usd)} en lugar de{' '}
                      {formatearUsd(m.monto_usd)}. Lo aprobás vos otra vez.
                    </>
                  )}
                </p>
                <button
                  type="button"
                  className="mt-3 h-10 rounded-full bg-white px-5 text-sm font-semibold text-amber-900 disabled:opacity-40"
                  onClick={() => reproponer(m)}
                  disabled={editar.cargando}
                  aria-busy={editar.cargando}
                >
                  {editar.cargando ? 'Recalculando...' : 'Armar propuesta con el dólar de hoy'}
                </button>
              </div>
            )}

            {!sinAprobar && necesitaBelo(m) && (
              <div className="mt-4">
                <PasoBelo
                  plan_id={plan.plan_id}
                  movimiento={m}
                  onPlan={ponerPlan}
                  onAnuncio={anunciar}
                />
              </div>
            )}

            {m.estado === 'Completado' && (
              <p className="mt-3 text-sm font-medium text-ink">Listo, este movimiento se completó.</p>
            )}
          </article>
        ))}
      </section>

      <PanelDemo onPlan={ponerPlan} onAnuncio={anunciar} />

      <AvisoSintetico />

      {sinAprobar ? (
        <BarraAccion
          etiqueta="Aprobar en CFO Agéntico"
          etiquetaCargando="Aprobando..."
          onClick={aprobarEnApp}
          cargando={aprobar.cargando}
        />
      ) : (
        <BarraAccion
          etiqueta="Ver el resumen"
          onClick={() => despachar({ tipo: 'ir', vista: 'resumen' })}
        />
      )}
    </div>
  );
}
