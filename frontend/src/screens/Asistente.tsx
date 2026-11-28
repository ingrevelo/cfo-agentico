// La pantalla principal: todo el plan, la aprobación y el cierre en una conversación.
// Los mensajes NO se guardan: salen del estado del plan con faseDe().
import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { montoCasoRojo } from '../api/mock/dominio';
import type { Movimiento, Plan, ResultadoJuez } from '../api/tipos';
import { Cargando, ErrorAviso } from '../components/avisos';
import { PERFILES } from '../data/perfiles';
import { formatearUsd } from '../formato';
import { useApp } from '../state/contexto';
import { faseDe } from '../state/fases';
import { useAccion } from '../state/useAccion';
import Burbuja from './asistente/Burbuja';
import Lecturas from './asistente/Lecturas';
import Seguimiento from './asistente/Seguimiento';
import TarjetaBloqueo from './asistente/TarjetaBloqueo';
import TarjetaPropuesta from './asistente/TarjetaPropuesta';

/** Un movimiento pide el link de Belo cuando ya está aprobado y le toca ejecutarse. */
const necesitaBelo = (m: Movimiento) =>
  m.tipo !== 'alcancia' &&
  (m.estado === 'Ejecutando' || (m.estado === 'Aprobado' && !m.programado_para));

export default function Asistente() {
  const { estado, despachar } = useApp();
  const simular = useAccion(api.simularIngreso.bind(api));
  const aprobar = useAccion(api.aprobarPlan.bind(api));
  const editar = useAccion(api.editarMovimiento.bind(api));
  const reiniciar = useAccion(api.reiniciarDemo.bind(api));
  const [bloqueo, setBloqueo] = useState<ResultadoJuez | null>(null);
  const yaArranco = useRef(false);
  const fin = useRef<HTMLDivElement>(null);

  const plan = estado.plan;
  const fase = faseDe(plan);
  const perfil_id = estado.sesion?.perfil_id ?? 'sofia';
  const copy = PERFILES[perfil_id].copy;
  const reserva = estado.reglas?.hard_rules.min_cushion_usd ?? 0;

  const ponerPlan = (p: Plan) => despachar({ tipo: 'plan', plan: p });
  const anunciar = (texto: string) => despachar({ tipo: 'anunciar', texto });
  const refrescarLog = async () => despachar({ tipo: 'log', log: await api.obtenerLog() });

  // Al entrar se arma el plan solo: es el disparador de cada ingreso (D3).
  useEffect(() => {
    if (yaArranco.current) return;
    yaArranco.current = true;
    simular.ejecutar().then(async (p) => {
      if (p !== undefined) despachar({ tipo: 'plan', plan: p });
      await refrescarLog();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autoscroll al último mensaje.
  useEffect(() => {
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    fin.current?.scrollIntoView({ behavior: quieto ? 'auto' : 'smooth', block: 'end' });
  }, [fase, plan?.movimientos.length, bloqueo]);

  async function aprobarPlan() {
    if (!plan) return;
    const r = await aprobar.ejecutar(plan.plan_id);
    if (!r) return;
    ponerPlan(r.plan);
    await refrescarLog();
    anunciar(r.repetido ? 'Ese plan ya estaba aprobado.' : 'Tu OK quedó registrado.');
  }

  async function probarDeMas() {
    if (!plan || !estado.reglas) return;
    // Solo el monto que se prueba; quien decide es el juez, en la API.
    const monto = montoCasoRojo(plan.saldos, estado.reglas.hard_rules);
    const r = await editar.ejecutar(plan.plan_id, 'M3', monto);
    if (!r) return;
    setBloqueo(r.juez);
    ponerPlan(r.plan);
    await refrescarLog();
    anunciar('El motor revisó el cambio.');
  }

  async function verPropuestaNueva(m: Movimiento) {
    if (!plan || m.monto_sugerido_usd === undefined) return;
    const r = await editar.ejecutar(plan.plan_id, m.paso, m.monto_sugerido_usd);
    if (!r) return;
    ponerPlan(r.plan);
    anunciar('Armé una propuesta nueva con el dólar de hoy.');
  }

  const ingreso = plan?.ingreso_usd ?? estado.sesion?.saldos.USD ?? 0;
  const lecturas = estado.log.filter((l) => l.paso === 'lecturas');
  const programado = plan?.movimientos.find((m) => m.estado === 'Aprobado' && m.programado_para);
  const retenido = plan?.movimientos.find((m) => m.estado === 'Retenido');
  const aprobado = fase !== 'cargando' && fase !== 'propuesta';
  const pendientesBelo = plan?.movimientos.filter(necesitaBelo) ?? [];

  return (
    <div className="flex flex-1 flex-col">
      <ul role="log" aria-live="polite" className="flex-1 space-y-6">
        <Burbuja
          expresion="bienvenida"
          texto={`¡Hola, ${copy.nombre_corto}! Entraron ${formatearUsd(ingreso)}${copy.sufijo_ingreso}`}
        />

        <Burbuja expresion="pensando" texto="Revisando tus vencimientos y tu saldo…">
          {simular.cargando ? <Cargando texto="Leyendo tu cuenta..." /> : <Lecturas lecturas={lecturas} />}
        </Burbuja>

        {simular.error && (
          <li>
            <ErrorAviso mensaje={simular.error} onReintentar={() => simular.ejecutar()} />
          </li>
        )}

        {!simular.cargando && !plan && !simular.error && (
          <Burbuja
            expresion="dudando"
            texto="Este ingreso no llega al mínimo: se acumula para el próximo."
          />
        )}

        {plan && (
          <Burbuja expresion="plan" texto="Ya tengo tu plan para este ingreso.">
            <div className="space-y-4">
              <TarjetaPropuesta plan={plan} vencimiento={copy.textos_plan.vencimiento_semana} />

              <details className="tarjeta">
                <summary className="cursor-pointer text-base font-semibold text-violeta">
                  ¿Por qué este plan?
                </summary>
                <p className="mt-2 text-base text-tinta-suave">
                  Cambio solo lo que vence y dejo el resto en dólares: te quedan{' '}
                  {formatearUsd(plan.quedan_en_dolares)} y tu reserva mínima es{' '}
                  {formatearUsd(reserva)}. El rendimiento es variable, no garantizado.
                </p>
              </details>

              {fase === 'propuesta' && (
                <>
                  <button
                    type="button"
                    className="boton-primario"
                    onClick={aprobarPlan}
                    disabled={aprobar.cargando}
                    aria-busy={aprobar.cargando}
                  >
                    {aprobar.cargando ? 'Aprobando...' : 'Aprobar plan'}
                  </button>
                  <button
                    type="button"
                    className="boton-secundario w-full"
                    onClick={probarDeMas}
                    disabled={editar.cargando}
                    aria-busy={editar.cargando}
                  >
                    Probar qué pasa si pido de más
                  </button>
                </>
              )}
            </div>
          </Burbuja>
        )}

        {aprobar.error && (
          <li>
            <ErrorAviso mensaje={aprobar.error} onReintentar={aprobarPlan} />
          </li>
        )}

        {bloqueo && (
          <Burbuja expresion="bloqueado" texto="Frené este movimiento: supera tus límites.">
            <TarjetaBloqueo
              juez={bloqueo}
              reserva_minima={reserva}
              onCerrar={() => setBloqueo(null)}
            />
          </Burbuja>
        )}

        {plan && aprobado && (
          <Seguimiento
            plan={plan}
            fase={fase}
            log={estado.log}
            pendientesBelo={pendientesBelo}
            retenido={retenido}
            programado={programado}
            editando={editar.cargando}
            reiniciando={reiniciar.cargando}
            onPlan={async (p) => {
              ponerPlan(p);
              await refrescarLog();
            }}
            onAnuncio={anunciar}
            onReproponer={verPropuestaNueva}
            onReiniciar={async () => {
              await reiniciar.ejecutar();
              despachar({ tipo: 'reiniciar' });
            }}
          />
        )}
      </ul>
      <div ref={fin} />
    </div>
  );
}
